import { startCompanionHost } from './server';

const dataDirectory = process.env.PI_MINI_DATA_DIR;
if (!dataDirectory) throw new Error('Native host must supply PI_MINI_DATA_DIR.');

const host = await startCompanionHost({ dataDirectory, projectPath: process.env.PI_MINI_PROJECT });
console.log('PI_MINI_READY ' + JSON.stringify(host.info));

let stopping = false;
const stop = async () => {
  if (stopping) return;
  stopping = true;
  const watchdog = setTimeout(() => process.exit(1), 10_000);
  watchdog.unref();
  try { await host.close(); }
  finally { clearTimeout(watchdog); process.exit(0); }
};
process.once('SIGTERM', () => { void stop(); });
process.once('SIGINT', () => { void stop(); });
// A native owner that crashes or is killed closes stdin. Do not orphan the agent.
process.stdin.resume();
process.stdin.once('end', () => { void stop(); });
