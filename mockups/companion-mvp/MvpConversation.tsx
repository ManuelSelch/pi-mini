import { Button } from '@mantine/core';

export type Prompt = { kind: 'select' | 'confirm' | 'input'; title: string; options?: string[] };

type Props = {
  text: string;
  prompt?: Prompt;
  canSend: boolean;
  onAnswer: (answer: string) => void;
  onSend: (message: string) => void;
};

export function MvpConversation({ text, prompt, canSend, onAnswer, onSend }: Props) {
  return <main className="conversation mvp-conversation">
    {text ? <div className="message-text">{text}</div> : <div className="mvp-empty">
      <h1>Lets cook</h1>
    </div>}
    {prompt && <section className="inline-question" aria-label="Agent question">
      <div className="question-title">{prompt.title}</div>
      {prompt.kind !== 'input' && <div className="quick-actions">
        {(prompt.kind === 'confirm' ? ['Yes', 'No'] : prompt.options ?? []).map((option) =>
          <Button key={option} variant="default" size="compact-xs" onClick={() => onAnswer(option)}>{option}</Button>)}
      </div>}
      <Button className="cancel-question" variant="subtle" color="gray" size="compact-xs" onClick={() => onAnswer('Cancel')}>Cancel question</Button>
    </section>}
    {!prompt && text && canSend && <div className="quick-actions follow-up-actions" aria-label="Optional follow-ups">
      {['Done', 'Explain', 'I’m stuck'].map((label) =>
        <Button key={label} variant="default" size="compact-xs" onClick={() => onSend(label)}>{label}</Button>)}
    </div>}
  </main>;
}
