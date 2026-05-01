/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from 'react';

export type DoctrineMarkdownBlock =
  | { id: string; type: 'heading'; text: string }
  | { id: string; type: 'paragraph'; lines: string[]; text: string }
  | { id: string; type: 'unordered-list'; items: string[]; text: string }
  | { id: string; type: 'ordered-list'; items: string[]; text: string };

type CodeView = {
  intro: string[];
  versions: Array<{
    title: string;
    items: string[];
  }>;
  attribution: string | null;
};

function isBlank(line: string) {
  return line.trim().length === 0;
}

function isOrderedItem(line: string) {
  return /^\d+\.\s+/.test(line.trim());
}

function isBulletItem(line: string) {
  return /^-\s+/.test(line.trim());
}

function createBlockId(type: DoctrineMarkdownBlock['type'], index: number) {
  return `${type}-${index + 1}`;
}

export function parseDoctrineMarkdown(markdown: string): DoctrineMarkdownBlock[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: DoctrineMarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trimEnd();

    if (isBlank(line)) {
      index += 1;
      continue;
    }

    if (/^#\s+/.test(line)) {
      index += 1;
      continue;
    }

    if (/^##\s+/.test(line)) {
      const text = line.replace(/^##\s+/, '').trim();
      blocks.push({ id: createBlockId('heading', blocks.length), type: 'heading', text });
      index += 1;
      continue;
    }

    if (isBulletItem(line)) {
      const items: string[] = [];

      while (index < lines.length && isBulletItem(lines[index])) {
        items.push(lines[index].trim().replace(/^-\s+/, ''));
        index += 1;
      }

      blocks.push({
        id: createBlockId('unordered-list', blocks.length),
        type: 'unordered-list',
        items,
        text: items.join('\n'),
      });
      continue;
    }

    if (isOrderedItem(line)) {
      const items: string[] = [];

      while (index < lines.length && isOrderedItem(lines[index])) {
        items.push(lines[index].trim().replace(/^\d+\.\s+/, ''));
        index += 1;
      }

      blocks.push({
        id: createBlockId('ordered-list', blocks.length),
        type: 'ordered-list',
        items,
        text: items.join('\n'),
      });
      continue;
    }

    const paragraphLines: string[] = [];

    while (
      index < lines.length &&
      !isBlank(lines[index]) &&
      !/^##\s+/.test(lines[index]) &&
      !isBulletItem(lines[index]) &&
      !isOrderedItem(lines[index])
    ) {
      if (!/^#\s+/.test(lines[index])) {
        paragraphLines.push(lines[index].trimEnd());
      }
      index += 1;
    }

    if (paragraphLines.length > 0) {
      blocks.push({
        id: createBlockId('paragraph', blocks.length),
        type: 'paragraph',
        lines: paragraphLines,
        text: paragraphLines.join('\n'),
      });
    }
  }

  return blocks;
}

export function parseCodeView(markdown: string): CodeView {
  const lines = markdown.split(/\r?\n/);
  const intro: string[] = [];
  const versions: CodeView['versions'] = [];
  let attribution: string | null = null;
  let currentVersion: CodeView['versions'][number] | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || /^#\s+/.test(line)) {
      continue;
    }

    if (/^##\s+/.test(line)) {
      currentVersion = { title: line.replace(/^##\s+/, ''), items: [] };
      versions.push(currentVersion);
      continue;
    }

    if (isOrderedItem(line) && currentVersion) {
      currentVersion.items.push(line.replace(/^\d+\.\s+/, ''));
      continue;
    }

    if (versions.length === 0) {
      intro.push(line);
      continue;
    }

    attribution = line;
  }

  return { intro, versions, attribution };
}

function renderParagraphLines(lines: string[]): ReactNode {
  return lines.map((line, index) => (
    <span key={`${line}-${index}`}>
      {line}
      {index < lines.length - 1 ? <br /> : null}
    </span>
  ));
}

function renderDefaultBlock(block: DoctrineMarkdownBlock, index: number) {
  if (block.type === 'heading') {
    return (
      <h2 className="reader-subheading" key={`${block.id}-${index}`}>
        {block.text}
      </h2>
    );
  }

  if (block.type === 'unordered-list') {
    return (
      <ul className="reader-list" key={`${block.id}-${index}`}>
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }

  if (block.type === 'ordered-list') {
    return (
      <ol className="reader-list reader-list--ordered" key={`${block.id}-${index}`}>
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    );
  }

  return (
    <p className="reader-paragraph" key={`${block.id}-${index}`}>
      {renderParagraphLines(block.lines)}
    </p>
  );
}

type DoctrineMarkdownBlocksProps = {
  blocks: DoctrineMarkdownBlock[];
  renderBlock?: (block: DoctrineMarkdownBlock, defaultNode: ReactNode) => ReactNode;
};

export function DoctrineMarkdownBlocks({ blocks, renderBlock }: DoctrineMarkdownBlocksProps) {
  return (
    <div className="reader-copy">
      {blocks.map((block, index) => {
        const defaultNode = renderDefaultBlock(block, index);

        return renderBlock ? renderBlock(block, defaultNode) : defaultNode;
      })}
    </div>
  );
}

export function DoctrineMarkdownContent({ markdown }: { markdown: string }) {
  return <DoctrineMarkdownBlocks blocks={parseDoctrineMarkdown(markdown)} />;
}
