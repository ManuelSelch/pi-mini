import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { getPiChatExtensionRegistry } from '@manuelselch/pi-server/extensions';
import { companionInstructions } from './host/instructions';

export const miniInitializeAction = 'pi-mini.initialize';

/** Global action registration, with explicit routing to each session's Pi API. */
export default function miniMode(pi: ExtensionAPI): void {
  const registry = getPiChatExtensionRegistry();
  const sessions = registry.store('pi-mini.sessions', () => new Map<string, () => void>());
  let sessionId: string | undefined;
  let initialize: (() => void) | undefined;
  pi.on('session_start', (_event, ctx) => {
    if (sessionId && sessions.get(sessionId) === initialize) sessions.delete(sessionId);
    sessionId = ctx.sessionManager.getSessionId();
    initialize = () => {
      const alreadyInitialized = ctx.sessionManager.getBranch().some((entry) => entry.type === 'custom_message' && entry.customType === 'pi-mini-instructions');
      if (alreadyInitialized) return;
      pi.sendMessage({ customType: 'pi-mini-instructions', content: companionInstructions, display: false }, { triggerTurn: false });
    };
    sessions.set(sessionId, initialize);
  });
  pi.on('session_shutdown', () => {
    if (sessionId && sessions.get(sessionId) === initialize) sessions.delete(sessionId);
  });
  registry.registerAction({
    id: miniInitializeAction,
    title: 'Initialize Pi Mini',
    run: ({ sessionId }) => {
      const initialize = sessions.get(sessionId);
      if (!initialize) throw new Error('Pi Mini extension is not active in this session.');
      initialize();
    },
  });
}
