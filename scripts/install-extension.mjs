import { mkdir, copyFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { getAgentDir } from '@earendil-works/pi-coding-agent';

const directory = join(getAgentDir(), 'extensions', 'pi-mini');
try {
  await access(directory);
  throw new Error(`Refusing to overwrite ${directory}. Remove the existing installation explicitly before reinstalling.`);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
await mkdir(directory, { recursive: true });
await copyFile(new URL('../dist-extension/index.js', import.meta.url), join(directory, 'index.js'));
await writeFile(join(directory, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
console.log(`Installed Pi Mini extension in ${directory}. New shared-server sessions load it; existing sessions need /reload.`);
