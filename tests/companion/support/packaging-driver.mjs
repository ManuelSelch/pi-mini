import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { cp, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const bundle = join(root, 'src-tauri/target/release/bundle/macos/Pi Mini.app');

export class PackagingDriver {
  async buildAndInstallApp() {
    // test:packaging builds once before running the serial scenarios.
    this.directory = await realpath(await mkdtemp(join(tmpdir(), 'pi-mini-package-')));
    this.installed = join(this.directory, 'Applications', 'Pi Mini.app');
    await cp(bundle, this.installed, { recursive: true });
    this.app = this.installed;
    this.env = { ...process.env, PATH: '/usr/bin:/bin', PI_MINI_NODE: '/nonexistent/node' };
    delete this.env.NODE_PATH;
    delete this.env.NODE_OPTIONS;
  }

  async makeCheckoutAndSystemNodeUnavailable() {
    // Deny all checkout reads without renaming or modifying the user's working tree.
    this.profile = join(this.directory, 'no-checkout.sb');
    const canonicalRoot = await realpath(root);
    await writeFile(this.profile, `(version 1) (allow default) (deny file-read* (subpath ${JSON.stringify(canonicalRoot)}))`);
    assert.throws(() => execFileSync('/usr/bin/sandbox-exec', ['-f', this.profile, '/bin/ls', canonicalRoot], { stdio: 'pipe' }));
    assert.throws(() => execFileSync('/usr/bin/env', ['node', '--version'], { env: this.env, stdio: 'pipe' }));
  }

  async buildAndRelocateApp() {
    await this.buildAndInstallApp();
    const relocated = join(this.directory, 'a different folder', 'Renamed Companion.app');
    await cp(this.app, relocated, { recursive: true });
    await rm(this.app, { recursive: true });
    this.app = relocated;
  }

  async launchInstalledApp() {
    const data = join(this.directory, 'data');
    this.env.PI_MINI_SMOKE_DATA_DIR = data;
    const executable = join(this.app, 'Contents/MacOS/pi-mini');
    const command = this.profile ? '/usr/bin/sandbox-exec' : executable;
    const args = this.profile ? ['-f', this.profile, executable, '--smoke-test'] : ['--smoke-test'];
    this.child = spawn(command, args, { cwd: this.directory, env: this.env, stdio: ['ignore', 'pipe', 'pipe'] });
    this.output = '';
    this.errors = '';
    this.child.stdout.on('data', data => { this.output += data; });
    this.child.stderr.on('data', data => { this.errors += data; });
    this.closed = new Promise((resolve, reject) => {
      this.child.once('error', reject);
      this.child.once('close', code => resolve(code));
    });
    this.backendPids = new Set();
    this.timer = setInterval(() => {
      try {
        const lines = execFileSync('/bin/ps', ['-axo', 'pid=,ppid=,command='], { encoding: 'utf8' }).split('\n');
        for (const line of lines) {
          const match = line.trim().match(/^(\d+)\s+(\d+)\s+(.+)$/);
          if (match && Number(match[2]) === this.child.pid && match[3].includes('/Resources/backend/node'))
            this.backendPids.add(Number(match[1]));
        }
      } catch { /* Process may exit between polls; assertions below require observation. */ }
    }, 20);
    this.deadline = setTimeout(() => this.child.kill('SIGKILL'), 70_000);
  }

  launchRelocatedApp() { return this.launchInstalledApp(); }

  async expectCompanionReadyWithPrivateBackend() {
    assert.equal(await this.closed, 0, this.errors + this.output);
    clearInterval(this.timer);
    clearTimeout(this.deadline);
    const line = this.output.split('\n').find(line => line.startsWith('MINI_REPORT:'));
    assert.ok(line, this.errors + this.output);
    const report = JSON.parse(line.slice('MINI_REPORT:'.length));
    assert.equal(report.error, undefined, JSON.stringify(report));
    assert.equal(report.phase, 'ready');
    assert.ok(report.sessionId);
    assert.ok(this.backendPids.size > 0, 'Must observe an app-bundled Node child');
    await this.expectOwnedBackendStopped();
  }

  async expectStandardPiConfigurationAvailable() {
    const backend = join(this.app, 'Contents/Resources/backend');
    const config = join(backend, 'node_modules/@earendil-works/pi-coding-agent/dist/config.js');
    const probe = `import {getAgentDir} from ${JSON.stringify(new URL('file://' + config).href)}; console.log(getAgentDir());`;
    const actual = execFileSync(join(backend, 'node'), ['--input-type=module', '-e', probe], { cwd: this.directory, env: this.env, encoding: 'utf8' }).trim();
    const { getAgentDir } = await import('@earendil-works/pi-coding-agent');
    assert.equal(actual, getAgentDir(), 'Bundled Pi must use the same user configuration directory, not copy credentials');
  }

  async launchInstalledAppWithUnrelatedService() {
    await this.buildAndInstallApp();
    await this.makeCheckoutAndSystemNodeUnavailable();
    this.service = createServer(socket => socket.end('unrelated service'));
    await new Promise(resolve => this.service.listen(0, '127.0.0.1', resolve));
    this.port = this.service.address().port;
    await this.launchInstalledApp();
  }

  async quitApp() {
    // Startup smoke requests the actual Tauri app.exit path after SDK readiness.
    await this.expectCompanionReadyWithPrivateBackend();
  }

  async expectOwnedBackendStopped() {
    for (const pid of this.backendPids) {
      let stopped = false;
      for (let attempt = 0; attempt < 100; attempt++) {
        try { process.kill(pid, 0); } catch (error) {
          if (error.code !== 'ESRCH') throw error;
          stopped = true;
          break;
        }
        await delay(50);
      }
      assert.ok(stopped, `Owned backend ${pid} must stop`);
    }
  }

  async expectUnrelatedServiceUnaffected() {
    const { createConnection } = await import('node:net');
    const response = await new Promise((resolve, reject) => {
      let text = '';
      const socket = createConnection({ host: '127.0.0.1', port: this.port });
      socket.setTimeout(2000, () => socket.destroy(new Error('Unrelated service timed out')));
      socket.on('data', data => { text += data; });
      socket.once('end', () => resolve(text));
      socket.once('error', reject);
    });
    assert.equal(response, 'unrelated service');
  }

  async dispose() {
    clearInterval(this.timer);
    clearTimeout(this.deadline);
    if (this.child && this.child.exitCode === null && this.child.signalCode === null) {
      this.child.kill('SIGKILL');
      await this.closed;
    }
    if (this.backendPids) await this.expectOwnedBackendStopped();
    if (this.service) await new Promise(resolve => this.service.close(resolve));
    if (this.directory) await rm(this.directory, { recursive: true, force: true });
  }
}
