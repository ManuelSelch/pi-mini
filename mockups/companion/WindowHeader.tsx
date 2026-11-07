import { ActionIcon, Menu, UnstyledButton } from '@mantine/core';
import { IconArrowUpRight, IconChevronDown, IconDots, IconPin, IconPinnedOff, IconPlus, IconSparkles, IconX } from '@tabler/icons-react';
import { dragWindow } from './native';

type Props = {
  title: string; pinned: boolean; collapsed: boolean; busy: boolean;
  onPin: () => void; onCollapse: () => void; onExpand: () => void;
  onOpenChat: () => void; onNew: () => void; onClose: () => void; onError: (error: unknown) => void;
};
export function WindowHeader(p: Props) {
  return <header className="window-header" onMouseDown={(e) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return;
    void dragWindow().catch(p.onError);
  }}>
    <span className="brand-mark"><IconSparkles size={17} stroke={1.6} /></span>
    {p.collapsed
      ? <UnstyledButton className="collapsed-title" onClick={p.onExpand}><strong>{p.title}</strong><span>Click to continue</span></UnstyledButton>
      : <strong className="brand-name">Pi companion<span className="demo-pill">DEMO</span></strong>}
    <div className="header-actions">
      {p.collapsed
        ? <ActionIcon variant="subtle" color="gray" aria-label="Expand companion" onClick={p.onExpand}><IconArrowUpRight size={16}/></ActionIcon>
        : <>
          <ActionIcon variant={p.pinned ? 'light' : 'subtle'} color={p.pinned ? 'blue' : 'gray'} aria-label={p.pinned ? 'Unpin window' : 'Pin window'} aria-pressed={p.pinned} onClick={p.onPin}>{p.pinned ? <IconPin size={15}/> : <IconPinnedOff size={15}/>}</ActionIcon>
          <ActionIcon variant="subtle" color="gray" aria-label="Collapse companion" onClick={p.onCollapse}><IconChevronDown size={16}/></ActionIcon>
          <Menu position="bottom-end" width={190}>
            <Menu.Target><ActionIcon variant="subtle" color="gray" aria-label="More options"><IconDots size={17}/></ActionIcon></Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Companion mockup</Menu.Label>
              <Menu.Item leftSection={<IconPlus size={14}/>} onClick={p.onNew} disabled={p.busy}>New conversation</Menu.Item>
              <Menu.Item leftSection={<IconArrowUpRight size={14}/>} onClick={p.onOpenChat} disabled={p.busy}>Open in Pi Chat</Menu.Item>
              <Menu.Divider/>
              <Menu.Item leftSection={<IconX size={14}/>} onClick={p.onClose}>Close window</Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </>}
    </div>
  </header>;
}
