const fs = require('node:fs');
const path = require('node:path');

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function validateContentAuthorityRegistry(registry) {
  if (!isObject(registry)) {
    throw new Error('Content authority registry must be an object.');
  }

  const requiredClasses = ['canonical', 'supplemental', 'sermon'];

  if (!Array.isArray(registry.classes)) {
    throw new Error('Content authority registry must include a classes array.');
  }

  for (const requiredClass of requiredClasses) {
    if (!registry.classes.includes(requiredClass)) {
      throw new Error(`Missing required class: ${requiredClass}`);
    }
  }

  if (!Array.isArray(registry.entries) || registry.entries.length === 0) {
    throw new Error('Content authority registry must include at least one entry.');
  }

  const allowedClasses = new Set(registry.classes);

  for (const entry of registry.entries) {
    if (!isObject(entry)) {
      throw new Error('Each content authority entry must be an object.');
    }

    if (typeof entry.id !== 'string' || entry.id.length === 0) {
      throw new Error('Each content authority entry must have an id.');
    }

    if (!allowedClasses.has(entry.authorityClass)) {
      throw new Error(`Entry ${entry.id} has an unknown authority class.`);
    }

    if (entry.id === 'knights-code' && entry.authorityClass === 'canonical') {
      throw new Error("Knight's Code cannot be classified as canonical.");
    }

    if (typeof entry.approvalStatus !== 'string' || entry.approvalStatus.length === 0) {
      throw new Error(`Entry ${entry.id} must record approval status.`);
    }

    if (typeof entry.provenanceStatus !== 'string' || entry.provenanceStatus.length === 0) {
      throw new Error(`Entry ${entry.id} must record provenance status.`);
    }

    if (!Array.isArray(entry.sourceUrls) || entry.sourceUrls.length === 0) {
      throw new Error(`Entry ${entry.id} must record at least one source URL.`);
    }
  }
}

function validateAudioRightsRegistry(registry) {
  if (!isObject(registry)) {
    throw new Error('Audio rights registry must be an object.');
  }

  if (!Array.isArray(registry.assets)) {
    throw new Error('Audio rights registry must include an assets array.');
  }

  for (const asset of registry.assets) {
    if (!isObject(asset)) {
      throw new Error('Each audio asset entry must be an object.');
    }

    for (const field of ['id', 'approvalStatus', 'provenanceStatus', 'license']) {
      if (typeof asset[field] !== 'string' || asset[field].length === 0) {
        throw new Error(`Audio asset ${asset.id || '<unknown>'} must record ${field}.`);
      }
    }
  }
}

function validateFiles(contentAuthorityPath, audioRightsPath) {
  const contentAuthority = readJson(contentAuthorityPath);
  const audioRights = readJson(audioRightsPath);

  validateContentAuthorityRegistry(contentAuthority);
  validateAudioRightsRegistry(audioRights);
}

if (require.main === module) {
  const contentAuthorityPath = process.argv[2] || path.resolve(process.cwd(), 'content/policy/content-authority.json');
  const audioRightsPath = process.argv[3] || path.resolve(process.cwd(), 'content/policy/audio-rights.json');

  try {
    validateFiles(contentAuthorityPath, audioRightsPath);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = {
  validateContentAuthorityRegistry,
  validateAudioRightsRegistry,
  validateFiles
};
