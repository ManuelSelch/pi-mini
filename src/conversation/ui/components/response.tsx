import { Button } from '@mantine/core';
import type { ConversationView } from '../../domain/view';
import { Question } from './question';
import { Markdown } from '../markdown/markdown';
import '../markdown/markdown.css';

interface Props {
  view: ConversationView;
  onSend: (text: string) => void;
  onAnswer: (value: string | boolean) => void;
  onCancel: () => void;
}

export function Response({ view, onSend, onAnswer, onCancel }: Props) {
  return (
    <main
      className={`min-h-0 flex-1 overflow-y-auto px-[12px] [scrollbar-width:thin] ${!view.response && !view.question ? 'flex items-center justify-center py-[8px]' : 'pt-[4px] pb-[8px]'}`}
    >
      {view.response ? (
        <div className="markdown text-[13px]">
          <Markdown>{view.response}</Markdown>
        </div>
      ) : (
        <h1 className="m-0 py-[8px] text-[20px] leading-[1.3] font-medium tracking-[-.5px]">
          Lets cook
        </h1>
      )}
      {view.question && (
        <Question
          key={view.question.id}
          question={view.question}
          submitting={view.submitting}
          onAnswer={onAnswer}
          onCancel={onCancel}
        />
      )}
      {!view.question && view.response && view.canSend && (
        <div className="mt-[12px] flex flex-wrap gap-[5px]" aria-label="Optional follow-ups">
          {['Done', 'Explain', 'I’m stuck'].map((label) => (
            <Button
              key={label}
              variant="default"
              size="compact-xs"
              h={25}
              px={7}
              fz={10}
              onClick={() => onSend(label)}
            >
              {label}
            </Button>
          ))}
        </div>
      )}
    </main>
  );
}
