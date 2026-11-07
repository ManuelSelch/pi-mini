import { useEffect, useRef, useState } from 'react';
import { ActionIcon, Button, Textarea, UnstyledButton } from '@mantine/core';
import { IconPlayerStop } from '@tabler/icons-react';
import { MvpConversation, type Prompt } from './MvpConversation';

type State = 'idle' | 'thinking' | 'running' | 'select' | 'confirm' | 'input' | 'error' | 'reconnecting' | 'superseded' | 'transferred' | 'empty';
const states: State[] = ['idle', 'thinking', 'running', 'select', 'confirm', 'input', 'error', 'reconnecting', 'superseded', 'transferred', 'empty'];
const initial = new URLSearchParams(location.search).get('state');
const initialState: State = states.includes(initial as State) ? initial as State : 'idle';
const answer = 'Join the router’s Wi-Fi using the network name on its label.\n\nKeep the password private.';
const prompts: Partial<Record<State, Prompt>> = {
  select: { kind: 'select', title: 'How are you connecting?', options: ['Wi-Fi', 'Ethernet', 'Not sure'] },
  confirm: { kind: 'confirm', title: 'May I check your network settings?' },
  input: { kind: 'input', title: 'What model is your router?' },
};

export function MvpCompanion() {
  const [state, setState] = useState<State>(initialState);
  const [text, setText] = useState(initialState === 'empty' ? '' : answer);
  const [draft, setDraft] = useState('');
  const [hidden, setHidden] = useState(false);
  const [notice, setNotice] = useState('');
  const composer = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prompt = prompts[state];
  const busy = state === 'thinking' || state === 'running';
  const inactive = ['reconnecting', 'superseded', 'transferred'].includes(state);
  const canSend = !busy && !inactive;
  const status = prompt ? 'Waiting for your answer' : ({
    idle: 'Ready', thinking: 'Thinking…', running: 'Running · checking connection', error: 'Reply failed',
    reconnecting: 'Reconnecting…', superseded: 'Control moved to another app',
    transferred: 'Pi Chat has control', empty: 'Ready',
  } as Partial<Record<State, string>>)[state];

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => {
    if (!hidden && !inactive) composer.current?.focus();
  }, [hidden, inactive, prompt?.kind]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setHidden(true); }
      if (event.code === 'Space' && event.ctrlKey && event.altKey) {
        event.preventDefault(); setHidden((value) => !value);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);

  const send = (message: string) => {
    if (!message.trim() || !canSend || prompt?.kind === 'select' || prompt?.kind === 'confirm') return;
    if (prompt) {
      setNotice('Required answer submitted · simulated prompt.answer');
      setState('idle');
      setDraft('');
      return;
    }
    setNotice(`Normal user message: “${message}” · simulated`);
    setDraft('');
    setState('thinking');
    timer.current = setTimeout(() => {
      timer.current = null;
      setText(message === 'Explain'
        ? 'Your laptop needs to be on the router’s own network to reach its local setup page. The internet does not need to be working yet.\n\nDo not share the password here.'
        : 'This is a visual prototype, not a live agent response. Your message would be sent normally in the real companion.');
      setState('idle');
    }, 900);
  };
  const answerQuestion = (value: string) => {
    setNotice(`Required ${value === 'Cancel' ? 'cancellation' : 'answer'} submitted · simulated prompt.answer`);
    setState('idle');
    setDraft('');
  };
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setState('idle');
    setNotice('Stopped · response and session retained');
  };

  return <>
    <aside className="review-controls" aria-label="Prototype states">
      <strong>MVP interface review</strong>
      <span>Simulated states · no SDK or backend</span>
      <div>{states.map((value) => <a key={value} href={'?state=' + value} aria-current={state === value ? 'page' : undefined}>{value}</a>)}</div>
      <p>Escape hides. ⌃⌥Space toggles while this page is focused.<br/>Global/background behavior requires the native app.</p>
      {notice && <p className="review-notice" role="status">{notice}</p>}
    </aside>
    {hidden ? <Button className="restore-companion" variant="default" onClick={() => setHidden(false)}>Show companion · ⌃⌥Space</Button>
      : <div className="companion-shell browser-shell mvp-shell">
        <header className="window-header">
          <span className={'mvp-status-dot ' + state} role="status" aria-live="polite" title={status}><span className="visually-hidden">{status}</span></span>
          {text && <UnstyledButton className="session-title session-link" aria-label="Open Router setup in Pi Chat and transfer control" title="Open in Pi Chat · transfer control" disabled={busy || Boolean(prompt) || inactive} onClick={() => { setState('transferred'); setNotice('Handoff simulated only. Real Pi Chat needs a new session-opening entry contract.'); }}>Router setup</UnstyledButton>}
        </header>
        <div className="companion-content">
          {state === 'error' && <div className="error-banner" role="alert">Provider unavailable. Your last response is still here. Try sending again.</div>}
          {state === 'superseded' && <div className="control-notice"><Button variant="default" size="compact-xs" onClick={() => { setState('idle'); setNotice('Explicit takeover · simulated'); }}>Take control</Button></div>}
          <MvpConversation text={text} prompt={prompt} canSend={canSend} onAnswer={answerQuestion} onSend={send}/>
          {state === 'transferred' && <div className="control-notice transferred-actions"><Button variant="default" size="compact-xs" onClick={() => { setState('idle'); setNotice('Explicit return of control · simulated'); }}>Take control here</Button></div>}
          <div className="composer-wrap">
            <div className="composer">
              <Textarea ref={composer} aria-label={prompt?.kind === 'input' ? prompt.title : 'Message Pi'} placeholder={prompt?.kind === 'input' ? 'Your answer…' : 'Ask…'} disabled={inactive || prompt?.kind === 'select' || prompt?.kind === 'confirm'} autosize minRows={1} maxRows={3} variant="unstyled" value={draft} onChange={(e) => setDraft(e.currentTarget.value)} onKeyDown={(e) => {
                if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
                e.preventDefault(); send(draft);
              }}/>
              {busy && <ActionIcon className="stop-button" variant="subtle" color="gray" radius="md" size={24} aria-label="Stop reply" onClick={stop}><IconPlayerStop size={13}/></ActionIcon>}
            </div>
          </div>
        </div>
      </div>}
  </>;
}
