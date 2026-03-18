const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TARGET_DIRS = ['app', 'components', 'lib', 'prisma', 'hooks'];
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

const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'build', 'coverage', 'out']);
const MOJIBAKE_MARKER = /(?:\u00C3[\u0080-\u00BF]|\u00C2[\u0080-\u00BF]|\u00E2[\u0080-\u00BF]{1,2}|\uFFFD)/g;

function isTextFile(filePath) {
  return TEXT_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function isBinaryBuffer(buffer) {
  const sample = buffer.subarray(0, Math.min(buffer.length, 4096));
  for (let i = 0; i < sample.length; i += 1) {
    if (sample[i] === 0) return true;
  }
  return false;
}

function mojibakeScore(text) {
  const matches = text.match(MOJIBAKE_MARKER);
  return matches ? matches.length : 0;
}

function decodeLatin1AsUtf8(text) {
  return Buffer.from(text, 'latin1').toString('utf8');
}

function pickBestDecodingFromBuffer(buffer) {
  const utf8Text = buffer.toString('utf8');
  const latin1Text = buffer.toString('latin1');

  const candidates = [
    utf8Text,
    latin1Text,
    decodeLatin1AsUtf8(utf8Text),
    decodeLatin1AsUtf8(decodeLatin1AsUtf8(utf8Text)),
    decodeLatin1AsUtf8(latin1Text),
  ];

  let best = utf8Text;
  let bestScore = mojibakeScore(utf8Text);

  for (const candidate of candidates) {
    const score = mojibakeScore(candidate);
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  return {
    originalScore: mojibakeScore(utf8Text),
    fixedScore: bestScore,
    fixedText: best,
  };
}

function walk(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(fullPath, files);
      continue;
    }
    if (isTextFile(fullPath)) files.push(fullPath);
  }
  return files;
}

function main() {
  let changedFiles = 0;
  let totalImprovement = 0;
  const touched = [];

  for (const relDir of TARGET_DIRS) {
    const dir = path.join(ROOT, relDir);
    if (!fs.existsSync(dir)) continue;

    const files = walk(dir);
    for (const filePath of files) {
      const buffer = fs.readFileSync(filePath);
      if (isBinaryBuffer(buffer)) continue;

      const { originalScore, fixedScore, fixedText } = pickBestDecodingFromBuffer(buffer);
      if (originalScore === 0) continue;
      if (fixedScore >= originalScore) continue;

      fs.writeFileSync(filePath, fixedText, 'utf8');
      changedFiles += 1;
      totalImprovement += originalScore - fixedScore;
      touched.push(`${path.relative(ROOT, filePath)} (${originalScore} -> ${fixedScore})`);
    }
  }

  if (changedFiles === 0) {
    console.log('No mojibake fixes were necessary.');
    process.exit(0);
  }

  console.log(`Fixed mojibake in ${changedFiles} files.`);
  console.log(`Total score improvement: ${totalImprovement}.`);
  console.log('Files changed:');
  for (const line of touched) console.log(`- ${line}`);
}

main();
