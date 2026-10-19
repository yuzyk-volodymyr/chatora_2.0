import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const publicDir = resolve('.output/public');
const shellPath = resolve(publicDir, '_shell.html');
const indexPath = resolve(publicDir, 'index.html');

if (!existsSync(shellPath)) {
  throw new Error(`TanStack Start shell not found: ${shellPath}`);
}

copyFileSync(shellPath, indexPath);
