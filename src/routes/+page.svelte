<script lang="ts">
	import ChatMessage from '$lib/components/ChatMessage.svelte';
	import type { ChatCompletionRequestMessage } from 'openai';
	import type {
		// HumanChatMessage,
		// SystemChatMessage,
		MessageType,
		ChainValues,
		ChatResult,
		ChatGeneration,
		Generation
	} from 'langchain/schema';
	import { fetchEventSource } from '@microsoft/fetch-event-source';
	import { messageStateStore } from '$lib/stores/message-state-store';
	// import { onMount } from 'svelte'

	// ====== IMPORTANT =======
	// Just TOO many issues getting going with SK where the real goal is
	// learning how to use LangChain with various models. Time to start
	// learning a bit of React/NextJS I guess...

  // TODOS/QUESTIONS:
  // - Q: How to get SSE event Responses sent to Client?
  //      This is THE thing that's preventing me from using LC+SK

	// Q: How to add a speech-to-text using Whisper API?
	// Saving to MP3: REF: https://medium.com/jeremy-gottfrieds-tech-blog/javascript-tutorial-record-audio-and-encode-it-to-mp3-2eedcd466e78
	// Svelte Recorder: REF: https://cptcrunchy.medium.com/how-to-build-a-voice-recorder-with-sveltekit-d331e3e94af6
	// Whisper API Example: REF: https://github.com/zahidkhawaja/whisper-nextjs

	// NOTE Need to store all chat messages locally, since
	// OpenAI API doesn't keep track for us/return them.
	// NOTE Also, our Server-side is going to be serverless,
	// so we need to keep state here.
	// let chatMessages: ChatCompletionRequestMessage[] = []
	// Q: What's the LC type equivalent of ChatCompletionRequestMessage?
	// BaseChatMessage, ChatResult, ChainValues, ChatGeneration?
	// Q: Do I create a custom Type like toly?

	let query: string = '';
	let loading: boolean = false;
	let sourceDocs: Document[] = [];
	let error: string | null = null;
	let scrollToDiv: HTMLDivElement;
	$: question = query.trim();

	$: {
		console.log('messageStateStore: ', $messageStateStore);
	}

	// ====== Testing out Types:
	// let humanChat = new HumanChatMessage('Human chat message...')
	// console.log('humanChat: ', humanChat)
	// let systemChat = new SystemChatMessage('System chat message...')
	// console.log('systemChat: ', systemChat)
	// let chatGeneration = new BaseChatMessage("Base chat to chatGeneration");
	// let chatMessage = new ChatMessage({ type: "system", message: chatGeneration});

	// let player: HTMLAudioElement
	// let file: File
	// let media: Array<Blob> = []
	// let mediaRecorder: MediaRecorder

	function scrollToBottom() {
		setTimeout(function () {
			scrollToDiv.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'nearest' });
		}, 100);
	}

	async function handleSubmit(event: SubmitEvent) {
		console.log('handleSubmit() event: ', event);
		// let question = new HumanChatMessage(query.trim())
		// console.log('HumanChatMessage:question: ', question)
		// // Q: BaseChatMessage, ChatResult, ChainValues, ChatGeneration?
		if (!question) {
			alert('Please enter a question.');
			return;
		}
		console.log('question: ', question);
		// Update state
		messageStateStore.update((store) => {
			return {
				...store,
				messages: [
					...store.messages,
					{
						type: 'userMessage',
						message: question
					}
				],
				pending: undefined
			};
		});
		console.log('UPDATED::messageStateStore: ', $messageStateStore);
		loading = true;
		query = '';
		// Q: Do I do another store.update() to set pending: ''?
		messageStateStore.update((store) => ({ ...store, pending: '' }));
		console.log('UPDATED::messageStateStore: ', $messageStateStore);
		console.log(
			'JSON.stringify({q,h}): ',
			JSON.stringify({ question, history: $messageStateStore.history })
		);

		const ctrl = new AbortController();

		// NOTE Differences between Postman and Home page REQUESTS:
		// NOTE All Body is JSON.stringified syntax:
		// Postman Request Body: {"messages":[{"role":"user","content":"How to say hello?"}]}
		// +server.ts::requestData:  { messages: [ { role: 'user', content: 'How to say hello?' } ] }
		// Home page Request Body: {"question":"How to say yellow?","history":[]}
		// +server.ts::requestData:  { question: 'How to say yellow?', history: [] }
		// NEXTJS Home Request.body JSON.str({q,h}): {"question":"How are you?","history":[]}
		// NEXTJS server response: { response: "Searching 2021 annual report..." }

		try {
			fetchEventSource('/api/chat', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					question,
					history: $messageStateStore.history
					// history: chatHistory
				}),
				signal: ctrl.signal,
				onmessage: (event) => {
					console.log('onmessage event.data: ', event);
					scrollToBottom();
					if (event.data === '[DONE]') {
						// Q: Eventually need to save state. Could consider a
						// PageServerLoad from Supabase then it'd be in 'data' prop
						// Q: Use a Store for state?
						messageStateStore.update((store) => {
							return {
								history: [...store.history, [question, store.pending ?? '']],
								messages: [
									...store.messages,
									{
										type: 'apiMessage',
										message: store.pending ?? '',
										sourceDocs: store.pendingSourceDocs
									}
								],
								pending: undefined,
								pendingSourceDocs: undefined
							};
						});
						console.log('DONE::messageStateStore: ', $messageStateStore);
						loading = false;
						ctrl.abort();
					} else {
						const data = JSON.parse(event.data);
						console.log('e.data: ', data);
						// Q: Do I need 'answer'? Should it be: ???
						// answer = (answer ?? '') + data.data;
						// Q: What about 'history'?
						if (data.sourceDocs) {
							messageStateStore.update((store) => {
								return {
									...store,
									pendingSourceDocs: data.sourceDocs
								};
							});
						} else {
							messageStateStore.update((store) => {
								return {
									...store,
									pending: (store.pending ?? '') + data.data
								};
							});
						}
						scrollToBottom();
					}
				}
			});
		} catch (error) {
			handleError(error);
		}
	}

	function handleError<T>(err: T) {
		loading = false;
		query = '';
		console.error(err);
	}
