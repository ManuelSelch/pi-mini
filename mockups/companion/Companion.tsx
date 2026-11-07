import { useEffect, useState } from 'react';
import { IconSparkles } from '@tabler/icons-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { native, openFullChat, resizeCompanion } from './native';
import { useDemoSession } from './use-demo-session';
import { Composer } from './Composer';
import { Conversation } from './Conversation';
import { FullChatPreview } from './FullChatPreview';
import { WindowHeader } from './WindowHeader';
import { ResizeHandles } from './ResizeHandles';

export function Companion() {
  const demo = useDemoSession();
  const full = new URLSearchParams(location.search).get('view') === 'pi-chat';
  const [collapsed, setCollapsed] = useState(false);
  const [history, setHistory] = useState(false);
  const [error, setError] = useState('');
  const [resizing, setResizing] = useState(false);
  const [handoff, setHandoff] = useState(false);
  const reportError = (e: unknown) => setError(String(e));

  useEffect(() => {
    if (native && !full) void getCurrentWindow().setAlwaysOnTop(true).catch(reportError);
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
  if (full) return <><FullChatPreview {...demo} onSend={demo.send} onStop={demo.cancel} onStartRouter={demo.startRouter} onNew={demo.newChat} onError={reportError}/>{error && <div className="error-banner" role="alert">{error}</div>}</>;
  return <div className={'companion-shell' + (collapsed ? ' collapsed' : '') + (!native ? ' browser-shell' : '')}>
    <WindowHeader title={demo.session.title} collapsed={collapsed} busy={demo.busy} opening={handoff} onCollapse={() => void changeSize(true)} onExpand={() => void changeSize(false)} onOpenChat={() => void openChat()} onError={reportError}/>
    {!collapsed && <>
      {error && <div className="error-banner" role="alert">{error}</div>}
      <Conversation {...demo} history={history} onHistory={() => setHistory(!history)} onSend={demo.send} onStartRouter={demo.startRouter}/>
      <Composer busy={demo.busy} onSend={demo.send} onStop={demo.cancel}/>
    </>}
    {!collapsed && <ResizeHandles onError={reportError}/>}
    {!native && <div className="browser-note"><IconSparkles size={12}/>Browser preview · native window controls work in Tauri</div>}
  </div>;
}
