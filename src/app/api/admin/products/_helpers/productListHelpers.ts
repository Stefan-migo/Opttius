export function getSortColumn(sortBy: string): string {
  switch (sortBy) {
    case "price_asc": case "price_desc": return "price";
    case "name": return "name";
    case "newest": return "created_at";
    case "featured": return "is_featured";
    default: return "created_at";
  }
}

export function getSortOrder(sort: string) {
  switch (sort) {
    case "price_asc": return "asc";
    case "price_desc": return "desc";
    case "name": return "asc";
    case "newest": return "desc";
    case "featured": return "desc";
    default: return "desc";
  }
}
