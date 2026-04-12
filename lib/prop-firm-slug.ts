/**
 * Stable URL segment for `/prop-firms/[slug]` from the compare table `name` field.
 * All account rows sharing the same firm use the same slug.
 */
export function propFirmSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function propFirmDetailHref(name: string): string {
  return `/prop-firms/${propFirmSlug(name)}`;
}
