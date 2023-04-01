import { OPENAI_API_KEY } from '$env/static/private'
import type { 
  RequestHandler, 
  RequestEvent, 
} from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';
// import { getTokens } from '$lib/tokenizer'
import type { Config } from '@sveltejs/adapter-vercel'
import { OpenAI } from "langchain/llms";
import { ChatOpenAI } from "langchain/chat_models";
import { AgentExecutor, ChatAgent } from "langchain/agents";
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  MessagesPlaceholder,
  SystemMessagePromptTemplate,
} from "langchain/prompts";
import { ConversationChain, LLMChain } from "langchain/chains";
import { CallbackManager } from 'langchain/callbacks';
import { BufferMemory } from "langchain/memory";
import { HumanChatMessage, SystemChatMessage } from "langchain/schema";
import { SerpAPI } from "langchain/tools";


// export const config: Config = {
//   runtime: 'nodejs18.x'
// }

export const GET = (({ url }) => {
  const min = Number(url.searchParams.get('min') ?? '0');
  const max = Number(url.searchParams.get('max') ?? '1');
 
  const d = max - min;
 
  if (isNaN(d) || d < 0) {
    throw error(400, 'min and max must be numbers, and min must be less than max');
  }
 
  const random = min + Math.random() * d;
 
  return new Response(String(random));
}) satisfies RequestHandler;

// REF: https://github.com/hwchase17/langchainjs/blob/main/examples/src/chat/overview.ts
export const POST = (async (event: RequestEvent) => {
  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY env variable not set')
    }

    const requestData = await event.request.json()
    console.log('requestData: ', requestData);

    if (!requestData) {
      throw new Error('No request data')
    }

    // Using ChatPromptTemplate and a chat model
    // NOTE This is STREAMING, so slightly different setup
    // REF: LC Basics: chat/streaming.ts
    const chatModel = new ChatOpenAI({
      modelName: "gpt-3.5-turbo",
      streaming: true,
      temperature: 0,
      callbackManager: CallbackManager.fromHandlers({
        async handleLLMNewToken(token: string) {
          console.log({ token });
        },
      }),
    });

    const model = new ChatOpenAI({ temperature: 0 });
    const chatPrompt = ChatPromptTemplate.fromPromptMessages([
      SystemMessagePromptTemplate.fromTemplate(
        "You are a native Mandarin speaker teaching a beginner Mandarin class to non-native speakers. You strive to make learning fun for your students and you simplify key concepts. 你名字叫蔡老师!"
      ),
      // NOTE Variable name ('history') must match in chain.call()!
      new MessagesPlaceholder("history"),
      // NOTE Template input variable ('query') must match in chain.call()!
      HumanMessagePromptTemplate.fromTemplate("{query}"),
    ])
    const chatChain = new ConversationChain({
      llm: model,
      prompt: chatPrompt,
      memory: new BufferMemory({ returnMessages: true }),
    });
    // Now we're ready to send over to the LLM for processing
    // based on user input, which has been formatted to the prompt
    const chatResponse = await chatChain.call({
      question: "How do you say 'See you later' in Chinese?",
      history: "Chat history..."
      // query: requestData.messages[requestData.messages.length - 1].content,
      // history: requestData.messages
    });
    console.log('chatResponse: ', chatResponse);

    // Q: How to add/use Agents + Tools + Executor?
    // REF: LC Basics: chat/agent.ts
    // const agent = new ZeroShotAgent({
    //   llmChain,
    //   allowedTools: tools.map((tool) => tool.name),
    // });

    // const executor = AgentExecutor.fromAgentAndTools({ agent, tools });

    // const response = await executor.run(
    //   "How many people live in canada as of 2023?"
    // );

    if (!chatResponse.ok) {
      const err = await chatResponse.json()
      throw new Error(err.error.message);
    }

    return new Response(chatResponse.body, {
      headers: {
        'Content-Type': 'text/event-stream'
      }
    })

  } catch (err) {
    console.error(err)
    return json({ error: 'There was an error processing your request' }, { status: 500 })
  }
}) satisfies RequestHandler;

