<script lang="ts">
	import type { ChatCompletionRequestMessageRoleEnum } from 'openai'
  import type { ChatGeneration, Generation, ChatMessage, ChatResult, MessageType, BaseChatMessage } from 'langchain/schema';
  // export let type: MessageType;
  // export let message: ChatGeneration; 
  // export let lcMessage: BaseChatMessage;
	// export let type: ChatCompletionRequestMessageRoleEnum
	// export let message: string
  // Q: What are the LC equivalents for types?
  // Q: Do I create a custom Type like toly?
  type ChatMessageObject = {
    type: MessageType,
    message: string,
    isStreaming?: boolean
  }
  export let message: ChatMessageObject;

</script>

<div class="chat {message.type === 'human' ? 'chat-end' : 'chat-start'} justify-end">
	<div class="chat-image avatar">
		<div class="w-10 rounded-full">
			<img
				src="https://ui-avatars.com/api/?name={message.type === 'human' ? 'Me' : 'B'}"
				alt="{message.type} avatar"
			/>
		</div>
	</div>
	<div class="chat-header">
		{message.type === 'human' ? 'Me' : 'Bot'}
	</div>
	<div class="chat-bubble {message.type === 'human' ? 'chat-bubble-primary' : 'chat-bubble-secondary'}">
		{message.message}
	</div>
</div>

