import esbuild from 'esbuild';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure dist/server exists
const outDir = path.resolve(__dirname, '../dist/server');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

console.log('Bundling local-ffmpeg-server.js...');

esbuild.build({
  entryPoints: [path.resolve(__dirname, 'local-ffmpeg-server.js')],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: path.join(outDir, 'server.js'),
  external: [
    'electron',
    'ffmpeg-static',
    'ffprobe-static',
    'npx', // Used for spawning remotion
    'remotion', // Remotion CLI
  ],
  format: 'esm', // Use ESM output since the project is type: module
  banner: {
    js: `
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
`,
  },
  loader: {
    '.node': 'file',
  },
}).then(() => {
  console.log('Server bundling complete: dist/server/server.js');
}).catch((err) => {
  console.error('Bundling failed:', err);
  process.exit(1);
});
