const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const {
  validateAudioRightsRegistry,
  validateContentAuthorityRegistry,
  validateFiles
} = require('./validate-policy.cjs');

const projectRoot = path.resolve(__dirname, '..');
const contentAuthorityPath = path.join(projectRoot, 'content/policy/content-authority.json');
const audioRightsPath = path.join(projectRoot, 'content/policy/audio-rights.json');
const contentAuthority = require(contentAuthorityPath);
const audioRights = require(audioRightsPath);

test('current governance registries pass validation', () => {
  assert.doesNotThrow(() => validateFiles(contentAuthorityPath, audioRightsPath));
});

test("Knight's Code cannot be promoted to canonical", () => {
  const invalidRegistry = structuredClone(contentAuthority);
  const knightsCode = invalidRegistry.entries.find((entry) => entry.id === 'knights-code');

  assert.ok(knightsCode, "Expected Knight's Code entry to exist.");

  knightsCode.authorityClass = 'canonical';

  assert.throws(
    () => validateContentAuthorityRegistry(invalidRegistry),
    /cannot be classified as canonical/
  );
});

test('audio registry accepts an empty tracked asset list', () => {
  assert.doesNotThrow(() => validateAudioRightsRegistry(audioRights));
});
