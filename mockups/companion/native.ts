import { isTauri } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { LogicalSize, PhysicalPosition } from '@tauri-apps/api/dpi';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { emit } from '@tauri-apps/api/event';
import type { Session } from './demo';

export const native = isTauri();
export async function dragWindow() {
  if (native) await getCurrentWindow().startDragging();
}
let expandedSize = new LogicalSize(360, 380);
export async function resizeCompanion(collapsed: boolean) {
  if (!native) return;
  const win = getCurrentWindow();
  const scale = await win.scaleFactor();
  const size = await win.innerSize();
  const position = await win.outerPosition();
  if (collapsed) expandedSize = new LogicalSize(size.width / scale, size.height / scale);
  const target = collapsed ? new LogicalSize(280, 44) : expandedSize;
  await win.setResizable(true);
  await win.setMinSize(new LogicalSize(280, 44));
  await win.setSize(target);
  await win.setPosition(new PhysicalPosition(Math.round(position.x + size.width - target.width * scale), position.y));
  if (!collapsed) await win.setMinSize(new LogicalSize(320, 320));
  await win.setResizable(!collapsed);
}

export async function openFullChat(session: Session) {
  const query = new URLSearchParams({ view: 'pi-chat', snapshot: JSON.stringify(session) });
  if (!native) {
    const url = new URL('index.html', location.href);
    url.search = query.toString();
    window.open(url, 'pi-chat-clickdummy');
    return;
  }
  const existing = await WebviewWindow.getByLabel('pi-chat-preview');
  if (existing) {
    await emit('companion-demo-session', { source: 'handoff', session });
    await existing.show();
    await existing.setFocus();
    return;
  }
  const preview = new WebviewWindow('pi-chat-preview', {
    url: 'companion/index.html?' + query,
    title: 'Pi Chat · Handoff mockup',
    width: 1040, height: 720, minWidth: 680, minHeight: 480,
    center: true,
  });
  await new Promise<void>((resolve, reject) => {
    void preview.once('tauri://created', () => resolve());
    void preview.once('tauri://error', (event) => reject(new Error(String(event.payload))));
  });
}
