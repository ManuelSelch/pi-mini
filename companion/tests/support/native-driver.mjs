import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export class NativeDriver {
  #report;

  async launch({ model = false } = {}) {
    const directory = await realpath(await mkdtemp(join(tmpdir(), 'pi-mini-native-')));
    const executable = fileURLToPath(new URL('../../src-tauri/target/debug/pi-mini', import.meta.url));
    const child = spawn(executable, [model ? '--model-smoke' : '--smoke-test'], { env: { ...process.env, PI_MINI_SMOKE_DATA_DIR: directory }, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (data) => { stdout = (stdout + data.toString()).slice(-1_000_000); });
    child.stderr.on('data', (data) => { stderr = (stderr + data.toString()).slice(-1_000_000); });
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, model ? 150_000 : 70_000);
    try {
      const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('close', resolve); });
      assert.equal(timedOut, false, `Native startup timed out. ${stderr}`);
      const line = stdout.split('\n').find((line) => line.startsWith('MINI_REPORT:'));
      assert.ok(line, `No WebView report. ${stderr}\n${stdout}`);
      this.#report = JSON.parse(line.slice('MINI_REPORT:'.length));
      assert.equal(code, 0, JSON.stringify(this.#report) + '\n' + stderr);
      assert.equal(this.#report.error, undefined);
    } finally {
      clearTimeout(timer);
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
      // Native owner stdin EOF shuts down its backend, including on abnormal owner exit.
      await rm(directory, { recursive: true, force: true });
    }
  }

  expectFixedCompanionWindow() {
    assert.equal(this.#report.width, 360);
    assert.equal(this.#report.height, 380);
    assert.equal(this.#report.resizable, false);
  }

  expectRealSessionReady() {
    assert.equal(this.#report.phase, 'ready');
    assert.equal(typeof this.#report.sessionId, 'string');
    assert.ok(this.#report.sessionId.length > 0);
  }

  expectModelResponse() {
    assert.equal(typeof this.#report.response, 'string');
    assert.ok(this.#report.response.trim().length > 0);
    return this.#report.response;
  }
}
