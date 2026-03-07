const fs = require('fs');
const path = require('path');

const nextDir = path.join(process.cwd(), '.next');

const safeRemove = (target) => {
  try {
    fs.rmSync(target, {recursive: true, force: true});
    return true;
  } catch (error) {
    if (error && (error.code === 'EBUSY' || error.code === 'EPERM')) {
      console.warn(`Skipped locked path: ${target}`);
      return false;
    }
    throw error;
  }
};

if (!fs.existsSync(nextDir)) {
  console.log('No .next folder to clean.');
  process.exit(0);
}

if (safeRemove(nextDir)) {
  console.log('Cleaned .next');
  process.exit(0);
}

// Fallback: remove hot-cache/build artifacts even if standalone is locked by another process.
const fallbackPaths = [
  'cache',
  'server',
  'static',
  'types',
  'trace',
  'BUILD_ID',
  'app-build-manifest.json',
  'build-manifest.json',
  'prerender-manifest.json',
  'react-loadable-manifest.json',
  'routes-manifest.json',
];

for (const relativePath of fallbackPaths) {
  const targetPath = path.join(nextDir, relativePath);
  if (fs.existsSync(targetPath)) {
    safeRemove(targetPath);
  }
}

console.log('Cleaned .next build artifacts (with locked paths skipped).');
