import { useState } from 'react';
import { Button } from '@mantine/core';
import type { Question as QuestionValue } from '../../domain/view';

interface Props {
  question: QuestionValue;
  submitting: boolean;
  onAnswer: (value: string | boolean) => void;
  onCancel: () => void;
}

export function Question({ question, submitting, onAnswer, onCancel }: Props) {
  const [selected, setSelected] = useState<string>();
  const options = question.kind === 'select' ? question.options : question.kind === 'confirm' ? ['Yes', 'No'] : [];
  return <section className="mt-[12px] border-t border-edge pt-[8px]" aria-label="Agent question">
    <div className="mb-[7px] whitespace-pre-wrap text-[12px] leading-[1.6]">{question.title}</div>
    {question.message && <div className="mb-[7px] whitespace-pre-wrap text-[12px] leading-[1.6]">{question.message}</div>}
    {question.body && <div className="mb-[7px] whitespace-pre-wrap break-words text-[12px] leading-[1.6]">{question.body}</div>}
    <div className="flex flex-wrap gap-[5px]">
      {options.map((option) => <Button key={option} size="compact-xs" h={25} px={7} fz={10} variant={selected === option ? 'light' : 'default'} disabled={submitting} aria-pressed={question.explicit ? selected === option : undefined} onClick={() => {
        if (question.explicit) { setSelected(option); return; }
        onAnswer(question.kind === 'confirm' ? option === 'Yes' : option);
      }}>{option}</Button>)}
      {question.explicit && <Button size="compact-xs" h={25} px={7} fz={10} disabled={submitting || selected === undefined} onClick={() => { if (selected !== undefined) onAnswer(selected); }}>{question.submitLabel ?? 'Submit'}</Button>}
    </div>
    <Button className="mt-[5px] -ml-[5px]" variant="subtle" color="gray" size="compact-xs" fz={9} disabled={submitting} onClick={onCancel}>{question.cancelLabel ?? 'Cancel question'}</Button>
  </section>;
}
