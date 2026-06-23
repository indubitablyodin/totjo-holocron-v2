import { getDocumentPlainText, type HolocronDocument } from './contentTypes';

export type HolocronSearchCorpusEntry = {
  id: string;
  document: HolocronDocument;
  titleText: string;
  bodyText: string;
  tagText: string;
  searchableText: string;
};

export function normalizeSearchText(value: string): string {
  return value
    .replace(/[#>*_`-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function createSearchCorpusEntry(document: HolocronDocument): HolocronSearchCorpusEntry {
  const titleText = document.title;
  const bodyText = getDocumentPlainText(document);
  const tagText = document.tags.join(' ');

  return {
    id: document.id,
    document,
    titleText,
    bodyText,
    tagText,
    searchableText: normalizeSearchText([titleText, document.summary, bodyText, tagText].join(' ')),
  };
}

export function createSearchCorpus(documents: HolocronDocument[]): HolocronSearchCorpusEntry[] {
  return documents.map(createSearchCorpusEntry);
}
