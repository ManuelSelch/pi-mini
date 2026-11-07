import { createInterface } from 'node:readline';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { startCompanionHost } from '../../src/conversation/infra/host/server';
import { ControlledRuntime } from './controlled-runtime';

// Explicit test executable, never selected by a normal launch. No model access.
const dataDirectory = process.env.PI_MINI_DATA_DIR;
if (!dataDirectory) throw new Error('Lifecycle fixture requires private storage.');
let runtime: ControlledRuntime | undefined;
const projectPath = join(dataDirectory, 'workspace');
await mkdir(projectPath, { recursive: true });
const host = await startCompanionHost({ dataDirectory, projectPath, discoverProjects: false, runtimeFactory: {
  newSession: async (projectPath) => {
    runtime = new ControlledRuntime('native-lifecycle', projectPath, host.storage.sessionsDirectory);
    const prompt = runtime.prompt.bind(runtime);
    runtime.prompt = (message) => {
      const result = prompt(message);
      console.log('PI_MINI_FIXTURE_SENT ' + JSON.stringify({ message }));
      return result;
    };
    return runtime;
  },
  continueProject: async () => { throw new Error('Unexpected continue'); },
  openSession: async () => { throw new Error('Unexpected open'); },
} });
console.log('PI_MINI_READY ' + JSON.stringify(host.info));
const input = createInterface({ input: process.stdin });
input.on('line', (line) => {
  const command: unknown = JSON.parse(line);
  if (!command || typeof command !== 'object' || !('action' in command)) return;
  if (command.action === 'finishAgent' && 'text' in command && typeof command.text === 'string') void runtime?.finish(command.text);
});
let closing = false;
const close = async () => {
  if (closing) return;
  closing = true;
  try { await host.close(); }
  finally { process.exit(0); }
};
input.on('close', () => { void close(); });
process.once('SIGTERM', () => { void close(); });
process.once('SIGINT', () => { void close(); });
