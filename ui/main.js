const { invoke } = window.__TAURI__.core;
const { getCurrentWindow } = window.__TAURI__.window;
const { LogicalSize, PhysicalPosition } = window.__TAURI__.dpi;
const nativeWindow = getCurrentWindow();
const pin = document.querySelector('#pin');
const status = document.querySelector('#status');

function showError(error) {
  status.textContent = 'Native window error: ' + String(error);
}

async function syncPin() {
  const pinned = await nativeWindow.isAlwaysOnTop();
  pin.setAttribute('aria-pressed', String(pinned));
  pin.textContent = pinned ? 'Pinned' : 'Unpinned';
  status.textContent = pinned ? 'Always on top · enabled' : 'Normal window · pin to keep above apps';
  return pinned;
}

async function togglePin() {
  pin.disabled = true;
  try {
    await nativeWindow.setAlwaysOnTop(!(await nativeWindow.isAlwaysOnTop()));
    return await syncPin();
  } finally {
    pin.disabled = false;
  }
}

pin.addEventListener('click', () => togglePin().catch(showError));
document.querySelector('#close').addEventListener('click', () => nativeWindow.close().catch(showError));
document.querySelector('#drag-handle').addEventListener('mousedown', (event) => {
  if (event.button !== 0 || event.target.closest('button')) return;
  nativeWindow.startDragging().catch(showError);
});
for (const edge of document.querySelectorAll('[data-edge]')) {
  edge.addEventListener('mousedown', (event) => {
    if (event.button !== 0) return;
    nativeWindow.startResizeDragging(edge.dataset.edge).catch(showError);
  });
}

async function waitFor(read, matches) {
  const deadline = Date.now() + 4000;
  while (Date.now() < deadline) {
    const value = await read();
    if (matches(value)) return value;
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
  throw new Error('Native window bounds did not settle');
}

async function smokeTest() {
  const scale = await nativeWindow.scaleFactor();
  const size = await nativeWindow.innerSize();
  const initial = { width: size.width / scale, height: size.height / scale, pinned: await nativeWindow.isAlwaysOnTop() };
  const afterUnpin = await togglePin();
  const unpinLabel = pin.textContent;
  const afterRepin = await togglePin();
  const repinLabel = pin.textContent;
  const position = await nativeWindow.outerPosition();
  const target = new PhysicalPosition(position.x + 24, position.y + 24);
  await nativeWindow.setPosition(target);
  const moved = await waitFor(() => nativeWindow.outerPosition(), (p) => Math.abs(p.x - target.x) <= 2 && Math.abs(p.y - target.y) <= 2);
  await nativeWindow.setSize(new LogicalSize(380, 340));
  const resized = await waitFor(() => nativeWindow.innerSize(), (s) => Math.abs(s.width / scale - 380) <= 1 && Math.abs(s.height / scale - 340) <= 1);
  return {
    initial, afterUnpin, afterRepin, unpinLabel, repinLabel,
    movable: moved.x !== position.x && moved.y !== position.y,
    resizable: await nativeWindow.isResizable(),
    resized: { width: resized.width / scale, height: resized.height / scale }
  };
}

async function start() {
  try {
    await syncPin();
    pin.disabled = false;
    if (await invoke('smoke_requested')) {
      let report;
      try { report = await smokeTest(); }
      catch (error) { report = { error: String(error) }; }
      await invoke('finish_smoke', { report });
    }
  } catch (error) {
    showError(error);
    if (await invoke('smoke_requested')) await invoke('finish_smoke', { report: { error: String(error) } });
  }
}
start();
