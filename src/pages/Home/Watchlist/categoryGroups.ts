import { CategoryType } from "../../../types";

export interface CategoryGroups {
  pinned: CategoryType[];
  recent: CategoryType[];
  others: CategoryType[];
  visibleCount: number;
}

export function categoryDisplayName(category: CategoryType) {
  return category.name || category.id;
}

export function groupCategories({
  categories,
  pinnedCategoryIds,
  recentCategoryIds,
  query,
  locale,
}: {
  categories: CategoryType[];
  pinnedCategoryIds: string[];
  recentCategoryIds: string[];
  query: string;
  locale: string;
}): CategoryGroups {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const normalizedQuery = query.trim().toLocaleLowerCase(locale);
  const matches = (category: CategoryType) =>
    !normalizedQuery ||
    categoryDisplayName(category)
      .toLocaleLowerCase(locale)
      .includes(normalizedQuery);
  const seen = new Set<string>();

  const take = (ids: string[]) =>
    ids.flatMap((id) => {
      if (seen.has(id)) return [];
      const category = byId.get(id);
      if (!category || !matches(category)) return [];
      seen.add(id);
      return [category];
    });

  const pinned = take(pinnedCategoryIds);
  const recent = take(recentCategoryIds);
  const others = categories
    .filter((category) => !seen.has(category.id) && matches(category));

  return {
    pinned,
    recent,
    others,
    visibleCount: pinned.length + recent.length + others.length,
  };
}
