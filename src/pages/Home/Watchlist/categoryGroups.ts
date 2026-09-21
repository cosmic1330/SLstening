import { CategoryType } from "../../../types";
import { isDefaultCategory } from "../../../store/Stock.store";

export interface CategoryGroups {
  defaultCategory: CategoryType | null;
  pinned: CategoryType[];
  recent: CategoryType[];
  others: CategoryType[];
  visibleCount: number;
}

export function categoryDisplayName(
  category: CategoryType,
  defaultName: string,
) {
  return isDefaultCategory(category) ? defaultName : category.name;
}

export function groupCategories({
  categories,
  pinnedCategoryIds,
  recentCategoryIds,
  query,
  defaultName,
  locale,
}: {
  categories: CategoryType[];
  pinnedCategoryIds: string[];
  recentCategoryIds: string[];
  query: string;
  defaultName: string;
  locale: string;
}): CategoryGroups {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const normalizedQuery = query.trim().toLocaleLowerCase(locale);
  const matches = (category: CategoryType) =>
    !normalizedQuery ||
    categoryDisplayName(category, defaultName)
      .toLocaleLowerCase(locale)
      .includes(normalizedQuery);

  const defaultCandidate = categories.find(isDefaultCategory) ?? null;
  const defaultCategory =
    defaultCandidate && matches(defaultCandidate) ? defaultCandidate : null;
  const seen = new Set(defaultCandidate ? [defaultCandidate.id] : []);

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
  const collator = new Intl.Collator(locale, { sensitivity: "base" });
  const others = categories
    .filter((category) => !seen.has(category.id) && matches(category))
    .sort((left, right) =>
      collator.compare(
        categoryDisplayName(left, defaultName),
        categoryDisplayName(right, defaultName),
      ),
    );

  return {
    defaultCategory,
    pinned,
    recent,
    others,
    visibleCount:
      (defaultCategory ? 1 : 0) + pinned.length + recent.length + others.length,
  };
}
