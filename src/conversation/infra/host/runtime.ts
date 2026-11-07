import { mkdir, realpath, stat } from 'node:fs/promises';
import { dirname, join, relative, isAbsolute } from 'node:path';
import {
  createAgentSessionFromServices, createAgentSessionRuntime, createAgentSessionServices,
  createCodemodeExtension, createToolSearchExtension, createMcpExtension,
  getAgentDir, SessionManager,
  type AgentSessionRuntime, type CreateAgentSessionRuntimeFactory,
} from '@earendil-works/pi-coding-agent';
import { createPiRuntimeAdapter, type RuntimeAdapterFactory } from '@manuelselch/pi-server';
import { companionInstructions } from './instructions';

export interface RuntimeOptions {
  projectPath: string;
  sessionsDirectory: string;
  agentDirectory?: string;
}

export async function createCompanionAgentRuntime(options: RuntimeOptions, manager: SessionManager): Promise<AgentSessionRuntime> {
  const agentDir = options.agentDirectory ?? getAgentDir();
  const factory: CreateAgentSessionRuntimeFactory = async ({ cwd, sessionManager, sessionStartEvent }) => {
    const services = await createAgentSessionServices({
      cwd, agentDir,
      resourceLoaderOptions: {
        extensionFactories: [createCodemodeExtension(), createToolSearchExtension(), createMcpExtension()],
        appendSystemPromptOverride: (base) => [...base, companionInstructions],
      },
    });
    return {
      ...await createAgentSessionFromServices({ services, sessionManager, sessionStartEvent }),
      services, diagnostics: services.diagnostics,
    };
  };
  return createAgentSessionRuntime(factory, { cwd: manager.getCwd(), agentDir, sessionManager: manager });
}

export function createCompanionRuntimeFactory(options: RuntimeOptions): RuntimeAdapterFactory {
  const attach = async (manager: SessionManager) => {
    const runtime = await createCompanionAgentRuntime(options, manager);
    const adapter = createPiRuntimeAdapter(runtime);
    try {
      await runtime.session.bindExtensions({ uiContext: adapter.uiContext(), mode: 'rpc' });
      return adapter;
    } catch (error) {
      await adapter.dispose();
      throw error;
    }
  };
  const create = async (projectPath: string) => {
    const canonical = await realpath(projectPath);
    if (!(await stat(canonical)).isDirectory()) throw new Error('Project path must be a directory.');
    await mkdir(options.sessionsDirectory, { recursive: true, mode: 0o700 });
    return attach(SessionManager.create(canonical, options.sessionsDirectory));
  };
  return {
    newSession: create,
    continueProject: create,
    openSession: async (sessionPath) => {
      const canonical = await realpath(sessionPath);
      const root = await realpath(options.sessionsDirectory);
      const child = relative(root, canonical);
      if (!child || child.startsWith('..') || isAbsolute(child)) throw new Error('Session is outside companion storage.');
      if (dirname(canonical) !== root) throw new Error('Session is outside companion storage.');
      const manager = SessionManager.open(canonical, options.sessionsDirectory);
      return attach(manager);
    },
  };
}
