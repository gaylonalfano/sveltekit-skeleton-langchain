import { OPENAI_API_KEY } from '$env/static/private'
import type {
  RequestHandler,
  RequestEvent,
} from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';
import { ChatOpenAI } from "langchain/chat_models";
import { OpenAIChat } from 'langchain/llms';
import { AgentExecutor, ChatAgent } from "langchain/agents";
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  MessagesPlaceholder,
  SystemMessagePromptTemplate,
} from "langchain/prompts";
import { ConversationChain } from "langchain/chains";
import { CallbackManager } from 'langchain/callbacks';
import { BufferMemory } from "langchain/memory";
import { HumanChatMessage, type LLMResult } from 'langchain/schema';
import { SerpAPI } from "langchain/tools";
// REF: https://github.com/hwchase17/langchainjs/blob/main/examples/src/chat/overview.ts
export const POST = (async ({ request }: RequestEvent) => {
  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY env variable not set')
    }

    const body = await request.json()
    console.log('body: ', body);

    if (!body) {
      throw new Error('No request data')
    }
    // Using ChatPromptTemplate and a chat model
    // NOTE This is STREAMING, so slightly different setup
    // REF: LC Basics: chat/streaming.ts
    // REF: node/lc/dist/llms/tests/openai-chat.int.test.js
    let tokenUsage = {
      completionTokens: 0,
      promptTokens: 0,
      totalTokens: 0,
    };
    let streamedCompletion = "";

    // let data = '';
    // Q: ChatOpenAI() or OpenAIChat()? NextJS examples are OpenAIChat()
    const model = new OpenAIChat({
      // maxTokens: 10, 
      openAIApiKey: OPENAI_API_KEY,
      modelName: "gpt-3.5-turbo",
      streaming: true,
      cache: true,
      temperature: 0,
      callbackManager: CallbackManager.fromHandlers({
        async handleLLMNewToken(token: string) {
          console.log({ token });
          tokenUsage.totalTokens += 1;
          streamedCompletion += token;
          // data += JSON.stringify({ data: token }) + '\n\n'
          // console.log({ data });
        },
        async handleLLMEnd(output: LLMResult) {
          // console.log({ output });
          // { output: { generations: [ [Array] ], llmOutput: undefined } }
          // output.generations.forEach(g => console.log(g))
          // [
          //   {
          //     text: 'Blue in Mandarin is 蓝色 (lán sè).',
          //     message: AIChatMessage { text: 'Blue in Mandarin is 蓝色 (lán sè).' }
          //   }
          // ]
          console.log(JSON.stringify(output, null, 2));
          // Q: Should I be adding these generations Array to the Response
          // somehow? Wouldn't this be appended to 'history' or something?
          tokenUsage = output.llmOutput?.tokenUsage;
          console.log({ tokenUsage });
          console.log({ streamedCompletion });
        }
      }),
    });

    // const model = new ChatOpenAI({ temperature: 0 });
    const prompt = ChatPromptTemplate.fromPromptMessages([
      SystemMessagePromptTemplate.fromTemplate(
        "You are a native Mandarin speaker teaching a beginner Mandarin class to non-native speakers. You strive to make learning fun for your students and you simplify key concepts. 你名字叫蔡老师!"
      ),
      // NOTE Variable name ('history') must match in chain.call()!
      new MessagesPlaceholder("history"),
      // NOTE Template input variable ('query') must match in chain.call()!
      HumanMessagePromptTemplate.fromTemplate("{question}"),
    ])

    const chain = new ConversationChain({
      llm: model,
      prompt: prompt,
      memory: new BufferMemory({
        // chatHistory: body.history,
        returnMessages: true,
        memoryKey: "history",
        inputKey: "question",
      }),
    });
    console.log('chain: ', chain);

    // Now we're ready to send over to the LLM for processing
    // based on user input, which has been formatted to the prompt
    const chainResponse = await chain.call({
      history: body.history,
      question: body.question
    });
    console.log('chainResponse: ', chainResponse);
    // chainResponse:  { response: 'Yellow in Mandarin is 黄色 (huáng sè).' }
    console.log('chain.serialize(): ', chain.serialize())

    // Q: How to properly return a response??????
    // NOTE In the GPT4 PDF video, he returns JSON.stringify(data),
    // where 'data' has:     
    // - response1 (CoversationChain LLMResult), 
    // - yearsArray, 
    // - namespaces, 
    // - response2 (QAChain LLMResult)
    const data = {
      chainResponse,
    } // Nope
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      }
    })

  } catch (err) {
    console.error(err)
    return json({ error: 'There was an error processing your request' }, { status: 500 })
  }
}) satisfies RequestHandler;

