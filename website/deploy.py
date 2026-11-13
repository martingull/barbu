"""Release the Barbu landing page to its existing AWS hosting."""
import argparse, json, subprocess
from datetime import datetime, timezone
from pathlib import Path
root = Path(__file__).resolve().parent
config = json.loads((root / 'ownership.json').read_text())
p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--apply', action='store_true')
p.add_argument('--profile', default='robotnic')
a = p.parse_args()
assert (root / 'public/index.html').is_file()
if not a.apply:
    print('Preview only: back up existing bucket, upload website/public, invalidate CloudFront. Use --apply.')
    raise SystemExit(0)
backup = root.parent / 'release/website' / datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
backup.mkdir(parents=True)
aws = ['aws', '--profile', a.profile, '--region', 'us-east-1']
def run(args):
    return subprocess.run(aws + args, check=True, capture_output=True, text=True)
run(['s3', 'sync', 's3://' + config['bucket'], str(backup / 'previous-site'), '--only-show-errors'])
run(['s3', 'sync', str(root / 'public'), 's3://' + config['bucket'], '--cache-control', 'public,max-age=300', '--only-show-errors'])
run(['s3', 'cp', str(root / 'public/index.html'), 's3://' + config['bucket'] + '/index.html', '--content-type', 'text/html', '--cache-control', 'no-store,max-age=0', '--only-show-errors'])
r = json.loads(run(['cloudfront', 'create-invalidation', '--distribution-id', config['cloudfront_distribution'], '--paths', '/*', '--output', 'json']).stdout)
receipt = {'domain': config['domain'], 'distribution': config['cloudfront_distribution'], 'invalidation_id': r['Invalidation']['Id'], 'backup': str(backup / 'previous-site')}
(backup / 'receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps(receipt, indent=2))
