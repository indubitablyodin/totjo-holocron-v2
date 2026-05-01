/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from 'react';

import { DoctrineMarkdownBlocks, parseDoctrineMarkdown, type DoctrineMarkdownBlock } from '@/features/reader/doctrineMarkdown';

import type { PronounMode } from './personalizationRules';

export type PersonalizedBlockOverlay = {
  key: string;
  documentId: string;
  documentVersion: number;
  blockId: string;
  originalText: string;
  displayText: string;
  isPersonalized: boolean;
};

export type PersonalizedDoctrineModel = {
  blocks: DoctrineMarkdownBlock[];
  overlays: Record<string, PersonalizedBlockOverlay>;
  hasPersonalizedBlocks: boolean;
};

export type SourceTextReference = {
  documentId: string;
  blockId: string;
  documentVersion: number;
  excerpt: string;
};

const BLOCK_LEVEL_PRONOUN_REPLACEMENTS: Record<PronounMode, Record<string, string>> = {
  he: {
    'canon-code::paragraph-1': 'The Jedi Code comes in two versions that offer different ways of understanding the same teaching.',
    'canon-code::code-intro-1': 'The Jedi Code comes in two versions that offer different ways of understanding the same teaching.',
    'canon-three-tenets::paragraph-1':
      'When used correctly, the Jedi Tenets allow him to better himself and overcome any obstacle. They help him improve the world around him and fulfil his purpose in life as a Jedi.',
  },
  she: {
    'canon-code::paragraph-1': 'The Jedi Code comes in two versions that offer different ways of understanding the same teaching.',
    'canon-code::code-intro-1': 'The Jedi Code comes in two versions that offer different ways of understanding the same teaching.',
    'canon-three-tenets::paragraph-1':
      'When used correctly, the Jedi Tenets allow her to better herself and overcome any obstacle. They help her improve the world around her and fulfil her purpose in life as a Jedi.',
  },
  they: {
    'canon-code::paragraph-1': 'The Jedi Code comes in two versions that offer different ways of understanding the same teaching.',
    'canon-code::code-intro-1': 'The Jedi Code comes in two versions that offer different ways of understanding the same teaching.',
    'canon-three-tenets::paragraph-1':
      'When used correctly, the Jedi Tenets allow them to better themselves and overcome any obstacle. They help them improve the world around them and fulfil their purpose in life as a Jedi.',
  },
};

function renderParagraphLines(lines: string[]): ReactNode {
  return lines.map((line, index) => (
    <span key={`${line}-${index}`}>
      {line}
      {index < lines.length - 1 ? <br /> : null}
    </span>
  ));
}

function applyPronounPersonalization(pronounMode: PronounMode, documentId: string, blockId: string, originalText: string) {
  const exactReplacement = BLOCK_LEVEL_PRONOUN_REPLACEMENTS[pronounMode][`${documentId}::${blockId}`];

  if (exactReplacement) {
    return exactReplacement;
  }

  return originalText.replace(/\bhuman person\b/g, 'human being');
}

export function createDisplayPersonalizationOverlay({
  blockId,
  documentId,
  documentVersion,
  originalText,
  pronounMode,
}: {
  blockId: string;
  documentId: string;
  documentVersion: number;
  originalText: string;
  pronounMode: PronounMode;
}): PersonalizedBlockOverlay {
  const displayText = applyPronounPersonalization(pronounMode, documentId, blockId, originalText);

  return {
    key: `${documentId}::${blockId}::v${documentVersion}`,
    documentId,
    documentVersion,
    blockId,
    originalText,
    displayText,
    isPersonalized: displayText !== originalText,
  };
}

export function createDoctrinePersonalizationModel({
  documentId,
  documentVersion,
  markdown,
  pronounMode,
}: {
  documentId: string;
  documentVersion: number;
  markdown: string;
  pronounMode: PronounMode;
}): PersonalizedDoctrineModel {
  const blocks = parseDoctrineMarkdown(markdown);
  const overlays = Object.fromEntries(
    blocks.map((block) => {
      const originalText = block.type === 'heading' ? block.text : block.text;

      return [
        block.id,
        createDisplayPersonalizationOverlay({
          blockId: block.id,
          documentId,
          documentVersion,
          originalText,
          pronounMode,
        }),
      ];
    }),
  );

  return {
    blocks,
    overlays,
    hasPersonalizedBlocks: Object.values(overlays).some((overlay) => overlay.isPersonalized),
  };
}

export function createSourceTextReference(overlay: PersonalizedBlockOverlay): SourceTextReference {
  return {
    documentId: overlay.documentId,
    blockId: overlay.blockId,
    documentVersion: overlay.documentVersion,
    excerpt: overlay.originalText,
  };
}

export function findSourceTextMatches(overlays: PersonalizedBlockOverlay[], query: string): SourceTextReference[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return [];
  }

  return overlays
    .filter((overlay) => overlay.originalText.toLowerCase().includes(normalizedQuery))
    .map((overlay) => createSourceTextReference(overlay));
}

function blockTextToLines(block: DoctrineMarkdownBlock, text: string) {
  return block.type === 'paragraph' ? text.split('\n') : text.split('\n').filter(Boolean);
}

function renderBlockBody(block: DoctrineMarkdownBlock, text: string) {
  if (block.type === 'paragraph') {
    return <p className="reader-paragraph">{renderParagraphLines(blockTextToLines(block, text))}</p>;
  }

  if (block.type === 'unordered-list') {
    return (
      <ul className="reader-list">
        {blockTextToLines(block, text).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }

  if (block.type === 'ordered-list') {
    return (
      <ol className="reader-list reader-list--ordered">
        {blockTextToLines(block, text).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    );
  }

  return null;
}

export function PersonalizedTextBlock({
  className = 'reader-paragraph',
  overlay,
  personalizationEnabled,
  showOriginal,
}: {
  className?: string;
  overlay: PersonalizedBlockOverlay;
  personalizationEnabled: boolean;
  showOriginal: boolean;
}) {
  const resolvedText = personalizationEnabled && overlay.isPersonalized && !showOriginal ? overlay.displayText : overlay.originalText;
  const lines = resolvedText.split('\n');

  return (
    <div className="personalized-block" data-personalized-block={overlay.blockId}>
      <p className={className}>{renderParagraphLines(lines)}</p>
    </div>
  );
}

export function PersonalizedDoctrineContent({
  model,
  personalizationEnabled,
  showOriginalBlockIds,
}: {
  model: PersonalizedDoctrineModel;
  personalizationEnabled: boolean;
  showOriginalBlockIds: Set<string>;
}) {
  return (
    <DoctrineMarkdownBlocks
      blocks={model.blocks}
      renderBlock={(block, defaultNode) => {
        if (block.type === 'heading') {
          return defaultNode;
        }

        const overlay = model.overlays[block.id];

        if (!overlay?.isPersonalized) {
          return defaultNode;
        }

        const resolvedText = personalizationEnabled && !showOriginalBlockIds.has(block.id) ? overlay.displayText : overlay.originalText;

        return (
          <div className="personalized-block" data-personalized-block={block.id} key={block.id}>
            {renderBlockBody(block, resolvedText)}
          </div>
        );
      }}
    />
  );
}
