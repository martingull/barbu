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
