# InfraGraph Asia Web

Public GitHub Pages website for verified InfraGraph Asia reporting.

## Structure

- `/` English coverage index
- `/zh-TW/` Traditional Chinese coverage index
- `/news/<locale>/<slug>/` published article pages
- `/content/news/<locale>/` public canonical content records
- `/assets/` shared styles, scripts and editorial images
- `/sitemap.xml` and `/feed.xml` discovery feeds

## Editorial publishing workflow

Markdown files in `/content/news/<locale>/` are the single source of truth. Each approved event must have one English file and one Traditional Chinese file with matching IDs, slug, event date, sector, status and source URLs.

1. Add or update both approved Markdown records.
2. Run `pnpm install` once on a new computer.
3. Run `pnpm verify` to generate the site and check IDs, translations, sources, dates, assets and private-content exclusions.
4. Run `pnpm preview` and review `http://127.0.0.1:4175/` on desktop and mobile.
5. Obtain explicit publication approval before pushing to `main`.
6. Push the approved change. GitHub Actions rebuilds and validates the site before GitHub Pages deploys it.

Generated article pages, homepages, `feed.xml` and `sitemap.xml` are committed so every release can be audited. The `_site/` deployment bundle is generated locally and ignored by Git.

## Commands

- `pnpm build` generates all public pages and the `_site/` deployment bundle.
- `pnpm validate` checks content records and generated outputs.
- `pnpm verify` builds and validates in one step.
- `pnpm preview` starts a local preview server on port 4175.

Pull requests run the same validation and retain a downloadable preview bundle for seven days. Publication approval remains a separate human decision; passing validation does not grant permission to publish.
