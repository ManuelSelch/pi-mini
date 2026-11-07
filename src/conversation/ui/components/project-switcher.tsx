import { useEffect, useRef, useState } from 'react';
import { TextInput } from '@mantine/core';

export interface ProjectOption { path: string; name: string }
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
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); }, []);
  const matches = projects.filter((project) => `${project.name} ${project.path}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const path = query.trim();
  const directPath = path.startsWith('/') || path.startsWith('~/');
  const options = directPath && !matches.some((project) => project.path === path) ? [...matches, { name: 'Open folder', path }] : matches;
  const index = Math.min(selected, Math.max(0, options.length - 1));
  return <div className="absolute inset-0 z-10 flex flex-col rounded-[16px] bg-page p-[12px]" role="dialog" aria-modal="true" aria-label="Open project" onKeyDown={(event) => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (!busy) onClose(); return; }
    if (event.key === 'ArrowDown') { event.preventDefault(); setSelected((current) => Math.max(0, Math.min(current + 1, options.length - 1))); return; }
    if (event.key === 'ArrowUp') { event.preventDefault(); setSelected((current) => Math.max(current - 1, 0)); return; }
    if (event.key === 'Enter' && options[index] && !busy) { event.preventDefault(); onSelect(options[index].path); }
  }}>
    <TextInput ref={input} aria-label="Search projects" placeholder="Search projects or enter a folder path" value={query} disabled={busy} onChange={(event) => { setQuery(event.currentTarget.value); setSelected(0); }}/>
    <div className="min-h-0 flex-1 overflow-y-auto py-[8px]" role="listbox" aria-label="Projects">
      {options.map((project, optionIndex) => <button key={project.path} type="button" role="option" aria-selected={index === optionIndex} disabled={busy} onMouseEnter={() => setSelected(optionIndex)} onClick={() => onSelect(project.path)} className={`block w-full rounded-[6px] px-[8px] py-[7px] text-left ${index === optionIndex ? 'bg-panel' : ''}`}>
        <span className="block text-[13px]">{project.name}</span><span className="block truncate text-[11px] text-muted">{project.path}</span>
      </button>)}
      {!options.length && <div className="px-[8px] py-[7px] text-[12px] text-muted">No projects found. Enter an absolute folder path.</div>}
    </div>
    {error && <div role="alert" className="text-[12px] text-failure">{error}</div>}
    <div className="text-[11px] text-muted">Enter to open a new session · Esc to cancel</div>
  </div>;
}
