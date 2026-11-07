import { useEffect, useRef } from 'react';
import { Button, Loader, UnstyledButton } from '@mantine/core';
import { IconCheck, IconSparkles } from '@tabler/icons-react';
import { steps, type Message, type Session } from './demo';

export function MessageList({ messages }: { messages: Message[] }) {
  return <div className="message-list">{messages.map((m) => <div className={'message ' + m.role} key={m.id}>
    <div className="message-label">{m.role === 'user' ? 'You' : <><IconSparkles size={12}/> Pi</>}</div>
    <div className="message-text">{m.text}</div>
  </div>)}</div>;
}

type Props = { session: Session; busy: boolean; onSend: (text: string) => void; onStartRouter: () => void; full?: boolean };
export function Conversation({ session, busy, onSend, onStartRouter, full }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (full) scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [session.messages.length, busy, full]);
  const messages = session.messages;
  const latest = messages.at(-1);
  const step = steps[session.step];
  if (!messages.length) return <main className="empty-conversation">
    <span className="empty-spark"><IconSparkles size={25} stroke={1.4}/></span>
    <h1>A little help, as you go.</h1>
    <p>Keep doing your thing.<br/>Ask Pi when you need a hand.</p>
    <Button variant="default" size="xs" onClick={onStartRouter}>Try a router setup</Button>
    <span className="empty-note">A conversation, not another workspace.</span>
  </main>;
  return <main className={'conversation ' + (full ? 'full-conversation' : '')} ref={scroller}>
    {session.guided && !full && <div className="step-heading">
      <span>{step ? 'STEP ' + (session.step + 1) + ' OF 4' : 'COMPLETE'}</span>
      <span className="step-dots">{steps.map((_, i) => <i key={i} className={i <= session.step ? 'active' : ''}/>)}</span>
    </div>}
    {!full && session.guided && <h1>{step?.title ?? 'You’re good to go.'}</h1>}
    <MessageList messages={full ? messages : latest ? [latest] : []}/>
    {busy && <div className="thinking"><Loader size={11}/><span>Pi is thinking<span className="demo-label"> · simulated</span></span></div>}
    {!busy && session.guided && step && <div className="quick-actions">
      {step.actions.map((action, i) => <Button key={action} size="compact-xs" variant={i === 0 ? 'light' : 'default'} leftSection={i === 0 ? <IconCheck size={12}/> : undefined} onClick={() => onSend(action)}>{action}</Button>)}
      <UnstyledButton className="explain-action" onClick={() => onSend('Explain this step')}>Explain this step</UnstyledButton>
    </div>}
  </main>;
}
