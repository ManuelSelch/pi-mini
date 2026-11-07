import { useState } from 'react';
import { ActionIcon, Textarea } from '@mantine/core';
import { IconPlayerStop } from '@tabler/icons-react';

type Props = { busy: boolean; onSend: (text: string) => void; onStop: () => void; full?: boolean };
export function Composer({ busy, onSend, onStop, full }: Props) {
  const [text, setText] = useState('');
  const send = () => {
    if (!text.trim() || busy) return;
    onSend(text.trim()); setText('');
  };
  return <div className={full ? 'composer-wrap full-composer' : 'composer-wrap'}>
    <div className="composer">
      <Textarea aria-label="Message Pi" placeholder="Ask…" autosize minRows={1} maxRows={3} variant="unstyled" value={text} onChange={(e) => setText(e.currentTarget.value)} onKeyDown={(e) => {
        if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
        e.preventDefault(); send();
      }}/>
      {busy && <ActionIcon className="stop-button" variant="subtle" color="gray" radius="md" size={24} aria-label="Stop reply" onClick={onStop}><IconPlayerStop size={13}/></ActionIcon>}
    </div>
  </div>;
}
