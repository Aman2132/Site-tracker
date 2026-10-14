/**
 * Metro (the JS bundler) config, extending Expo's defaults.
 *
 * WHY THIS FILE EXISTS
 * Metro watches every file under the project — including node_modules — so it
 * can rebuild when something changes. Gradle builds the native side of every
 * React Native library IN PLACE, inside node_modules/<lib>/android/build and
 * .cxx, so a project like this one carries ~16 GB of native build output that
 * Metro was watching. Every Gradle build rewrites gigabytes of it; Metro
 * spent minutes of CPU reacting, and while it did it answered the phone's dev
 * launcher in 4-9 s instead of 0.02 s. The phone gave up and sat on a blank
 * screen until Metro was restarted.
 *
 * Expo's default only skips android/app/build, android/.gradle and ios/Pods
 * at the project root. This adds the rest, and none of it is JavaScript.
 *
 * Deliberately plain .js rather than .ts: Metro can only load a TypeScript
 * config on Node 22.18+, and a config that stops Metro starting on an older
 * Node is worse than the problem it fixes.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Start of a path segment: Metro tests both absolute and project-relative paths. */
const SEG = '(?:^|[\\\\/])';
/** End of a path segment. */
const END = '(?:[\\\\/]|$)';

/** A project-root folder, matched whether Metro gives an absolute or project-relative path. */
const projectFolder = name =>
  new RegExp(`^(?:${escapeRegExp(path.join(projectRoot, name))}|${escapeRegExp(name)})${END}`);

const NOT_BUNDLED = [
  // Native build output, wherever it lives — including inside node_modules.
  new RegExp(`${SEG}android[\\\\/](?:app[\\\\/])?(?:build|\\.cxx|\\.gradle)${END}`),
  new RegExp(`${SEG}ios[\\\\/](?:build|Pods)${END}`),
  new RegExp(`${SEG}\\.cxx${END}`),

  // Project folders that are never part of the JS bundle.
  projectFolder('android'),
  projectFolder('ios'),
  projectFolder('scripts'), // one-off Firebase admin scripts, with their own node_modules
  projectFolder(path.join('.expo', 'dev')), // Expo's own log files, written constantly while Metro runs
  new RegExp(
    `^(?:${escapeRegExp(path.join(projectRoot, 'modules'))}|modules)[\\\\/][^\\\\/]+[\\\\/]android${END}`
  ), // native sources/build of the local modules
];

config.resolver.blockList = [].concat(config.resolver.blockList ?? [], NOT_BUNDLED);

/**
 * Metro's cache doesn't notice when a dependency's version changes, so after an
 * upgrade it can keep serving JavaScript compiled by the old Babel plugin —
 * that is what produced "Mismatch between JavaScript code version and Worklets
 * Babel plugin version". Keying the cache on the lockfile makes it start clean
 * by itself whenever dependencies change, so `--clear` isn't needed.
 */
const lockFile = path.join(projectRoot, 'package-lock.json');
const lockHash = fs.existsSync(lockFile)
  ? crypto.createHash('sha1').update(fs.readFileSync(lockFile)).digest('hex').slice(0, 12)
  : 'no-lockfile';
config.cacheVersion = `deps-${lockHash}`;

module.exports = config;
