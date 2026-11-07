import type { ReactNode } from 'react';
import { Button } from '@mantine/core';
import type { ConversationView } from '../../domain/view';
import { Header } from './header';
import { Response } from './response';

interface Props {
  view: ConversationView;
  composer: ReactNode;
  onDrag: () => void;
  onSend: (text: string) => void;
  onAnswer: (value: string | boolean) => void;
  onCancel: () => void;
  onTakeControl: () => void;
}

export function CompanionView(props: Props) {
  return <div className="flex h-dvh flex-col overflow-hidden rounded-[16px] border border-edge bg-page text-ink">
    <Header title={props.view.title} projectName={props.view.projectName} status={props.view.status} onDrag={props.onDrag}/>
    {props.view.error && <div className="shrink-0 px-[12px] pt-[4px] pb-[8px] text-[11px] leading-[1.6] whitespace-pre-wrap break-words text-failure" role="alert">{props.view.error}</div>}
    {props.view.status === 'superseded' && <div className="shrink-0 px-[12px] pt-[4px] pb-[8px]"><Button variant="default" size="compact-xs" onClick={props.onTakeControl}>Take control</Button></div>}
    <Response view={props.view} onSend={props.onSend} onAnswer={props.onAnswer} onCancel={props.onCancel}/>
    {props.composer}
  </div>;
}
