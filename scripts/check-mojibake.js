const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TARGET_DIRS = ['app', 'components', 'lib', 'prisma', 'hooks', 'scripts'];
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'build', 'coverage', 'out']);
const TEXT_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.json',
  '.css',
  '.md',
  '.html',
  '.sql',
  '.yml',
  '.yaml',
  '.mjs',
  '.cjs',
  '.txt',
]);

const MOJIBAKE_REGEX = /(?:\u00C3[\u0080-\u00BF]|\u00C2[\u0080-\u00BF]|\u00E2[\u0080-\u00BF]{1,2}|\uFFFD)/g;
const BROKEN_ACCENT_REGEX = /(?:^|[\s"'([{>])\?[a-zà-ÿ]{3,}(?=[\s.,;:!?'"\])}<]|$)/gim;

function isTextFile(filePath) {
  return TEXT_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function walk(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(fullPath, files);
    } else if (isTextFile(fullPath)) {
      files.push(fullPath);
    }
  }
  return files;
}

function lineAndColumn(text, idx) {
  const snippet = text.slice(0, idx);
  const lines = snippet.split('\n');
  return { line: lines.length, column: lines[lines.length - 1].length + 1 };
}

function main() {
  const findings = [];

  for (const relDir of TARGET_DIRS) {
    const dir = path.join(ROOT, relDir);
    if (!fs.existsSync(dir)) continue;

    const files = walk(dir);
    for (const filePath of files) {
      const text = fs.readFileSync(filePath, 'utf8');
      const checks = [
        { label: 'mojibake', regex: MOJIBAKE_REGEX },
        { label: 'broken-accent', regex: BROKEN_ACCENT_REGEX },
      ];

      for (const check of checks) {
        let match;
        while ((match = check.regex.exec(text)) !== null) {
          const markerIndex = match.index + match[0].indexOf('?');
          const index = markerIndex >= match.index ? markerIndex : match.index;
          const { line, column } = lineAndColumn(text, index);
          findings.push(`${path.relative(ROOT, filePath)}:${line}:${column}: [${check.label}] ${match[0].trim()}`);
          if (findings.length >= 200) break;
        }
        check.regex.lastIndex = 0;
        if (findings.length >= 200) break;
      }
      if (findings.length >= 200) break;
    }
    if (findings.length >= 200) break;
  }

  if (findings.length > 0) {
    console.error('Mojibake detected. Examples:');
    for (const finding of findings) console.error(`- ${finding}`);
    process.exit(1);
  }

  console.log('No mojibake markers detected.');
}

main();
