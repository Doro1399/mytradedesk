import type { MetadataRoute } from "next";

const BASE = "https://mytradedesk.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    { url: `${BASE}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/compare`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/pricing`, lastModified, changeFrequency: "monthly", priority: 0.85 },
    { url: `${BASE}/privacy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/terms`, lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];
}
