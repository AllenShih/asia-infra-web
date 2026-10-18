import fs from "node:fs/promises";
import path from "node:path";
import { marked } from "marked";
import {
  ROOT,
  SITE_URL,
  escapeHtml,
  formatDate,
  loadArticles,
  localize,
  pairMap,
  sectorConfig
} from "./site-data.mjs";

const articles = (await loadArticles()).filter((article) => article.status === "published");
const pairs = pairMap(articles);
const byLocale = articles.reduce((groups, article) => {
  (groups[article.locale] ??= []).push(article);
  return groups;
}, {});

function shell({ locale, title, description, canonical, alternates, assetPrefix, body, article }) {
  const language = locale === "en" ? "en" : "zh-Hant-TW";
  const openGraph = article ? `
  <meta property="og:title" content="${escapeHtml(article.title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="article">
  <meta property="og:image" content="${SITE_URL}/assets/${sectorConfig[article.sector].image}">
  <meta property="article:published_time" content="${escapeHtml(article.published_at)}">
  <meta property="article:modified_time" content="${escapeHtml(article.updated_at)}">` : "";
  return `<!doctype html>
<html lang="${language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${canonical}">
  <link rel="alternate" hreflang="en" href="${alternates.en}">
  <link rel="alternate" hreflang="zh-TW" href="${alternates["zh-TW"]}">${article ? "" : `\n  <link rel="alternate" type="application/rss+xml" title="InfraGraph Asia RSS" href="${assetPrefix}feed.xml">`}${openGraph}
  <link rel="icon" type="image/png" href="${assetPrefix}assets/favicon.png">
  <link rel="stylesheet" href="${assetPrefix}assets/styles.css">
</head>
<body>
${body}
</body>
</html>
`;
}

function brandMark() {
  return `<span class="brand-mark" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><span></span></span>`;
}

function header(locale, assetPrefix, slug = null) {
  const zh = locale === "zh-TW";
  const home = slug ? `${assetPrefix}${zh ? "zh-TW/" : ""}` : zh ? "../zh-TW/" : "./";
  const section = `${home}#latest`;
  const languageLinks = slug
    ? `<a href="${locale === "en" ? "./" : `../../en/${slug}/`}"${locale === "en" ? ' aria-current="page"' : ""}>EN</a><a href="${locale === "zh-TW" ? "./" : `../../zh-TW/${slug}/`}"${locale === "zh-TW" ? ' aria-current="page"' : ""}>繁中</a>`
    : `<a href="${zh ? "../" : "./"}"${zh ? "" : ' aria-current="page"'}>EN</a><a href="${zh ? "./" : "zh-TW/"}"${zh ? ' aria-current="page"' : ""}>繁中</a>`;
  const labels = zh ? ["資料中心", "電網與 HVDC", "BESS", "離岸風電"] : ["Data Center", "Grid & HVDC", "BESS", "Offshore Wind"];
  return `<header class="site-header"><div class="header-inner">
    <a class="brand" href="${home}" aria-label="InfraGraph Asia ${zh ? "首頁" : "home"}">${brandMark()}<span>InfraGraph Asia</span></a>
    <nav class="primary-nav" aria-label="${zh ? "產業分類" : "Coverage sectors"}">${labels.map((label) => `<a href="${section}">${escapeHtml(label)}</a>`).join("")}</nav>
    <nav class="language-switch" aria-label="${zh ? "語言" : "Language"}">${languageLinks}</nav>
  </div></header>`;
}

function footer(locale) {
  const zh = locale === "zh-TW";
  return `<footer class="site-footer"><div class="footer-inner"><p>InfraGraph Asia · ${zh ? "亞太基礎建設情報" : "APAC infrastructure intelligence"}</p><p>${zh ? "資料中心 · 電網與 HVDC · BESS · 離岸風電" : "Data Center · Grid &amp; HVDC · BESS · Offshore Wind"}</p></div></footer>`;
}

