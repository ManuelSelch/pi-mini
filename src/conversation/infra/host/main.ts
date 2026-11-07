import { sharedServerInfo } from './shared-server';

// This helper discovers/probes the existing service. It never starts or stops it.
const info = await sharedServerInfo(process.env.PI_MINI_ENDPOINT, process.env.PI_MINI_PROJECT);
console.log('PI_MINI_READY ' + JSON.stringify(info));
process.stdin.resume();
process.stdin.once('end', () => process.exit(0));
