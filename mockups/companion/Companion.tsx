import { useEffect, useState } from 'react';
import { Badge, Button } from '@mantine/core';
import { IconArrowUpRight, IconMessageCircle, IconSparkles } from '@tabler/icons-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { native, closeWindow, openFullChat, resizeCompanion, setPinned } from './native';
import { useDemoSession } from './use-demo-session';
import { Composer } from './Composer';
import { Conversation } from './Conversation';
import { FullChatPreview } from './FullChatPreview';
import { WindowHeader } from './WindowHeader';
import { ResizeHandles } from './ResizeHandles';

export function Companion() {
  const demo = useDemoSession();
  const full = new URLSearchParams(location.search).get('view') === 'pi-chat';
  const [pinned, setPin] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [history, setHistory] = useState(false);
  const [error, setError] = useState('');
  const [resizing, setResizing] = useState(false);
  const [handoff, setHandoff] = useState(false);
  const reportError = (e: unknown) => setError(String(e));

  useEffect(() => {
    if (native && !full) void getCurrentWindow().isAlwaysOnTop().then(setPin).catch(reportError);
  }, [full]);
  useEffect(() => {
    document.title = full ? 'Pi Chat · Handoff preview' : 'Pi companion · Demo';
  }, [full]);

  const changeSize = async (next: boolean) => {
    if (resizing) return;
    setResizing(true);
    try { await resizeCompanion(next); setCollapsed(next); }
    catch (e) { reportError(e); }
    finally { setResizing(false); }
  };
  const openChat = async () => {
    if (handoff) return;
    setHandoff(true); setError('');
    try { await openFullChat(demo.session); }
    catch (e) { reportError(e); }
    finally { setHandoff(false); }
  };
  const pin = async () => {
    try { setPin(await setPinned(!pinned)); }
    catch (e) { reportError(e); }
  };
  if (full) return <><FullChatPreview {...demo} onSend={demo.send} onStop={demo.cancel} onStartRouter={demo.startRouter} onNew={demo.newChat} onError={reportError}/>{error && <div className="error-banner" role="alert">{error}</div>}</>;
  return <div className={'companion-shell' + (collapsed ? ' collapsed' : '') + (!native ? ' browser-shell' : '')}>
    <WindowHeader title={demo.session.title} pinned={pinned} collapsed={collapsed} busy={demo.busy} onPin={() => void pin()} onCollapse={() => void changeSize(true)} onExpand={() => void changeSize(false)} onOpenChat={() => void openChat()} onNew={demo.newChat} onClose={() => {
      if (native) void closeWindow().catch(reportError);
      else void changeSize(true);
    }} onError={reportError}/>
    {!collapsed && <>
      <div className="session-bar"><IconMessageCircle size={13}/><span>{demo.session.title}</span><Badge variant="light" size="xs" color="gray">{demo.session.guided ? 'Guided' : 'Chat'}</Badge></div>
      {error && <div className="error-banner" role="alert">{error}</div>}
      <Conversation {...demo} history={history} onHistory={() => setHistory(!history)} onSend={demo.send} onStartRouter={demo.startRouter}/>
      <div className="handoff-row">
        <Button variant="subtle" color="gray" size="compact-xs" leftSection={<IconArrowUpRight size={13}/>} onClick={() => void openChat()} disabled={demo.busy} loading={handoff}>Open in Pi Chat</Button>
        <span>same conversation</span>
      </div>
      <Composer busy={demo.busy} onSend={demo.send} onStop={demo.cancel}/>
    </>}
    {!collapsed && <ResizeHandles onError={reportError}/>}
    {!native && <div className="browser-note"><IconSparkles size={12}/>Browser preview · native window controls work in Tauri</div>}
  </div>;
}
