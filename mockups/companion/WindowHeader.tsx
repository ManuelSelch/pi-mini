import { ActionIcon, UnstyledButton } from '@mantine/core';
import { IconArrowUpRight, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { dragWindow } from './native';

type Props = {
  title: string; collapsed: boolean; busy: boolean; opening: boolean;
  onCollapse: () => void; onExpand: () => void; onOpenChat: () => void;
  onError: (error: unknown) => void;
};
export function WindowHeader(p: Props) {
  return <header className="window-header" onMouseDown={(e) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return;
    void dragWindow().catch(p.onError);
  }}>
    {p.collapsed
      ? <UnstyledButton className="collapsed-title" onClick={p.onExpand}><strong>{p.title}</strong></UnstyledButton>
      : <strong className="session-title">{p.title}</strong>}
    <div className="header-actions">
      {p.collapsed
        ? <ActionIcon variant="subtle" color="gray" aria-label="Expand companion" title="Expand" onClick={p.onExpand}><IconChevronUp size={15}/></ActionIcon>
        : <>
          <ActionIcon variant="subtle" color="gray" aria-label="Open in Pi Chat" title="Open in Pi Chat" disabled={p.busy} loading={p.opening} onClick={p.onOpenChat}><IconArrowUpRight size={16}/></ActionIcon>
          <ActionIcon variant="subtle" color="gray" aria-label="Collapse companion" title="Collapse" onClick={p.onCollapse}><IconChevronDown size={15}/></ActionIcon>
        </>}
    </div>
  </header>;
}
