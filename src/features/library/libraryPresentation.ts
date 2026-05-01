import type { DocumentAuthorityClass, DocumentRecord } from '@/lib/content';

export type LibraryAuthorityClass = Extract<DocumentAuthorityClass, 'canonical' | 'supplemental'>;
export type LibraryRouteSegment = 'doctrine' | 'supplemental';
export type LibraryDocumentRecord = DocumentRecord & {
  authorityClass: LibraryAuthorityClass;
  documentType: 'study-text';
};

type AuthorityPresentation = {
  routeSegment: LibraryRouteSegment;
  eyebrow: string;
  laneTitle: string;
  laneDescription: string;
  badgeLabel: string;
  explanation: string;
  emptyState: string;
};

const authorityPresentation: Record<LibraryAuthorityClass, AuthorityPresentation> = {
  canonical: {
    routeSegment: 'doctrine',
    eyebrow: 'Doctrine',
    laneTitle: 'Doctrine',
    laneDescription: 'Read the public doctrine of the Order here.',
    badgeLabel: 'Doctrine Text',
    explanation: 'This section contains the public doctrine text used in the app.',
    emptyState: 'No doctrine entries match the current search.',
  },
  supplemental: {
    routeSegment: 'supplemental',
    eyebrow: 'Supplemental reading',
    laneTitle: 'Supplemental reading',
    laneDescription: 'Read the supporting study texts here.',
    badgeLabel: 'Study Text',
    explanation: 'This section contains supporting study texts alongside doctrine.',
    emptyState: 'No supplemental entries match the current search.',
  },
};

export function getAuthorityPresentation(authorityClass: LibraryAuthorityClass): AuthorityPresentation {
  return authorityPresentation[authorityClass];
}

export function isLibraryDocument(document: DocumentRecord): document is LibraryDocumentRecord {
  return (
    document.documentType === 'study-text' &&
    (document.authorityClass === 'canonical' || document.authorityClass === 'supplemental')
  );
}

export function getLibraryDocumentHref(document: Pick<DocumentRecord, 'slug' | 'authorityClass'>): string {
  if (document.authorityClass === 'canonical') {
    return `/library/doctrine/${document.slug}`;
  }

  if (document.authorityClass === 'supplemental') {
    return `/library/supplemental/${document.slug}`;
  }

  throw new Error(`Unsupported library authority class: ${document.authorityClass}`);
}
