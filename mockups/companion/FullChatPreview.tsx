import { Badge, Button } from '@mantine/core';
import { IconArrowLeft, IconMessage, IconPlus, IconSparkles } from '@tabler/icons-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { native } from './native';
import { Composer } from './Composer';
import { Conversation } from './Conversation';
import type { Session } from './demo';

type Props = { session: Session; busy: boolean; onSend: (text: string) => void; onStop: () => void; onStartRouter: () => void; onNew: () => void; onError: (error: unknown) => void };
export function FullChatPreview(p: Props) {
  const back = async () => {
    if (native) {
      const companion = await WebviewWindow.getByLabel('main');
      await companion?.show();
      await companion?.setFocus();
      await getCurrentWindow().close();
      return;
    }
    window.close();
  };
  return <div className="full-chat">
    <aside className="preview-sidebar">
      <div className="preview-brand"><IconSparkles size={20}/><strong>Pi Chat</strong><Badge size="xs" variant="light" color="gray">PREVIEW</Badge></div>
      <Button size="xs" variant="default" leftSection={<IconPlus size={13}/>} onClick={p.onNew}>New conversation</Button>
      <div className="sidebar-caption">CONVERSATIONS</div>
      <div className="sidebar-session"><IconMessage size={15}/><span>{p.session.title}</span><i/></div>
      <div className="sidebar-bottom">Mock destination<br/>Not your real Pi Chat application</div>
    </aside>
    <section className="preview-main">
      <div className="preview-banner"><span>Handoff preview · same demo conversation in both windows</span><Button variant="subtle" size="compact-xs" leftSection={<IconArrowLeft size={12}/>} onClick={() => void back().catch(p.onError)}>Back to companion</Button></div>
      <div className="preview-title"><span className="eyebrow">FROM PI COMPANION</span><h1>{p.session.title}</h1><span className="session-reference">Session {p.session.id.slice(0, 8)} · simulated session identity</span></div>
      <Conversation session={p.session} busy={p.busy} onSend={p.onSend} onStartRouter={p.onStartRouter} full/>
      <Composer busy={p.busy} onSend={p.onSend} onStop={p.onStop} full/>
    </section>
  </div>;
}
