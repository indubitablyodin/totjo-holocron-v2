#!/usr/bin/env node

/**
 * Check announcements feed validation script.
 *
 * Usage:
 *   node scripts/check-announcements-feed.mjs
 *   node scripts/check-announcements-feed.mjs path/to/announcements.json
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const VALID_KINDS = ['totjo', 'sermon', 'doctrine', 'event', 'app', 'practice'];
const VALID_PRIORITIES = ['low', 'normal', 'high', 'urgent'];
const VALID_PLACEMENTS = ['badge', 'banner', 'modal', 'card'];

let exitCode = 0;

function fail(message) {
  console.error(`  FAIL: ${message}`);
  exitCode = 1;
}

function warn(message) {
  console.warn(`  WARN: ${message}`);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPositiveInteger(value) {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isSafeHref(value) {
  if (typeof value !== 'string') {
    return false;
  }

  if (value.startsWith('/')) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidDateString(value) {
  if (typeof value !== 'string') {
    return false;
  }

  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function checkAnnouncements(announcements) {
  let accepted = 0;
  let rejected = 0;
  const rejectedIds = [];

  for (const [index, entry] of announcements.entries()) {
    if (!entry || typeof entry !== 'object') {
      rejected++;
      rejectedIds.push(`entry ${index}: not an object`);
      continue;
    }

    const reasons = [];

    if (!isNonEmptyString(entry.id)) {
      reasons.push('missing or empty id');
    }

    if (!isPositiveInteger(entry.version)) {
      reasons.push('version must be a positive integer');
    }

    if (!VALID_KINDS.includes(entry.kind)) {
      reasons.push(`invalid kind "${entry.kind}"`);
    }

    if (!VALID_PRIORITIES.includes(entry.priority)) {
      reasons.push(`invalid priority "${entry.priority}"`);
    }

    if (!VALID_PLACEMENTS.includes(entry.placement)) {
      reasons.push(`invalid placement "${entry.placement}"`);
    }

    if (!isNonEmptyString(entry.title)) {
      reasons.push('missing or empty title');
    }

    if (typeof entry.body !== 'string' || entry.body.trim().length === 0) {
      reasons.push('missing or empty body');
    }

    if (!isValidDateString(entry.publishedAt)) {
      reasons.push('invalid publishedAt');
    }

    if (entry.startsAt !== undefined && !isValidDateString(entry.startsAt)) {
      reasons.push('invalid startsAt');
    }

    if (entry.expiresAt !== undefined && !isValidDateString(entry.expiresAt)) {
      reasons.push('invalid expiresAt');
    }

    if (entry.dismissible !== undefined && typeof entry.dismissible !== 'boolean') {
      reasons.push('dismissible must be boolean');
    }

    if (entry.action !== undefined) {
      if (!entry.action || typeof entry.action !== 'object') {
        reasons.push('action must be an object');
      } else {
        if (!isNonEmptyString(entry.action.label)) {
          reasons.push('action label missing or empty');
        }

        if (!isSafeHref(entry.action.href)) {
          reasons.push(`unsafe action href: "${entry.action.href}"`);
        }
      }
    }

    if (reasons.length > 0) {
      rejected++;
      rejectedIds.push(`${entry.id || `entry ${index}`}: ${reasons.join('; ')}`);
    } else {
      accepted++;
    }
  }

  return { accepted, rejected, rejectedIds };
}

// Main
const feedPath = process.argv[2] || resolve('public/announcements.json');

if (!existsSync(feedPath)) {
  fail(`File not found: ${feedPath}`);
  process.exit(1);
}

let raw;
try {
  raw = readFileSync(feedPath, 'utf8');
} catch (err) {
  fail(`Could not read file: ${err.message}`);
  process.exit(1);
}

let data;
try {
  data = JSON.parse(raw);
} catch (err) {
  fail(`Invalid JSON: ${err.message}`);
  process.exit(1);
}

console.log(`Feed path: ${feedPath}`);

if (data.schemaVersion !== 1) {
  fail(`schemaVersion must be 1, got ${data.schemaVersion}`);
  process.exit(1);
}

console.log(`Schema version: ${data.schemaVersion}`);

if (!isValidDateString(data.updatedAt)) {
  fail(`updatedAt must be a valid date string, got "${data.updatedAt}"`);
  process.exit(1);
}

console.log(`Updated at: ${data.updatedAt}`);

if (!Array.isArray(data.announcements)) {
  fail('announcements must be an array');
  process.exit(1);
}

console.log(`Total announcements: ${data.announcements.length}`);

const { accepted, rejected, rejectedIds } = checkAnnouncements(data.announcements);

console.log(`Accepted: ${accepted}`);
console.log(`Rejected: ${rejected}`);

if (rejectedIds.length > 0) {
  console.log('');
  console.log('Rejected entries:');
  for (const id of rejectedIds) {
    console.log(`  - ${id}`);
  }
}

if (exitCode === 0) {
  console.log('');
  console.log('Feed OK.');
} else {
  console.log('');
  console.log('Feed has errors.');
}

process.exit(exitCode);
