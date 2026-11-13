import * as pulumi from '@pulumi/pulumi'
import * as aws from '@pulumi/aws'
import * as fs from 'fs'
import * as path from 'path'
import * as mime from 'mime-types'

const stack = pulumi.getStack()
const config = new pulumi.Config()

const marketingDomainName = config.require('marketingDomainName')
const marketingAdditionalDomains = config.getObject<string[]>('marketingAdditionalDomains') ?? []
const siteOutputDirSetting = config.get('siteOutputDir')
const siteOutputDir = path.resolve(__dirname, siteOutputDirSetting ?? '../public')

const marketingDomainAliases = Array.from(
  new Set(
    [marketingDomainName, `www.${marketingDomainName}`, ...marketingAdditionalDomains.filter(Boolean)].filter(Boolean)
  )
)

const walkDirectory = (dir: string): string[] => {
  if (!fs.existsSync(dir)) {
    return []
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name)
    return entry.isDirectory() ? walkDirectory(fullPath) : [fullPath]
  })
}

const cacheControlFor = (key: string): string =>
  key.endsWith('.html') ? 'no-store, no-cache, must-revalidate, max-age=0' : 'public, max-age=31536000, immutable'

const contentTypeFor = (filePath: string): string => (mime.lookup(filePath) || 'application/octet-stream') as string

const siteBucket = new aws.s3.Bucket('marketing-site-bucket', {
  bucket: `isv-mainpage-site-${stack}`,
  forceDestroy: stack !== 'prod',
  tags: {
    Project: 'InSilicoVeritas',
    Component: 'MarketingSiteBucket',
    Environment: stack,
  },
})

new aws.s3.BucketPublicAccessBlock('marketing-site-bucket-public-access', {
  bucket: siteBucket.id,
  blockPublicAcls: true,
  ignorePublicAcls: true,
  blockPublicPolicy: true,
  restrictPublicBuckets: true,
})

const oac = new aws.cloudfront.OriginAccessControl('marketing-site-oac', {
  description: 'OAC for marketing site',
  originAccessControlOriginType: 's3',
  signingBehavior: 'always',
  signingProtocol: 'sigv4',
})

const certificateProvider = new aws.Provider('us-east-1-provider', { region: 'us-east-1' })

const hostedZone = new aws.route53.Zone('marketing-site-hosted-zone', {
  name: marketingDomainName,
  tags: {
    Project: 'InSilicoVeritas',
    Component: 'MarketingSiteHostedZone',
    Environment: stack,
  },
})

const certificate = new aws.acm.Certificate('marketing-site-certificate', {
  domainName: marketingDomainName,
  validationMethod: 'DNS',
  subjectAlternativeNames: marketingDomainAliases.filter((alias) => alias !== marketingDomainName),
  tags: {
    Project: 'InSilicoVeritas',
    Component: 'MarketingSiteCertificate',
    Environment: stack,
  },
}, { provider: certificateProvider })

const validationRecords = certificate.domainValidationOptions.apply((options) =>
  options.map((option, index) =>
    new aws.route53.Record(`marketing-site-cert-validation-${index}`, {
      zoneId: hostedZone.zoneId,
      name: option.resourceRecordName,
      type: option.resourceRecordType,
      records: [option.resourceRecordValue],
      ttl: 60,
    })
  )
)

const certificateValidation = new aws.acm.CertificateValidation('marketing-site-cert-validation', {
  certificateArn: certificate.arn,
  validationRecordFqdns: validationRecords.apply((records) => records.map((record) => record.fqdn)),
}, { provider: certificateProvider })

const siteFiles = walkDirectory(siteOutputDir)
if (!siteFiles.length) {
  pulumi.log.warn(`No files found in ${siteOutputDir}. Check website/public before deploying.`)
}

const bucketObjects = siteFiles.map((filePath, index) => {
  const relativeKey = path.relative(siteOutputDir, filePath).split(path.sep).join('/')
  return new aws.s3.BucketObjectv2(`site-asset-${index}`, {
    bucket: siteBucket.id,
    source: new pulumi.asset.FileAsset(filePath),
    key: relativeKey,
    contentType: contentTypeFor(filePath),
    cacheControl: cacheControlFor(relativeKey),
  })
})

const distribution = new aws.cloudfront.Distribution('marketing-site-distribution', {
  enabled: true,
  aliases: marketingDomainAliases,
  defaultRootObject: 'index.html',
  origins: [
    {
      domainName: siteBucket.bucketRegionalDomainName,
      originId: siteBucket.arn,
      originAccessControlId: oac.id,
    },
  ],
  defaultCacheBehavior: {
    targetOriginId: siteBucket.arn,
    viewerProtocolPolicy: 'redirect-to-https',
    allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
    cachedMethods: ['GET', 'HEAD'],
    compress: true,
    forwardedValues: {
      queryString: false,
      cookies: { forward: 'none' },
    },
    minTtl: 0,
    defaultTtl: 3600,
    maxTtl: 86400,
  },
  priceClass: 'PriceClass_100',
  customErrorResponses: [
    { errorCode: 403, responseCode: 200, responsePagePath: '/index.html' },
    { errorCode: 404, responseCode: 200, responsePagePath: '/index.html' },
  ],
  restrictions: {
    geoRestriction: {
      restrictionType: 'none',
    },
  },
  viewerCertificate: {
    acmCertificateArn: certificateValidation.certificateArn,
    sslSupportMethod: 'sni-only',
    minimumProtocolVersion: 'TLSv1.2_2021',
  },
  tags: {
    Project: 'InSilicoVeritas',
    Component: 'MarketingSiteDistribution',
    Environment: stack,
  },
}, {
  dependsOn: [...bucketObjects, certificateValidation],
})

new aws.s3.BucketPolicy('marketing-site-bucket-policy', {
  bucket: siteBucket.id,
  policy: pulumi.all([siteBucket.arn, distribution.arn]).apply(([bucketArn, distributionArn]) =>
    JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'AllowCloudFrontRead',
          Effect: 'Allow',
          Principal: { Service: 'cloudfront.amazonaws.com' },
          Action: 's3:GetObject',
          Resource: `${bucketArn}/*`,
          Condition: {
            StringEquals: {
              'AWS:SourceArn': distributionArn,
            },
          },
        },
      ],
    })
  ),
})

marketingDomainAliases.forEach((alias) => {
  const safeAlias = alias.replace(/[^a-zA-Z0-9-]/g, '-')
  new aws.route53.Record(`marketing-site-${safeAlias}-a`, {
    name: alias,
    type: 'A',
    zoneId: hostedZone.zoneId,
    aliases: [
      {
        name: distribution.domainName,
        zoneId: distribution.hostedZoneId,
        evaluateTargetHealth: false,
      },
    ],
  })

  new aws.route53.Record(`marketing-site-${safeAlias}-aaaa`, {
    name: alias,
    type: 'AAAA',
    zoneId: hostedZone.zoneId,
    aliases: [
      {
        name: distribution.domainName,
        zoneId: distribution.hostedZoneId,
        evaluateTargetHealth: false,
      },
    ],
  })
})

export const marketing_domain = marketingDomainName
export const marketing_domain_aliases = marketingDomainAliases
export const marketing_site_bucket_name = siteBucket.bucket
export const marketing_site_distribution_domain = distribution.domainName
export const marketing_site_distribution_id = distribution.id
export const marketing_site_hosted_zone_name_servers = hostedZone.nameServers
