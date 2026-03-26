export interface PaginatedItems<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

interface SearchableTagValue {
  value: string;
}

interface UsageSortedTagValue extends SearchableTagValue {
  usageCount: number;
}

export function normalizeTagSearchQuery(value: string): string {
  return value.normalize("NFC").trim().toLowerCase().replace(/\s+/g, " ");
}

export function filterTagValuesByQuery<T extends SearchableTagValue>(items: T[], query: string): T[] {
  const normalizedQuery = normalizeTagSearchQuery(query);
  if (!normalizedQuery) {
    return items;
  }

  return items.filter((item) => normalizeTagSearchQuery(item.value).includes(normalizedQuery));
}

export function sortTagValuesByUsage<T extends UsageSortedTagValue>(items: T[]): T[] {
  return [...items].sort((left, right) => {
    const usageDelta = right.usageCount - left.usageCount;
    if (usageDelta !== 0) {
      return usageDelta;
    }

    return left.value.localeCompare(right.value, "ko-KR");
  });
}

export function suggestTagValues<T extends UsageSortedTagValue>(
  items: T[],
  query: string,
  selectedValues: string[],
  limit = 6
): T[] {
  const normalizedQuery = normalizeTagSearchQuery(query);
  if (!normalizedQuery) {
    return [];
  }

  const selectedValueSet = new Set(selectedValues.map((value) => normalizeTagSearchQuery(value)));

  return items
    .map((item) => ({
      item,
      normalizedValue: normalizeTagSearchQuery(item.value)
    }))
    .filter(({ normalizedValue }) => {
      if (selectedValueSet.has(normalizedValue)) {
        return false;
      }

      return normalizedValue.includes(normalizedQuery);
    })
    .sort((left, right) => {
      const prefixDelta =
        Number(right.normalizedValue.startsWith(normalizedQuery)) -
        Number(left.normalizedValue.startsWith(normalizedQuery));
      if (prefixDelta !== 0) {
        return prefixDelta;
      }

      const usageDelta = right.item.usageCount - left.item.usageCount;
      if (usageDelta !== 0) {
        return usageDelta;
      }

      return left.item.value.localeCompare(right.item.value, "ko-KR");
    })
    .slice(0, limit)
    .map(({ item }) => item);
}

export function paginateItems<T>(items: T[], page: number, pageSize: number): PaginatedItems<T> {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const resolvedPage = Math.min(Math.max(page, 1), totalPages);
  const startIndex = (resolvedPage - 1) * pageSize;

  return {
    items: items.slice(startIndex, startIndex + pageSize),
    page: resolvedPage,
    pageSize,
    totalItems,
    totalPages
  };
}