</script>

<div class="container h-full space-y-10 p-4">
	<div class="mx-auto flex flex-col gap-4">
		<header class="space-y-4">
			<h1>
				<span class="gradient-heading">Skully</span>
			</h1>
			<p>Powered by ChatGPT</p>
		</header>
	</div>

	<!-- Single Form Card -->
	<div class="card max-w-3xl p-4">
		<!-- <header class="card-header space-y-4 text-center"> -->
		<!-- 	<h2>Skully Chat</h2> -->
		<!-- 	<p>Powered by ChatGPT</p> -->
		<!-- </header> -->
		<section class="p-4">
			<div class="card variant-soft p-4 text-center">
				<dl class="list-dl">
					<div>
						<span class="badge bg-primary-500">💀</span>
						<span class="flex-auto">
							<dt>Title</dt>
							<dd>Description</dd>
						</span>
					</div>
					<!-- ... -->
				</dl>
			</div>
		</section>
		<div class="card-footer p-4 grid grid-cols-1 gap-4">
			<form on:submit|preventDefault={handleSubmit} class="space-y-4">
				<div class="input-group input-group-divider grid-cols-[auto_1fr_auto]">
					<div class="input-group-shim">💀</div>
					<input type="search" bind:value={query} placeholder="How can I help you?" />
					<button type="submit" class="variant-filled-secondary">Submit</button>
				</div>
			</form>
			<pre>{JSON.stringify($messageStateStore, null, 2)}</pre>
		</div>
	</div>
</div>
