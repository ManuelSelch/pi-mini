import { realpath } from 'node:fs/promises';
import { homedir } from 'node:os';

export async function sharedServerInfo(
  endpoint = 'ws://127.0.0.1:8788/ws',
  projectPath = homedir(),
) {
  const url = new URL(endpoint);
  if (
    url.protocol !== 'ws:' ||
    url.hostname !== '127.0.0.1' ||
    url.pathname !== '/ws' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error('PI_MINI_ENDPOINT must be a private ws://127.0.0.1:<port>/ws endpoint.');
  const health = new URL('/health', url);
  health.protocol = 'http:';
  try {
    const response = await fetch(health, { signal: AbortSignal.timeout(3000), redirect: 'error' });
    if (!response.ok) throw new Error(`Health check returned ${response.status}`);
  } catch (error) {
    throw new Error(
      `Pi Chat server unavailable at ${endpoint}. Start Pi Chat's server before launching Pi Mini.`,
      { cause: error },
    );
  }
  return { endpoint: url.href, projectPath: await realpath(projectPath), shared: true };
}
