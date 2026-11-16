# Liquid Light Studio

Complete source backup of Liquid Light Studio, including the original **Classic** interface and **Studio 2.0**. The live application is unchanged by this backup.

## Open the live application

- Classic: https://liquid-light-rafa.orafacezar.chatgpt.site/studio?classic=1
- Studio 2.0: https://liquid-light-rafa.orafacezar.chatgpt.site/studio

## Run the graphics editor locally

The browser editor is plain HTML/JavaScript and WebGL 2. From the repository root:

```sh
python3 -m http.server 8080 --directory public
```

Open `http://localhost:8080/studio.html?classic=1` for Classic, or `http://localhost:8080/studio.html` for Studio 2.0. A current browser with WebGL 2 and floating-point render targets is required. Browser-local projects, imported SVGs and image/animation export work in this static mode; account cloud-session endpoints require the server deployment.

## Run the full application server

Use Node.js 22.13 or newer and pnpm 11.25.0 (the versions declared in package.json).

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Use the address printed by the dev server. Open `/studio.html?classic=1` for Classic. The server uses Vinext, Vite and Cloudflare bindings. `.openai/hosting.json` records the existing Site identity and the `BUCKET` R2 binding. Production cloud sessions rely on ChatGPT-authenticated identity headers and the original account-owned R2 data. This repository contains the storage implementation, **not the live R2 session records or browser-local settings**. Download important project JSON backups from the live app separately. Deploying this source elsewhere does not automatically copy sessions such as Blobby_Glass_01.

## Validate

```sh
node --test tests/*.test.mjs
pnpm build
```

The source snapshot passed all 96 tests at backup time. WebGL availability and native browser encoding support depend on the browser/device.

## Source and history preservation

- `backup/source-manifest.json`: original source commit and SHA-256 hashes for all 165 source files.
- `backup/source-history.bundle`: complete Git history, including all 62 commits available in the original repository at backup time.
- `docs/ORIGINAL_README.md`: original project documentation, preserved verbatim. Some older setup notes there describe earlier hosting arrangements; use the steps above for this backup.

To restore the original repository and its commit history:

```sh
git clone backup/source-history.bundle liquid-light-original
cd liquid-light-original
git log --oneline
```

The GitHub root README is this backup guide; every other original tracked source file is copied unchanged. Credentials, dependency directories, generated builds and runtime state are not part of the source backup. Existing third-party license files are retained.
