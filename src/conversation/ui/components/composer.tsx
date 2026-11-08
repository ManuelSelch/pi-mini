import { useEffect, useRef } from 'react';
import { ActionIcon, Textarea } from '@mantine/core';
import { IconPlayerStop } from '@tabler/icons-react';
import styles from './composer.module.css';

interface Props {
  text: string;
  label: string;
  placeholder: string;
  disabled: boolean;
  canSubmit: boolean;
  canStop: boolean;
  focusKey?: string;
  onChange: (text: string) => void;
  onSend: () => void;
  onStop: () => void;
}

export function Composer(props: Props) {
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!props.disabled) input.current?.focus();
  }, [props.focusKey, props.disabled]);
  return (
    <div className="shrink-0 px-[8px] pt-[3px] pb-[8px]">
      <div className="flex items-end gap-[5px] rounded-[9px] border border-edge bg-panel py-[3px] pl-[8px] pr-[5px] focus-within:border-focus">
        <Textarea
          ref={input}
          className="min-w-0 flex-1"
          classNames={{ input: styles.textarea }}
          aria-label={props.label}
          placeholder={props.placeholder}
          disabled={props.disabled}
          autosize
          minRows={1}
          maxRows={3}
          variant="unstyled"
          value={props.text}
          onChange={(event) => props.onChange(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
            event.preventDefault();
            if (props.canSubmit) props.onSend();
          }}
        />
        {props.canStop && (
          <ActionIcon
            className="mb-[1px] shrink-0"
            variant="subtle"
            color="gray"
            radius="md"
            size={24}
            aria-label="Stop reply"
            onClick={props.onStop}
          >
            <IconPlayerStop size={13} />
          </ActionIcon>
        )}
      </div>
    </div>
  );
}
