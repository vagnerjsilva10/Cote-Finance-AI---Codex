const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TARGET_DIRS = ['app', 'components'];
const ALLOWED_HEX_FILE = path.join(ROOT, 'app', 'globals.css');
const EXTENSIONS = new Set(['.ts', '.tsx', '.css']);

const HEX_PATTERN = /#[0-9a-fA-F]{3,8}\b/g;
const LEGACY_COLOR_CLASS_PATTERN =
  /\b(?:text|bg|border|from|to|via|ring|hover:bg|hover:border|focus:border)-(?:slate|gray|zinc|stone|neutral|white|black|emerald|green|lime|yellow|amber|orange|red|rose|cyan|teal|blue|indigo|violet|purple|fuchsia|pink)-/g;

function walk(dir, acc) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, acc);
      continue;
    }
    if (EXTENSIONS.has(path.extname(entry.name))) {
      acc.push(fullPath);
    }
  }
}

function collectMatches(content, regex) {
  const out = [];
  for (const match of content.matchAll(regex)) {
    out.push({ value: match[0], index: match.index ?? 0 });
  }
  return out;
}

function getLineFromIndex(content, index) {
  return content.slice(0, index).split('\n').length;
}

const files = [];
for (const dir of TARGET_DIRS) {
  const absolute = path.join(ROOT, dir);
  if (fs.existsSync(absolute)) {
    walk(absolute, files);
  }
}

const violations = [];

for (const filePath of files) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relative = path.relative(ROOT, filePath).replace(/\\/g, '/');

  if (filePath !== ALLOWED_HEX_FILE) {
    const hexMatches = collectMatches(content, HEX_PATTERN);
    for (const item of hexMatches) {
      violations.push({
        file: relative,
        line: getLineFromIndex(content, item.index),
        reason: `Hex color hardcoded: ${item.value}`,
      });
    }
  }

  const legacyMatches = collectMatches(content, LEGACY_COLOR_CLASS_PATTERN);
  for (const item of legacyMatches) {
    violations.push({
      file: relative,
      line: getLineFromIndex(content, item.index),
      reason: `Legacy utility color class: ${item.value}`,
    });
  }
}

if (violations.length > 0) {
  console.error('Theme hardcode check failed.');
  for (const violation of violations) {
    console.error(`${violation.file}:${violation.line} - ${violation.reason}`);
  }
  process.exit(1);
}

console.log('Theme hardcode check passed.');
