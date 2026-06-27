import { normalizeDocumentRecord, nonEmptyArray } from './contentTypes';

/** Pick the first non-empty array from a series of fallback candidates. */
export function firstNonEmpty<T>(...candidates: (T[] | null | undefined)[]): T[] {
  for (const candidate of candidates) {
    if (nonEmptyArray(candidate)) {
      return candidate;
    }
  }
  return [];
}

/**
 * Resolve text items for the three-tenets doctrine.
 * Priority: sections body → tenets list → items list → empty.
 */
export function resolveThreeTenetsItems(
  sections: Array<{ title: string; body: string[] }> | null | undefined,
  tenets: string[] | null | undefined,
  items: string[] | null | undefined,
): string[] {
  if (nonEmptyArray(sections)) {
    return sections.map((section) => section.body[0] ?? section.title);
  }

  return firstNonEmpty(tenets, items);
}

export { normalizeDocumentRecord, nonEmptyArray };
