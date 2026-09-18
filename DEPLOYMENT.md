# MarketForge deployment map

MarketForge keeps the existing private Sites deployment as its Cloudflare-first target. The repository is also prepared for a GitHub-centered workflow with two optional public hosting targets:

## GitHub

Use GitHub as the canonical source repository. Connect the repository's `main` branch to the CI workflow in `.github/workflows/ci.yml`. The workflow validates the app surface, the existing Sites build, and the Nitro/Node build used by Render.

After each local mini-build, commit the intended files and push `main`:

```powershell
git add .
git commit -m "Describe the mini-build"
git push github HEAD:main
```

Keep generated archives and local staging directories out of commits unless they are explicitly part of a release.

## Vercel

Import the GitHub repository into Vercel. The checked-in `vercel.json` uses the Nitro Vercel preset and Vercel's Build Output API directory. Vercel should use Node 22 and `npm ci` for installation. Every push to `main` can then trigger a Vercel deployment.

## Render

Create a Web Service from the GitHub repository and use the checked-in `render.yaml`. Render installs dependencies, builds with `NITRO_PRESET=node npm run build:render`, and starts the standalone Node server with `npm run start:render`. The `NITRO_PRESET=node` environment value is also retained for the service runtime.

## Release checklist

1. Confirm the local app lint and all three build targets pass.
2. Commit the mini-build and push `main` to GitHub.
3. Wait for the GitHub Actions `MarketForge CI` check to finish.
4. Confirm Vercel and Render pick up the same commit.
5. Smoke-check the deployed app: load the execution lab, run a paper simulation, and verify that export still works.

These targets are intentionally separate from the private Sites deployment. No provider credentials or external account changes are stored in the repository.

