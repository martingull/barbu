# Barbu website infrastructure

Moved from ../isv-mainpage on November 13, 2026. This directory owns the existing
Silicium Veritas hosting. Retain the Pulumi project name isv-mainpage-infra, dev
stack and resource names: they identify existing resources, not product branding.
Do not initialize a replacement stack or destroy the old infrastructure.

Static content lives in ../public. Content-only releases use `task website:deploy`
from the Barbu root: it backs up the bucket, uploads content and invalidates the
existing CloudFront distribution without deleting objects or changing DNS.
A later Pulumi preview may reconcile old asset objects after this content release.
Review that plan before applying; no stateful resource replacement is intended.

For infrastructure work, install dependencies here with npm ci and select the
existing dev stack in the same Pulumi backend, then run pulumi preview with the
robotnic AWS profile. No infrastructure update was performed during the move.
The old repository is explicitly blocked from Pulumi operations.

## Search discovery

The homepage features the larger-card Gin Rummy Short `YSz8LAFvlD0`, not the
older small-card upload. Its local poster comes from
`release/marketing/gin-knock-or-gin-large-cards/preview-question.png`; the tracked
copy lets a fresh clone render the page without regenerating the movie.
`gin-rummy.html` is an original worked lesson, linked from the homepage and
included in `sitemap.xml`. Both pages have distinct titles, descriptions and
absolute canonical URLs, and their text works without JavaScript. YouTube only
loads after a play action. No analytics or third-party scripts were added.

After publication, verify `siliciumveritas.com` in Google Search Console using
the owner's account. Submit `https://siliciumveritas.com/sitemap.xml`, inspect
the homepage and `/gin-rummy.html`, and request indexing if eligible. Property
verification and submission are not performed by the deployment command.
Monitor actual search impressions, queries and clicks before judging results;
indexing and rankings are not guaranteed. Do not add keyword stuffing, invented
reviews or pages that merely repeat the same text for different searches.

Known hosting follow-up: the existing CloudFront configuration maps missing
objects to the homepage with HTTP 200. This is a soft-404 risk; replace it with a
real 404 page/status in a separately reviewed infrastructure change. The new
guide deliberately uses an explicit `.html` object path, so it does not depend
on that fallback or directory-index rewrites. Content-only deployment does not
change CloudFront error behaviour.

Published November 20, 2026 with the existing backup-first deployment command.
All 35 website browser checks passed across five viewport/browser projects;
phone and desktop screenshots were inspected. The public homepage, guide,
script, stylesheet, sitemap and poster returned HTTP 200 and matched the tested
local bytes. The ignored receipt is under `release/website/20261120T142200Z/`.
Search Console ownership, sitemap submission and search results remain unverified.

References: [Google's SEO starter guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
and [requesting a recrawl](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl).
