import { writable } from 'svelte/store';
import type { Document } from 'langchain/document';
// import type { MessageType } from 'langchain/schema';

// U: Changing the structure to match NextJS examples
export type Message = {
  // type: MessageType,
  type: 'apiMessage' | 'userMessage';
  message: string;
  isStreaming?: boolean;
  sourceDocs?: Document[];
}

type MessageStateStore = {
  messages: Message[],
  pending?: string,
  history: [string, string][],
  pendingSourceDocs?: Document[]
}

function createMessageStateStore() {
  const { subscribe, set, update } = writable<MessageStateStore>({ 
    messages: [
      {
        type: 'apiMessage',
        message: '你好！How can I help improve your 中文 today?'
      }
    ], 
    history: [],
    pendingSourceDocs: []
  });

  return {
    subscribe,
    set,
    update,
    reset: () => set({ messages: [], pending: undefined, history: [], pendingSourceDocs: [] })
  }
}

export const messageStateStore = createMessageStateStore();


