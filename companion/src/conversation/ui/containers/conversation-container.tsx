import { useState, useSyncExternalStore } from 'react';
import type { Conversation } from '../../app/conversation';
import { CompanionView } from '../components/companion-view';
import { Composer } from '../components/composer';

interface Props { conversation: Conversation; onDrag: () => void; focusRequest: number }

export function ConversationContainer({ conversation, onDrag, focusRequest }: Props) {
  const view = useSyncExternalStore(conversation.subscribe, conversation.getView);
  const [draft, setDraft] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const question = view.question;
  const typedQuestion = question?.kind === 'input' || question?.kind === 'editor' ? question : undefined;
  const text = typedQuestion ? answers[typedQuestion.id] ?? typedQuestion.prefill ?? '' : draft;
  const change = (next: string) => {
    if (typedQuestion) { setAnswers((current) => ({ ...current, [typedQuestion.id]: next })); return; }
    setDraft(next);
  };
  const send = async () => {
    if (!text.trim()) return;
    if (typedQuestion) {
      if (await conversation.answer(typedQuestion.id, { cancelled: false, value: text })) setAnswers((current) => { const next = { ...current }; delete next[typedQuestion.id]; return next; });
      return;
    }
    if (await conversation.send(text)) setDraft((current) => current === text ? '' : current);
  };
  const disabled = ['connecting', 'superseded'].includes(view.status) || Boolean(question && !typedQuestion);

  return <CompanionView view={view} onDrag={onDrag} onSend={(text) => { void conversation.send(text); }}
    onAnswer={(value) => { if (question) void conversation.answer(question.id, { cancelled: false, value }); }}
    onCancel={() => { if (question) void conversation.answer(question.id, { cancelled: true }); }}
    onTakeControl={() => conversation.takeControl()}
    composer={<Composer text={text} label={typedQuestion?.title ?? 'Message Pi'} placeholder={typedQuestion?.placeholder ?? (typedQuestion ? 'Your answer…' : 'Ask…')} disabled={disabled}
      canSubmit={Boolean(typedQuestion) && !view.submitting || view.canSend} canStop={view.canStop} focusKey={`${focusRequest}:${typedQuestion?.id ?? 'message'}`} onChange={change} onSend={() => { void send(); }} onStop={() => { void conversation.stop(); }}/>}/>;
}