function renderMarkdown(content) {
  const withoutTitle = content.replace(/^\s*#\s+.*(?:\r?\n)+/, "");
  return marked.parse(withoutTitle).replace(/<a href="(https?:\/\/[^\"]+)"/g, '<a rel="noopener noreferrer" href="$1"');
}

function articlePage(article) {
  const zh = article.locale === "zh-TW";
  const config = sectorConfig[article.sector];
  const country = localize(article.countries[0], "country", article.locale);
  const topic = localize(article.news_topic, "topic", article.locale);
  const date = formatDate(article.event_date, article.locale);
  const url = `${SITE_URL}/news/${article.locale}/${article.slug}/`;
  const pair = pairs.get(article.event_id);
  const alternate = (locale) => `${SITE_URL}/news/${locale}/${pair[locale].slug}/`;
  const body = `  <a class="skip-link" href="#article">${zh ? "前往文章" : "Skip to article"}</a>
  ${header(article.locale, "../../../", article.slug)}
  <main>
    <section class="hero article-hero" style="background-image: url('../../../assets/${config.image}')" aria-labelledby="article-title"><div class="hero-content"><p class="eyebrow">${escapeHtml(topic)} · ${escapeHtml(country)} · ${escapeHtml(date)}</p><h1 id="article-title">${escapeHtml(article.title)}</h1></div><span class="image-label">${zh ? "示意圖" : "Illustrative image"}</span></section>
    <section class="article-page" id="article"><div class="article-inner">
      <article class="article-body"><a class="back-link" href="../../../${zh ? "zh-TW/" : ""}#latest">${zh ? "← 最新報導" : "← Latest coverage"}</a>${renderMarkdown(article.content)}</article>
      <aside class="article-aside" aria-label="${zh ? "文章紀錄" : "Article record"}"><h2>${zh ? "已驗證紀錄" : "Verified record"}</h2><dl><dt>Article ID</dt><dd>${escapeHtml(article.article_id)}</dd><dt>Event ID</dt><dd>${escapeHtml(article.event_id)}</dd><dt>${zh ? "主題" : "Topic"}</dt><dd>${escapeHtml(topic)}</dd><dt>${zh ? "產業" : "Sector"}</dt><dd>${escapeHtml(config.labels[article.locale])}</dd><dt>${zh ? "主要來源" : "Primary source"}</dt><dd>${escapeHtml(article.primary_source)}</dd></dl></aside>
    </div></section>
  </main>
  ${footer(article.locale)}`;
  return shell({
    locale: article.locale,
    title: `${article.title} | InfraGraph Asia`,
    description: article.summary,
    canonical: url,
    alternates: { en: alternate("en"), "zh-TW": alternate("zh-TW") },
    assetPrefix: "../../../",
    body,
    article
  });
}

function articleCard(article, prefix) {
  const config = sectorConfig[article.sector];
  const country = localize(article.countries[0], "country", article.locale);
  const topic = localize(article.news_topic, "topic", article.locale);
  return `<article class="article-card" data-sector="${config.key}">
    <img src="${prefix}assets/${config.image}" alt="${escapeHtml(config.alt[article.locale])}" width="960" height="540">
    <div><div class="article-meta"><span class="topic">${escapeHtml(topic)}</span><span>${escapeHtml(country)}</span><time datetime="${article.event_date}">${escapeHtml(formatDate(article.event_date, article.locale))}</time></div><h3><a href="${prefix}news/${article.locale}/${article.slug}/">${escapeHtml(article.title)}</a></h3><p>${escapeHtml(article.summary)}</p></div>
  </article>`;
}

function homepage(locale) {
  const zh = locale === "zh-TW";
  const prefix = zh ? "../" : "";
  const sorted = byLocale[locale].toSorted((a, b) => b.event_date.localeCompare(a.event_date));
  const lead = sorted[0];
  const config = sectorConfig[lead.sector];
  const topic = localize(lead.news_topic, "topic", locale);
  const country = localize(lead.countries[0], "country", locale);
  const sources = new Set(sorted.flatMap((article) => article.source_urls)).size;
  const labels = Object.values(sectorConfig).map((item) => item.labels[locale]);
  const filterLabels = zh ? ["全部", ...labels] : ["All", ...labels];
  const filterKeys = ["all", ...Object.values(sectorConfig).map((item) => item.key)];
  const body = `  <a class="skip-link" href="#latest">${zh ? "前往最新報導" : "Skip to latest coverage"}</a>
  ${header(locale, prefix)}
  <main>
    <section class="hero" style="background-image: url('${prefix}assets/${config.image}')" aria-labelledby="lead-title"><div class="hero-content">
      <p class="eyebrow">${escapeHtml(topic)} · ${escapeHtml(country)} · ${escapeHtml(formatDate(lead.event_date, locale))}</p>
      <h1 id="lead-title">${escapeHtml(lead.title)}</h1>
      <p class="hero-dek">${escapeHtml(lead.summary)}</p>
      <a class="hero-link" href="${prefix}news/${locale}/${lead.slug}/">${zh ? "閱讀已驗證事件" : "Read verified event"}</a>
    </div><span class="image-label">${zh ? "示意圖" : "Illustrative image"}</span></section>
    <section class="coverage-strip" aria-label="${zh ? "資料範圍" : "Coverage scope"}"><div class="section-inner"><span class="coverage-label">${zh ? "基礎建設資料庫" : "Coverage database"}</span><div class="coverage-list">${labels.map((label) => `<span>${escapeHtml(label)}</span>`).join("")}</div></div></section>
    <section class="news-section" id="latest"><div class="section-inner">
      <div class="section-heading"><h2>${zh ? "最新已驗證報導" : "Latest verified coverage"}</h2><p>${zh ? "以事件為核心的報導，連結來源紀錄、固定識別碼與受控編輯流程。" : "Event-led reporting tied to source records, stable identifiers and a controlled editorial workflow."}</p></div>
      <div class="filter-bar"><label><span class="sr-only">${zh ? "搜尋報導" : "Search coverage"}</span><input class="search-field" type="search" data-search placeholder="${zh ? "搜尋專案、公司或國家" : "Search project, company or country"}"></label><div class="filter-buttons" aria-label="${zh ? "依產業篩選" : "Filter by sector"}">${filterLabels.map((label, index) => `<button class="filter-button${index === 0 ? " is-active" : ""}" type="button" data-filter="${filterKeys[index]}" aria-pressed="${index === 0}">${escapeHtml(label)}</button>`).join("")}</div></div>
      <div class="news-grid"><div class="article-list">${sorted.map((article) => articleCard(article, prefix)).join("\n")}<p class="empty-state" data-empty>${zh ? "沒有符合目前篩選條件的已驗證報導。" : "No verified coverage matches this filter."}</p></div><aside class="metrics" aria-label="${zh ? "報導統計" : "Coverage metrics"}"><div class="metric"><strong>${sorted.length}</strong><span>${zh ? "筆已驗證事件" : "verified events"}</span></div><div class="metric"><strong>${sources}</strong><span>${zh ? "筆來源紀錄" : "source records"}</span></div><div class="metric"><strong>2</strong><span>${zh ? "種已核准語言" : "approved languages"}</span></div><div class="method-note"><h3>${zh ? "證據優先" : "Evidence first"}</h3><p>${zh ? "發布核准與資料庫驗證分開進行，每篇文章保留 Event ID 與來源軌跡。" : "Publication approval is separate from database validation. Every article retains its Event ID and source trail."}</p></div></aside></div>
    </div></section>
  </main>
  ${footer(locale)}
  <script src="${prefix}assets/app.js" defer></script>`;
  return shell({
    locale,
    title: zh ? "InfraGraph Asia｜亞洲基礎建設情報" : "InfraGraph Asia | Infrastructure intelligence",
    description: zh ? "追蹤亞洲資料中心、電網與 HVDC、BESS 及離岸風電的已驗證專案與事件。" : "Verified project and event intelligence for Asia's data centres, grids, BESS and offshore wind sectors.",
    canonical: `${SITE_URL}/${zh ? "zh-TW/" : ""}`,
    alternates: { en: `${SITE_URL}/`, "zh-TW": `${SITE_URL}/zh-TW/` },
    assetPrefix: prefix,
    body
  });
}

function feed() {
  const items = byLocale.en.toSorted((a, b) => b.event_date.localeCompare(a.event_date)).map((article) => `<item><title>${escapeHtml(article.title)}</title><link>${SITE_URL}/news/en/${article.slug}/</link><guid>${article.article_id}-en</guid><pubDate>${new Date(`${article.event_date}T00:00:00Z`).toUTCString()}</pubDate><description>${escapeHtml(article.summary)}</description></item>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>InfraGraph Asia</title><link>${SITE_URL}/</link><description>Verified Asia infrastructure project and event intelligence.</description><language>en</language>${items}</channel></rss>\n`;
}

function sitemap() {
  const home = `<url><loc>${SITE_URL}/</loc><xhtml:link rel="alternate" hreflang="en" href="${SITE_URL}/"/><xhtml:link rel="alternate" hreflang="zh-TW" href="${SITE_URL}/zh-TW/"/></url>\n  <url><loc>${SITE_URL}/zh-TW/</loc><xhtml:link rel="alternate" hreflang="en" href="${SITE_URL}/"/><xhtml:link rel="alternate" hreflang="zh-TW" href="${SITE_URL}/zh-TW/"/></url>`;
  const urls = articles.toSorted((a, b) => b.event_date.localeCompare(a.event_date)).map((article) => {
    const pair = pairs.get(article.event_id);
    return `<url><loc>${SITE_URL}/news/${article.locale}/${article.slug}/</loc><lastmod>${article.updated_at.slice(0, 10)}</lastmod><xhtml:link rel="alternate" hreflang="en" href="${SITE_URL}/news/en/${pair.en.slug}/"/><xhtml:link rel="alternate" hreflang="zh-TW" href="${SITE_URL}/news/zh-TW/${pair["zh-TW"].slug}/"/></url>`;
  }).join("\n  ");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n  ${home}\n  ${urls}\n</urlset>\n`;
}

await fs.rm(path.join(ROOT, "news"), { recursive: true, force: true });
for (const article of articles) {
  const destination = path.join(ROOT, "news", article.locale, article.slug);
  await fs.mkdir(destination, { recursive: true });
  await fs.writeFile(path.join(destination, "index.html"), articlePage(article));
}
await fs.mkdir(path.join(ROOT, "zh-TW"), { recursive: true });
await Promise.all([
  fs.writeFile(path.join(ROOT, "index.html"), homepage("en")),
  fs.writeFile(path.join(ROOT, "zh-TW", "index.html"), homepage("zh-TW")),
  fs.writeFile(path.join(ROOT, "feed.xml"), feed()),
  fs.writeFile(path.join(ROOT, "sitemap.xml"), sitemap())
]);

const siteDirectory = path.join(ROOT, "_site");
await fs.rm(siteDirectory, { recursive: true, force: true });
await fs.mkdir(siteDirectory, { recursive: true });
for (const directory of ["assets", "news", "zh-TW"]) {
  await fs.cp(path.join(ROOT, directory), path.join(siteDirectory, directory), { recursive: true });
}
for (const file of ["index.html", "feed.xml", "sitemap.xml", "robots.txt"]) {
  await fs.copyFile(path.join(ROOT, file), path.join(siteDirectory, file));
}

console.log(`Built ${articles.length} article pages, 2 homepages, RSS, sitemap and deployment bundle.`);
