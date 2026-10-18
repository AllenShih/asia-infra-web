import fs from "node:fs/promises";
import path from "node:path";
import { ROOT, LOCALES, loadArticles, pairMap, sectorConfig } from "./site-data.mjs";

const errors = [];
const articles = await loadArticles();
const pairs = pairMap(articles);
const required = ["article_id", "event_id", "locale", "canonical_locale", "title", "slug", "event_date", "event_category", "sector", "news_topic", "countries", "published_at", "updated_at", "status", "source_urls", "primary_source"];
const seen = new Set();

for (const article of articles) {
  for (const field of required) {
    if (article[field] === undefined || article[field] === "" || article[field] === null) errors.push(`${article.sourcePath}: missing ${field}`);
  }
  if (!LOCALES.includes(article.locale)) errors.push(`${article.sourcePath}: unsupported locale ${article.locale}`);
  if (!["draft", "published"].includes(article.status)) errors.push(`${article.sourcePath}: unsupported status ${article.status}`);
  if (!sectorConfig[article.sector]) errors.push(`${article.sourcePath}: unsupported sector ${article.sector}`);
  if (!/^ART-\d{8}-\d{4}$/.test(article.article_id ?? "")) errors.push(`${article.sourcePath}: invalid article_id`);
  if (!/^EVT-\d{8}-\d{4}$/.test(article.event_id ?? "")) errors.push(`${article.sourcePath}: invalid event_id`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(article.event_date ?? ""))) errors.push(`${article.sourcePath}: invalid event_date`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug ?? "")) errors.push(`${article.sourcePath}: invalid slug`);
  if (!Array.isArray(article.countries) || article.countries.length === 0) errors.push(`${article.sourcePath}: countries must be a non-empty list`);
  if (!Array.isArray(article.source_urls) || article.source_urls.length === 0) errors.push(`${article.sourcePath}: source_urls must be a non-empty list`);
  for (const url of article.source_urls ?? []) if (!String(url).startsWith("https://")) errors.push(`${article.sourcePath}: source URL must use HTTPS`);
  for (const field of ["published_at", "updated_at"]) if (Number.isNaN(Date.parse(article[field]))) errors.push(`${article.sourcePath}: invalid ${field}`);
  const key = `${article.locale}:${article.slug}`;
  if (seen.has(key)) errors.push(`${article.sourcePath}: duplicate locale/slug ${key}`);
  seen.add(key);
}

for (const [eventId, pair] of pairs) {
  for (const locale of LOCALES) if (!pair[locale]) errors.push(`${eventId}: missing ${locale} translation`);
  if (!pair.en || !pair["zh-TW"]) continue;
  for (const field of ["article_id", "event_id", "slug", "event_date", "sector", "status"]) {
    if (String(pair.en[field]) !== String(pair["zh-TW"][field])) errors.push(`${eventId}: ${field} differs between locales`);
  }
  if (JSON.stringify(pair.en.source_urls) !== JSON.stringify(pair["zh-TW"].source_urls)) errors.push(`${eventId}: source_urls differ between locales`);
}

const publicFiles = [];
async function walk(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(fullPath);
    else publicFiles.push(fullPath);
  }
}
await walk(path.join(ROOT, "_site"));

const forbidden = [/docs\.google\.com/i, /1nn6CJYPBWexBbeVrMj5PUhtX9tahg6yGv2InHmHV9oU/i, /Editor Notes/i, /Codex Notes/i, /(?:api[_-]?key|secret|token|webhook)\s*[:=]/i];
for (const file of publicFiles.filter((item) => /\.(?:html|xml|txt|js|css|md|json|yml)$/.test(item))) {
  const text = await fs.readFile(file, "utf8");
  for (const pattern of forbidden) if (pattern.test(text)) errors.push(`${path.relative(ROOT, file)}: contains forbidden private content (${pattern})`);
}

for (const file of publicFiles.filter((item) => item.endsWith(".html"))) {
  const html = await fs.readFile(file, "utf8");
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const target = match[1];
    if (/^(?:https?:|mailto:|#)/.test(target)) continue;
    const cleanTarget = target.split(/[?#]/)[0];
    let resolved = path.resolve(path.dirname(file), cleanTarget);
    if (cleanTarget.endsWith("/")) resolved = path.join(resolved, "index.html");
    try { await fs.access(resolved); } catch { errors.push(`${path.relative(ROOT, file)}: broken internal target ${target}`); }
  }
}

for (const article of articles.filter((item) => item.status === "published")) {
  const html = path.join(ROOT, "news", article.locale, article.slug, "index.html");
  try { await fs.access(html); } catch { errors.push(`${article.sourcePath}: generated page is missing`); }
  const image = sectorConfig[article.sector]?.image;
  if (image) try { await fs.access(path.join(ROOT, "assets", image)); } catch { errors.push(`${article.sourcePath}: hero image ${image} is missing`); }
}

for (const file of ["index.html", "zh-TW/index.html", "feed.xml", "sitemap.xml", "robots.txt"]) {
  try { await fs.access(path.join(ROOT, file)); } catch { errors.push(`${file}: required generated file is missing`); }
}

if (errors.length) {
  console.error(`Validation failed with ${errors.length} error(s):\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
console.log(`Validated ${articles.length} localized records across ${pairs.size} events.`);
