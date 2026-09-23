# Third-Party Notices

This project is proprietary unless a file or dependency states otherwise.

## Runtime and Build Dependencies

JavaScript and Rust dependencies are governed by their own package licenses.
The iOS inventory and full license/notice texts are bundled in
`public/THIRD_PARTY_LICENSES.txt`. Regenerate them after lockfile changes with:

```sh
node scripts/generate-ios-notices.mjs
```

The script needs installed npm packages, cached Cargo packages, and network access
for notices omitted from published packages. It uses the exact upstream revision
where available and fails on missing notices. Two npm releases declare MIT without
a packaged license file; their entries include the standard MIT terms and published
author attribution. The App Store preparation task verifies both lockfile hashes.

The September 23, 2026 inventory contains 269 resolved iOS Rust packages (including
build dependencies) and 21 non-development npm packages. All declare a license.
MPL-2.0 dependencies include cssparser, cssparser-macros, dtoa-short, option-ext,
and selectors; exact source downloads and MPL terms are included. Dependencies
are used without source modifications. This inventory is not a binary reachability
audit or legal clearance. Review Android-specific dependencies separately for
Google Play releases.

## Card Assets

The app currently includes local playing-card images under:

- `public/cards/PNG-cards-1.3/`
- `public/cards/cards/`

Martin confirmed on September 14, 2026 that the card artwork was generated using
ChatGPT. Retain the original generations and any supplied source-image records
with the product assets. This provenance note records the creator's confirmation;
it is not an independent review of any third-party material supplied as input.

## Product Assets

Barbu-specific logos, app icons, lesson text, product copy, and original UI
art are part of the proprietary Barbu product unless a later notice says
otherwise.
