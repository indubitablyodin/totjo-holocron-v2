import { describe, expect, it } from 'vitest';

import { createSermonImportAssetPath } from './sermonSync';

describe('sermon import asset paths', () => {
  it('uses root-relative import assets during local development', () => {
    expect(createSermonImportAssetPath('index.json', '/')).toBe('/imports/totjo-sermons/index.json');
  });

  it('prefixes import assets with the GitHub Pages base path', () => {
    expect(createSermonImportAssetPath('index.json', '/totjo-holocron-v2/')).toBe(
      '/totjo-holocron-v2/imports/totjo-sermons/index.json',
    );
    expect(createSermonImportAssetPath('/the-force-works-all-things-out.json', '/totjo-holocron-v2')).toBe(
      '/totjo-holocron-v2/imports/totjo-sermons/the-force-works-all-things-out.json',
    );
  });
});
