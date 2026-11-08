import { useState } from 'react';
import { Composer } from './composer';

export interface ProjectOption {
  path: string;
  name: string;
  quickChats?: boolean;
}
interface Props {
  projects: readonly ProjectOption[];
  busy: boolean;
  error?: string;
  onSelect: (path: string) => void;
  onClose: () => void;
}

export function ProjectSwitcher({ projects, busy, error, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const matches = projects
    .filter((project) =>
      `${project.name} ${project.path}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
    )
    .sort((a, b) => Number(Boolean(b.quickChats)) - Number(Boolean(a.quickChats)));
  const path = query.trim();
  const directPath = path.startsWith('/') || path.startsWith('~/');
  const options =
    directPath && !matches.some((project) => project.path === path)
      ? [...matches, { name: 'Open folder', path }]
      : matches;
  const index = Math.min(selected, Math.max(0, options.length - 1));
  return (
    <div
      className="absolute inset-0 z-10 flex flex-col rounded-[16px] bg-page"
      role="dialog"
      aria-modal="true"
      aria-label="Open project"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          if (!busy) onClose();
          return;
        }
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setSelected((current) => Math.max(0, Math.min(current + 1, options.length - 1)));
          return;
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          setSelected((current) => Math.max(current - 1, 0));
          return;
        }
      }}
    >
      <div
        className="min-h-0 flex-1 overflow-y-auto px-[12px] py-[8px]"
        role="listbox"
        aria-label="Projects"
      >
        {options.map((project, optionIndex) => (
          <button
            key={project.path}
            type="button"
            role="option"
            aria-selected={index === optionIndex}
            disabled={busy}
            onClick={() => onSelect(project.path)}
            className={`block w-full cursor-pointer border-0 bg-transparent px-[8px] py-[7px] text-left hover:text-accent ${index === optionIndex ? 'text-accent' : 'text-ink'}`}
          >
            <span className="block text-[13px]">{project.name}</span>
          </button>
        ))}
        {!options.length && (
          <div className="px-[8px] py-[7px] text-[12px] text-muted">
            No projects found. Enter an absolute folder path.
          </div>
        )}
      </div>
      {error && (
        <div role="alert" className="px-[12px] text-[12px] text-failure">
          {error}
        </div>
      )}
      <Composer
        text={query}
        label="Search projects"
        placeholder="Search"
        disabled={busy}
        canSubmit={options.length > 0}
        canStop={false}
        onChange={(value) => {
          setQuery(value);
          setSelected(0);
        }}
        onSend={() => {
          if (options[index]) onSelect(options[index].path);
        }}
        onStop={() => {}}
      />
    </div>
  );
}
