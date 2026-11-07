import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { once } from 'node:events';
import { getAgentDir, SessionManager } from '@earendil-works/pi-coding-agent';
import { createPiServer, type RuntimeAdapterFactory } from '@manuelselch/pi-server';
import { createCompanionRuntimeFactory } from './runtime';

export interface HostOptions {
  dataDirectory: string;
  projectPath?: string;
  runtimeFactory?: RuntimeAdapterFactory;
  discoverProjects?: boolean;
}

export async function importKnownProjects(metadataFile: string, agentDirectory = getAgentDir(), listSessions: () => Promise<readonly { cwd?: string }[]> = () => SessionManager.listAll()): Promise<void> {
  const readMetadata = async (path: string): Promise<Record<string, unknown>> => {
    try { return JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>; }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {}; throw error; }
  };
  const [normal, companion, sessions] = await Promise.all([
    readMetadata(join(agentDirectory, 'pi-chat', 'projects.json')),
    readMetadata(metadataFile),
    listSessions(),
  ]);
  const paths = [...(Array.isArray(normal.pins) ? normal.pins : []), ...sessions.map((session) => session.cwd)];
  const known = await Promise.all(paths.filter((path): path is string => typeof path === 'string').map((path) => realpath(path).catch(() => undefined)));
  const pins = [...new Set([...(Array.isArray(companion.pins) ? companion.pins.filter((path): path is string => typeof path === 'string') : []), ...known.filter((path): path is string => Boolean(path))])];
  await writeFile(metadataFile, JSON.stringify({ version: 1, archives: [], removedProjects: [], ...companion, pins }), { mode: 0o600 });
}

export async function startCompanionHost(options: HostOptions) {
  await mkdir(options.dataDirectory, { recursive: true, mode: 0o700 });
  const dataDirectory = await realpath(options.dataDirectory);
  const sessionsDirectory = join(dataDirectory, 'sessions');
  await mkdir(sessionsDirectory, { recursive: true, mode: 0o700 });
  const projectPath = await realpath(options.projectPath ?? homedir());
  if (options.discoverProjects !== false) await importKnownProjects(join(dataDirectory, 'projects.json'));
  const server = createPiServer({
    runtimeFactory: options.runtimeFactory ?? createCompanionRuntimeFactory({ projectPath, sessionsDirectory }),
    catalogue: {
      sessionsDirectory, metadataFile: join(dataDirectory, 'projects.json'),
      // sessionsDirectory configures archive storage, not the default history lister.
      // Supplying this explicitly prevents scans of the normal Pi Chat history.
      lister: { listAll: () => SessionManager.listAll(sessionsDirectory) },
      discovery: { forDirectory: async () => undefined },
    },
  });
  try {
    server.httpServer.listen(0, '127.0.0.1');
    await once(server.httpServer, 'listening');
    const address = server.httpServer.address();
    if (!address || typeof address === 'string') throw new Error('Expected a private loopback listener.');
    return {
      ...server,
      info: { endpoint: `ws://127.0.0.1:${address.port}/ws`, projectPath },
      storage: { dataDirectory, sessionsDirectory, metadataFile: join(dataDirectory, 'projects.json') },
    };
  } catch (error) {
    await server.close();
    throw error;
  }
}
