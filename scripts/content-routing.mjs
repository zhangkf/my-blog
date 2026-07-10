export function parseFrontmatterValue(content, key) {
  const match = content.match(new RegExp(`^${key}:\\s*(.+)\\r?$`, "m"));
  if (!match) return null;

  const value = match[1].trim();
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/''/g, "'");
  }
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }
  return value;
}

export function getContentRoute(content, fallbackCategory, fallbackSlug) {
  return {
    category: parseFrontmatterValue(content, "route_category") || fallbackCategory,
    slug: parseFrontmatterValue(content, "route_slug") || fallbackSlug,
  };
}
