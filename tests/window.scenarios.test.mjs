import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

class FloatingWindowDriver {
  #report;

  async launch() {
    const executable = fileURLToPath(new URL('../src-tauri/target/debug/tauri-floating-spike', import.meta.url));
    const result = spawnSync(executable, ['--smoke-test'], { encoding: 'utf8', timeout: 45000 });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr + result.stdout);
    const line = result.stdout.split('\n').find((line) => line.startsWith('SPIKE_REPORT:'));
    assert.ok(line, 'Expected a native-window smoke report');
    this.#report = JSON.parse(line.slice('SPIKE_REPORT:'.length));
    assert.equal(this.#report.error, undefined);
  }

  async expectCompactWindow() {
    assert.equal(this.#report.initial.width, 340);
    assert.equal(this.#report.initial.height, 300);
  }

  async expectAlwaysOnTop(expected) {
    assert.equal(this.#report.initial.pinned, expected);
  }

  async expectPinCanBeDisabledAndReenabled() {
    // The real WebView runs the shared UI toggle handler twice on one native window.
    assert.equal(this.#report.afterUnpin, false);
    assert.equal(this.#report.unpinLabel, 'Unpinned');

    assert.equal(this.#report.afterRepin, true);
    assert.equal(this.#report.repinLabel, 'Pinned');
  }

  async expectMovableAndResizable() {
    assert.equal(this.#report.movable, true);
    assert.equal(this.#report.resizable, true);
    assert.deepEqual(this.#report.resized, { width: 380, height: 340 });
  }
}

test('opens a compact window pinned above ordinary windows', async () => {
  const window = new FloatingWindowDriver();
  await window.launch();

  await window.expectCompactWindow();
  await window.expectAlwaysOnTop(true);
});

test('allows switching always-on-top off and back on', async () => {
  const window = new FloatingWindowDriver();
  await window.launch();

  await window.expectPinCanBeDisabledAndReenabled();
});

test('can be repositioned and resized', async () => {
  const window = new FloatingWindowDriver();
  await window.launch();

  await window.expectMovableAndResizable();
});
