import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

export const ROOT = path.resolve(import.meta.dirname, "..");
export const SITE_URL = "https://allenshih.github.io/asia-infra-web";
export const LOCALES = ["en", "zh-TW"];

export const sectorConfig = {
  "Data Center": {
    key: "data-center",
    image: "hero-data-centre.jpg",
    labels: { en: "Data Center", "zh-TW": "資料中心" },
    alt: { en: "Illustrative data centre campus with power infrastructure", "zh-TW": "具備電力基礎設施的資料中心園區示意圖" }
  },
  "Grid & Transmission": {
    key: "grid-hvdc",
    image: "hero-grid-hvdc.jpg",
    labels: { en: "Grid & HVDC", "zh-TW": "電網與 HVDC" },
    alt: { en: "Illustrative high-voltage transmission corridor", "zh-TW": "高壓輸電走廊示意圖" }
  },
  BESS: {
    key: "bess",
    image: "hero-bess.jpg",
    labels: { en: "BESS", "zh-TW": "BESS" },
    alt: { en: "Illustrative utility-scale battery energy storage system", "zh-TW": "公用事業級電池儲能系統示意圖" }
  },
  "Offshore Wind": {
    key: "offshore-wind",
    image: "hero-offshore-wind.jpg",
    labels: { en: "Offshore Wind", "zh-TW": "離岸風電" },
    alt: { en: "Illustrative offshore wind farm scene", "zh-TW": "離岸風場示意圖" }
  }
};

const translations = {
  topic: {
    Operations: "營運",
    "Financing & Investment": "融資與投資",
    "Grid & Interconnection": "電網與併網",
    Technology: "科技"
  },
  country: {
    Australia: "澳洲",
    China: "中國",
    Indonesia: "印尼",
    Malaysia: "馬來西亞",
    Taiwan: "台灣",
    Thailand: "泰國"
  }
};

export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function toIso(value) {
  return value instanceof Date ? value.toISOString() : String(value ?? "");
}

export function localize(value, type, locale) {
  if (locale === "en") return value;
  return translations[type]?.[value] ?? value;
}

export function formatDate(date, locale) {
  if (locale === "zh-TW") {
    const [year, month, day] = date.split("-").map(Number);
    return `${year} 年 ${month} 月 ${day} 日`;
  }
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "zh-TW", {
    day: "numeric",
    month: locale === "en" ? "long" : "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${date}T00:00:00Z`));
}

export async function loadArticles() {
  const articles = [];
  for (const locale of LOCALES) {
    const directory = path.join(ROOT, "content", "news", locale);
    const files = (await fs.readdir(directory)).filter((file) => file.endsWith(".md")).sort();
    for (const file of files) {
      const sourcePath = path.join(directory, file);
      const raw = await fs.readFile(sourcePath, "utf8");
      const parsed = matter(raw);
      const paragraphs = parsed.content
        .replace(/^#\s+.*$/m, "")
        .trim()
        .split(/\n\s*\n/);
      const summary = paragraphs.find((part) => !part.startsWith("#") && !part.startsWith("- ")) ?? "";
      articles.push({
        ...parsed.data,
        event_date: parsed.data.event_date instanceof Date ? parsed.data.event_date.toISOString().slice(0, 10) : String(parsed.data.event_date ?? ""),
        published_at: toIso(parsed.data.published_at),
        updated_at: toIso(parsed.data.updated_at),
        content: parsed.content,
        summary: summary.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[*_]/g, ""),
        sourcePath: path.relative(ROOT, sourcePath)
      });
    }
  }
  return articles;
}

export function pairMap(articles) {
  const pairs = new Map();
  for (const article of articles) {
    const pair = pairs.get(article.event_id) ?? {};
    pair[article.locale] = article;
    pairs.set(article.event_id, pair);
  }
  return pairs;
}
