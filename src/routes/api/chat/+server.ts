import { OPENAI_API_KEY } from '$env/static/private'
import type { 
  RequestHandler, 
  RequestEvent, 
} from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';
import { ChatOpenAI } from "langchain/chat_models";
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
import type { LLMResult } from 'langchain/schema';
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
export const POST = (async ({ request }: RequestEvent) => {
  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY env variable not set')
    }

    const requestData = await request.json()
    console.log('requestData: ', requestData);

    if (!requestData) {
      throw new Error('No request data')
    }

    // U: Trying out a helper to write 'data' to Response
    // let serverResponse = new Response();
    // function sendData(data: string) {
    //   serverResponse.body?.pipeTo = `data: ${data}\n\n`;
    // }

    // OpenAI recommends replacing newlines with spaces for best results
    // const sanitizedQuestion = requestData.query.trim().replaceAll('\n', ' ');

    // ---------
    // NOTE Taken from langchain 'openai-chat streaming' test
    // Looks like I do need to track tokens
    // REF: lc/dist/llms/tests/openai-chat.int.test.js
    // let nrNewTokens = 0;
    // let streamedCompletion = "";
    // const model = new OpenAIChat({
    //     maxTokens: 10,
    //     modelName: "gpt-3.5-turbo",
    //     streaming: true,
    //     callbackManager: CallbackManager.fromHandlers({
    //         async handleLLMNewToken(token) {
    //             nrNewTokens += 1;
    //             streamedCompletion += token;
    //         },
    //     }),
    // });
    // const res = await model.call("Print hello world");
    // console.log({ res });
    // ---------

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

    const model = new ChatOpenAI({
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
        },
        async handleLLMEnd(output: LLMResult) {
          console.log({ output });
          // { output: { generations: [ [Array] ], llmOutput: undefined } }
          // output.generations.forEach(g => console.log(g))
          // [
          //   {
          //     text: 'Blue in Mandarin is 蓝色 (lán sè).',
          //     message: AIChatMessage { text: 'Blue in Mandarin is 蓝色 (lán sè).' }
          //   }
          // ]
          // Q: Should I be adding these generations Array to the Response
          // somehow? Wouldn't this be appended to 'history' or something?
          tokenUsage = output.llmOutput?.tokenUsage;
          console.log({ tokenUsage });
          console.log({ streamedCompletion });
          // Q: Should I be returning Response here?
          // A: No, this is just a callback
          // return new Response(chainResponse.response, {
          //   headers: {
          //     'Content-Type': 'text/event-stream',
          //     // 'Cache-Control': 'no-cache, no-transform',
          //     // Connection: 'keep-alive',
          //   }
          // })
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

    // LLMChain version:
    // const llmChain = new LLMChain({
    //   llm: model,
    //   prompt: prompt,
    // })

    // ConversationChain version (extends LLMChain):
    // FIXME: "Error: input values have multiple keys, memory only supported when one key currently"
    // REF: https://discord.com/channels/1038097195422978059/1076182741374214285/1086420028301262908
    // NOTE: There is a memoryKey, inputKey & outputKey optional fields to pass
    // memoryKey: "history", // Default is 'memory'
    // inputKey: "question", // Default is 'input'
    // outputKey: "answer", // Default is 'response'
    // U: WORKS! Gotta specify the memoryKey: "history", or you end up passing both variables
    const chain = new ConversationChain({
      llm: model,
      prompt: prompt,
      memory: new BufferMemory({
        returnMessages: true,
        memoryKey: "history",
        inputKey: "question",
        // outputKey: "answer", // Default is 'response' 
      }),
    });
    console.log('chain: ', chain);

    // const chainResponse = await llmChain.call({
    //   question: requestData.question,
    //   history: requestData.history || []
    // })
    // console.log('chainResponse: ', chainResponse);


    // Now we're ready to send over to the LLM for processing
    // based on user input, which has been formatted to the prompt
    const chainResponse = await chain.call({
      // question: requestData,
      // history: "Chat history..."
      question: requestData.question,
      history: requestData.history
    });
    console.log('chainResponse: ', chainResponse);
    // chainResponse:  { response: 'Yellow in Mandarin is 黄色 (huáng sè).' }
    console.log('chain.serialize(): ', chain.serialize())


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
    // NOTE Another approach to creating Executor:
    // REF: https://discord.com/channels/1038097195422978059/1076182741374214285/1086433629623832767
    //  const executor = AgentExecutor.fromAgentAndTools({
    //   agent: ChatConversationalAgent.fromLLMAndTools(chat, tools, {
    //     systemMessage: promptSelection.prompt,
    //   }),
    //   tools,
    //   verbose: true,
    //   callbackManager: getCallbackManager(),
    // });

    // NOTE: For NextJS, there are a couple things to note
    // about headers. Not sure if applies to SK:
    // REF: Important to set no-transform to avoid compression, which will delay
    // writing response chunks to the client.
    // See https://github.com/vercel/next.js/issues/9965
    // Q: Do I need to use Connection: 'keep-alive'?
    // Q: Need JSON.stringify()?
    // return json(chainResponse.response, {
    //   headers: {
    //     'Content-Type': 'text/event-stream',
    //     // 'Cache-Control': 'no-cache, no-transform',
    //     // Connection: 'keep-alive',
    //   }
    // });
    // Q: How to properly return a response??????
    // NOTE In the GPT4 PDF video, he returns JSON.stringify(data),
    // where 'data' has:     
    // - response1 (CoversationChain LLMResult), 
    // - yearsArray, 
    // - namespaces, 
    // - response2 (QAChain LLMResult)
    const data = {
      chainResponse,
    }
    return new Response(JSON.stringify(data), {
        headers: {
          'Content-Type': 'text/event-stream',
          // 'Cache-Control': 'no-cache, no-transform',
          // Connection: 'keep-alive',
        }
    })

  } catch (err) {
    console.error(err)
    return json({ error: 'There was an error processing your request' }, { status: 500 })
  }
}) satisfies RequestHandler;
