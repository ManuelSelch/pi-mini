import { useState } from 'react';
import { ActionIcon, Textarea } from '@mantine/core';
import { IconArrowUp, IconPlayerStop } from '@tabler/icons-react';

type Props = { busy: boolean; onSend: (text: string) => void; onStop: () => void; full?: boolean };
export function Composer({ busy, onSend, onStop, full }: Props) {
  const [text, setText] = useState('');
  const send = () => {
    if (!text.trim() || busy) return;
    onSend(text.trim()); setText('');
  };
  return <div className={full ? 'composer-wrap full-composer' : 'composer-wrap'}>
    <div className="composer">
      <Textarea aria-label="Message Pi" placeholder="Ask, or tell me where you’re stuck…" autosize minRows={1} maxRows={3} variant="unstyled" value={text} onChange={(e) => setText(e.currentTarget.value)} onKeyDown={(e) => {
        if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
        e.preventDefault(); send();
      }}/>
      <ActionIcon className="send-button" variant={busy ? 'light' : 'filled'} radius="xl" size={27} aria-label={busy ? 'Stop reply' : 'Send message'} disabled={!busy && !text.trim()} onClick={busy ? onStop : send}>{busy ? <IconPlayerStop size={13}/> : <IconArrowUp size={16}/>}</ActionIcon>
    </div>
  </div>;
}
