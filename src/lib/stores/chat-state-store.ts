import { writable } from 'svelte/store';
import type { MessageType } from 'langchain/schema';

type ChatMessageObject = {
  type: MessageType,
  message: string,
  isStreaming?: boolean
}

type ChatStateStore = {
  messages: ChatMessageObject[],
  history: [string, string][]
  pending?: string,
}

function createChatStateStore() {
  const { subscribe, set, update } = writable<ChatStateStore>({ 
    messages: [], 
    history: [] 
  });

  return {
    subscribe,
    set,
    update,
    reset: () => set({ messages: [], history: [] })
  }
}

export const chatStateStore = createChatStateStore();


