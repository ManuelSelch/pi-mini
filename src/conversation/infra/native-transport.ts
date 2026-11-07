import NativeWebSocket, { type ConnectionConfig, type Message } from '@tauri-apps/plugin-websocket';
import type { TransportFactory } from '@manuelselch/pi-sdk';

interface NativeSocket {
  addListener(listener: (message: Message) => void): () => void;
  send(text: string): Promise<void>;
  disconnect(): Promise<void>;
}
type Connect = (endpoint: string, config: ConnectionConfig) => Promise<NativeSocket>;

/** Native socket: no forged browser Origin and no relaxation of server policy. */
export function createNativeTransport(connect: Connect = NativeWebSocket.connect): TransportFactory {
  return (endpoint, handlers) => {
    const url = new URL(endpoint);
    if (url.protocol !== 'ws:' || url.hostname !== '127.0.0.1' || url.pathname !== '/ws' || url.username || url.password || url.search || url.hash) throw new Error('Only a private loopback endpoint is allowed.');
    let socket: NativeSocket | undefined;
    let unlisten: (() => void) | undefined;
    let closed = false;
    let bufferedBytes = 0;
    let sending = Promise.resolve();
    const disconnect = (connection: NativeSocket) => { void connection.disconnect().catch(() => {}); };
    const close = () => {
      if (closed) return;
      closed = true;
      unlisten?.();
      if (socket) disconnect(socket);
    };
    const fail = (error: unknown) => {
      if (closed) return;
      handlers.error(error);
      handlers.close({ code: 1006, reason: 'Native WebSocket connection failed' });
      close();
    };
    void connect(endpoint, { maxMessageSize: 16_777_216, maxFrameSize: 16_777_216, maxWriteBufferSize: 20_971_520, writeBufferSize: 0 }).then((connection) => {
      if (closed) { disconnect(connection); return; }
      socket = connection;
      unlisten = connection.addListener((message) => {
        if (closed) return;
        if (message.type === 'Text') handlers.message(message.data);
        else if (message.type === 'Close') {
          handlers.close({ code: message.data?.code ?? 1006, reason: message.data?.reason });
          close();
        } else if (message.type === 'Binary') fail(new Error('Expected text protocol frames.'));
      });
      handlers.open();
    }, fail);
    return {
      send(text) {
        if (closed || !socket) throw new Error('Native socket is not connected.');
        const size = new TextEncoder().encode(text).byteLength;
        if (bufferedBytes + size > 4_194_304) throw new Error('Native socket send buffer limit exceeded.');
        bufferedBytes += size;
        const target = socket;
        sending = sending.then(async () => { if (!closed) await target.send(text); }).then(() => { bufferedBytes -= size; }, (error: unknown) => { bufferedBytes -= size; fail(error); });
      },
      close,
      dispose: close,
    };
  };
}
