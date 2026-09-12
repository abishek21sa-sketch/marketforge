# MarketForge deployment map

MarketForge keeps the existing private Sites deployment as its Cloudflare-first target. The repository is also prepared for a GitHub-centered workflow with two optional public hosting targets:

## GitHub

Use GitHub as the canonical source repository. Connect the repository's main branch to the CI workflow in .github/workflows/ci.yml. The workflow validates the app surface, the existing Sites build, and the Nitro/Node build used by Render.

## Vercel

Import the GitHub repository into Vercel. The checked-in vercel.json uses the Nitro Vercel preset and Vercel's Build Output API directory. Vercel should use Node 22 and npm ci for installation.

## Render

Create a Web Service from the GitHub repository and use the checked-in render.yaml. Render builds with npm run build:render and starts the standalone Node server with npm run start:render.

These targets are intentionally separate from the private Sites deployment. No provider credentials or external account changes are stored in the repository.

