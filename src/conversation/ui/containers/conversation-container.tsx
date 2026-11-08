import { useEffect, useState, useSyncExternalStore } from 'react';
import type { Conversation } from '../../app/conversation';
import { CompanionView } from '../components/companion-view';
import { Composer } from '../components/composer';
import { ProjectSwitcher } from '../components/project-switcher';

interface Props {
  conversation: Conversation;
  onDrag: () => void;
  focusRequest: number;
}

export function ConversationContainer({ conversation, onDrag, focusRequest }: Props) {
  const view = useSyncExternalStore(conversation.subscribe, conversation.getView);
  const [draft, setDraft] = useState('');
  const [switcher, setSwitcher] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string>();
  const [switchFocus, setSwitchFocus] = useState(0);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.isComposing && !event.defaultPrevented) {
        if (switcher || !view.canStop) return;
        event.preventDefault();
        void conversation.stop();
        return;
      }
      if (
        !event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey ||
        event.key.toLowerCase() !== 'o' ||
        event.isComposing
      )
        return;
      event.preventDefault();
      if (!view.canSend) return;
      setSwitchError(undefined);
      setSwitcher(true);
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [conversation, switcher, view.canSend, view.canStop]);
  const closeSwitcher = () => {
    setSwitcher(false);
    setSwitchFocus((value) => value + 1);
  };
  const switchProject = async (path: string) => {
    if (switching) return;
    setSwitching(true);
    setSwitchError(undefined);
    try {
      const folder = await conversation.client.browseDirectories({ path });
      if (await conversation.switchProject(folder.path)) {
        setDraft('');
        closeSwitcher();
      } else setSwitchError(conversation.getView().error ?? 'Unable to open project.');
    } catch (error) {
      setSwitchError(error instanceof Error ? error.message : String(error));
    } finally {
      setSwitching(false);
    }
  };
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const question = view.question;
  const typedQuestion =
    question?.kind === 'input' || question?.kind === 'editor' ? question : undefined;
  const text = typedQuestion ? (answers[typedQuestion.id] ?? typedQuestion.prefill ?? '') : draft;
  const change = (next: string) => {
    if (typedQuestion) {
      setAnswers((current) => ({ ...current, [typedQuestion.id]: next }));
      return;
    }
    setDraft(next);
  };
  const send = async () => {
    if (!text.trim()) return;
    if (typedQuestion) {
      if (await conversation.answer(typedQuestion.id, { cancelled: false, value: text }))
        setAnswers((current) => {
          const next = { ...current };
          delete next[typedQuestion.id];
          return next;
        });
      return;
    }
    if (await conversation.send(text)) setDraft((current) => (current === text ? '' : current));
  };
  const disabled =
    ['connecting', 'superseded'].includes(view.status) || Boolean(question && !typedQuestion);

  return (
    <div className="relative h-dvh">
      <CompanionView
        view={view}
        onDrag={onDrag}
        onSend={(text) => {
          void conversation.send(text);
        }}
        onAnswer={(value) => {
          if (question) void conversation.answer(question.id, { cancelled: false, value });
        }}
        onCancel={() => {
          if (question) void conversation.answer(question.id, { cancelled: true });
        }}
        onTakeControl={() => conversation.takeControl()}
        composer={
          <Composer
            text={text}
            label={typedQuestion?.title ?? 'Message Pi'}
            placeholder={typedQuestion?.placeholder ?? (typedQuestion ? 'Your answer…' : 'Ask…')}
            disabled={disabled}
            canSubmit={(Boolean(typedQuestion) && !view.submitting) || view.canSend}
            canStop={view.canStop}
            focusKey={`${focusRequest}:${switchFocus}:${typedQuestion?.id ?? 'message'}`}
            onChange={change}
            onSend={() => {
              void send();
            }}
            onStop={() => {
              void conversation.stop();
            }}
          />
        }
      />
      {switcher && (
        <ProjectSwitcher
          projects={conversation.client
            .getState()
            .catalogue.projects.filter((project) => project.exists)}
          busy={switching}
          error={switchError}
          onSelect={(path) => {
            void switchProject(path);
          }}
          onClose={closeSwitcher}
        />
      )}
    </div>
  );
}
