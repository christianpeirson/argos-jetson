# pako (vendored)

Vendored ESM build of pako's zlib subset, sourced from noVNC v1.4.0's `vendor/pako/` tree:

- Upstream: https://github.com/novnc/noVNC/tree/v1.4.0/vendor/pako
- pako project: https://github.com/nodeca/pako

License: **MIT** (pako). Compatible with noVNC's MPL-2.0 and this repo.

## Why vendored

`static/webtak/novnc/{inflator,deflator}.js` use raw ESM imports of pako's zlib helpers. We can't use `node_modules/@novnc/novnc`'s pako because that package ships Babel-transpiled CJS, which the browser cannot consume via native `import()`. Vendoring the ESM tree here is the canonical noVNC pattern.

## Files

- `lib/zlib/{inflate,deflate,zstream,adler32,crc32,inffast,inftrees,trees,messages,constants,gzheader}.js`
- `lib/utils/common.js`

All files are unmodified upstream copies — do not edit.

## Updating

`curl -sfL -O https://raw.githubusercontent.com/novnc/noVNC/<tag>/vendor/pako/lib/<path>/<file>.js` per file. Pin to the same noVNC tag that `static/webtak/novnc/` was sourced from.
