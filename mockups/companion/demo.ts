export type Message = { id: string; role: 'user' | 'assistant'; text: string };
export type Session = { id: string; title: string; messages: Message[]; step: number; guided: boolean };
export const steps = [
  { title: 'Connect to the router', text: 'Join the router’s Wi-Fi from your laptop. The network name and Wi-Fi password are usually printed on its label.', actions: ['I’m connected', 'Can’t find the network'] },
  { title: 'Open the settings', text: 'Find the router’s admin address on its label or in the manual, then open it in your browser. It may be a local address such as 192.168.1.1.', actions: ['Settings are open', 'The page won’t load'] },
  { title: 'Sign in', text: 'Use the admin login from the router’s label or manual. This can be different from the Wi-Fi password. Don’t paste your password into chat.', actions: ['I’m signed in', 'Which password?'] },
  { title: 'Make it yours', text: 'Set a strong admin password, choose your Wi-Fi name, and enable WPA3 or WPA2-AES. Save your changes; you may need to reconnect to the new Wi-Fi.', actions: ['All done', 'Explain Wi-Fi security'] },
];
export const message = (role: Message['role'], text: string): Message => ({ id: crypto.randomUUID(), role, text });
export const routerSession = (): Session => ({
  id: crypto.randomUUID(), title: 'Router setup', guided: true, step: 0,
  messages: [message('user', 'I’m setting up a new router. Guide me one step at a time.'), message('assistant', steps[0].text)],
});
export const emptySession = (): Session => ({ id: crypto.randomUUID(), title: 'New conversation', messages: [], step: 0, guided: false });

export function initialSession(): Session {
  const query = new URLSearchParams(location.search);
  const raw = query.get('snapshot');
  if (raw) {
    try {
      const candidate: unknown = JSON.parse(raw);
      if (candidate && typeof candidate === 'object' && 'id' in candidate && typeof candidate.id === 'string'
        && 'title' in candidate && typeof candidate.title === 'string'
        && 'step' in candidate && typeof candidate.step === 'number'
        && 'guided' in candidate && typeof candidate.guided === 'boolean'
        && 'messages' in candidate && Array.isArray(candidate.messages)
        && candidate.messages.every((m: unknown) => m && typeof m === 'object' && 'id' in m && typeof m.id === 'string' && 'role' in m && (m.role === 'user' || m.role === 'assistant') && 'text' in m && typeof m.text === 'string')) return candidate as Session;
    } catch { /* Invalid snapshots open a clean demo instead. */ }
  }
  return query.get('state') === 'empty' ? emptySession() : routerSession();
}

export function replyTo(session: Session, text: string): { text: string; step: number } {
  const lastStep = steps.length - 1;
  if (session.guided && ['I’m connected', 'Settings are open', 'I’m signed in'].includes(text)) {
    const step = Math.min(session.step + 1, lastStep);
    return { text: steps[step].text, step };
  }
  if (text === 'All done') return { text: 'You’re all set. Keep the new admin password somewhere safe, and check for a firmware update when you have a moment.', step: steps.length };
  if (/network|wi-fi/i.test(text) && /find|see/i.test(text)) return { text: 'Check that the router is powered on and wait a minute for it to start. Look for the Wi-Fi name on the label, then refresh your laptop’s network list.', step: session.step };
  if (/password/i.test(text)) return { text: 'Look for “admin password” or “device password” on the label or in the manual—not “Wi-Fi key.” Keep the actual password private.', step: session.step };
  if (/load|page/i.test(text)) return { text: 'Make sure you’re connected to the router’s own network. Check the address on its label or the default gateway shown in your network settings.', step: session.step };
  if (/security/i.test(text)) return { text: 'Choose WPA3 if all your devices support it; otherwise use WPA2-AES. Avoid WEP. A long, unique Wi-Fi password is a good next step.', step: session.step };
  if (text === 'Explain this step') return { text: session.step === 0 ? 'Connecting directly to the router lets your laptop reach its local setup page—even before the internet connection works.' : 'We’re taking one step at a time so you can keep doing the setup yourself. Use the label or manual for your router’s exact addresses and controls.', step: session.step };
  return { text: 'In the real companion, Pi would answer your question here using this same conversation. This clickdummy uses scripted replies so you can explore the flow without an agent connection.', step: session.step };
}
