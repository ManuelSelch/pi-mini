import { mkdir, realpath } from 'node:fs/promises';
import { join } from 'node:path';
import { once } from 'node:events';
import { SessionManager } from '@earendil-works/pi-coding-agent';
import { createPiServer, type RuntimeAdapterFactory } from '@manuelselch/pi-server';
import { createCompanionRuntimeFactory } from './runtime';

export interface HostOptions {
  dataDirectory: string;
  projectPath?: string;
  runtimeFactory?: RuntimeAdapterFactory;
}

export async function startCompanionHost(options: HostOptions) {
  await mkdir(options.dataDirectory, { recursive: true, mode: 0o700 });
  const dataDirectory = await realpath(options.dataDirectory);
  const sessionsDirectory = join(dataDirectory, 'sessions');
  await mkdir(sessionsDirectory, { recursive: true, mode: 0o700 });
  const workspace = options.projectPath ?? join(dataDirectory, 'workspace');
  if (!options.projectPath) await mkdir(workspace, { recursive: true, mode: 0o700 });
  const projectPath = await realpath(workspace);
  const server = createPiServer({
    runtimeFactory: options.runtimeFactory ?? createCompanionRuntimeFactory({ projectPath, sessionsDirectory }),
    catalogue: {
      sessionsDirectory, metadataFile: join(dataDirectory, 'projects.json'), homeDirectory: null,
      // sessionsDirectory configures archive storage, not the default history lister.
      // Supplying this explicitly prevents scans of the normal Pi Chat history.
      lister: { listAll: () => SessionManager.list(projectPath, sessionsDirectory) },
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
