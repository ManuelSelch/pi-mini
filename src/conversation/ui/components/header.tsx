import { UnstyledButton } from '@mantine/core';
import { statusLabels, type CompanionStatus } from '../../domain/view';

const dotColor: Record<CompanionStatus, string> = {
  connecting: 'bg-reconnecting',
  idle: 'bg-ready',
  thinking: 'bg-accent',
  running: 'bg-accent',
  waiting: 'bg-waiting',
  aborting: 'bg-reconnecting',
  error: 'bg-failure',
  superseded: 'bg-muted',
};

interface Props {
  title: string;
  projectName: string;
  status: CompanionStatus;
  onDrag: () => void;
  onOpenChat?: () => void;
}

export function Header({ title, projectName, status, onDrag, onOpenChat }: Props) {
  return (
    <header
      className="flex h-[34px] shrink-0 items-center gap-[7px] pl-[12px] pr-[8px] select-none"
      onMouseDown={(event) => {
        if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return;
        onDrag();
      }}
    >
      <span
        className={'size-[6px] shrink-0 rounded-full ' + dotColor[status]}
        role="status"
        aria-live="polite"
        title={statusLabels[status]}
      >
        <span className="sr-only">{statusLabels[status]}</span>
      </span>
      {projectName && (
        <span className="min-w-0 truncate text-[11px] font-medium text-muted" title={projectName}>
          {projectName}
        </span>
      )}
      {projectName && title && (
        <span aria-hidden="true" className="text-[11px] text-muted">
          &gt;
        </span>
      )}
      {title && (
        <UnstyledButton
          className="min-w-0 truncate text-left text-[11px] font-medium text-muted enabled:hover:underline enabled:focus-visible:underline underline-offset-3"
          disabled={!onOpenChat}
          title={
            onOpenChat
              ? 'Open in Pi Chat · transfer control'
              : 'Pi Chat handoff is not connected yet'
          }
          aria-label={'Open ' + title + ' in Pi Chat and transfer control'}
          onClick={onOpenChat}
        >
          {title}
        </UnstyledButton>
      )}
    </header>
  );
}
