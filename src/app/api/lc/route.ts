import { pull } from "langchain/hub";
import { PineconeStore } from "@langchain/pinecone";
import {
  ChatGoogleGenerativeAI,
  GoogleGenerativeAIEmbeddings,
} from "@langchain/google-genai";
import { Pinecone } from "@pinecone-database/pinecone";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import {
  RunnableMap,
  RunnablePassthrough,
  RunnableSequence,
} from "@langchain/core/runnables";
import { AIMessageChunk, HumanMessage } from "@langchain/core/messages";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "gemini-embedding-001",
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const vectorStore = new PineconeStore(embeddings, {
  pineconeIndex: pinecone.Index(process.env.PINECONE_INDEX!),
});
const prompt = await pull<ChatPromptTemplate>("rlm/rag-prompt");
// const prompt = ChatPromptTemplate.fromMessages([
//   { role: "system", content: "" },
//   { role: "user", content: "{question}" },
// ]);

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-pro",
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
  temperature: 0.2,
  //   maxOutputTokens: 512,
  // topP: 0.8,
  // topK: 40,
  // stopWhen: ["\nObservation:"],
});

const input = RunnableMap.from({
  question: new RunnablePassthrough(),
  context: vectorStore.asRetriever({
    k: 5,
  }),
});

const chain = RunnableSequence.from<string, AIMessageChunk>([
  input,
  prompt,
  llm,
  //   new StringOutputParser(),
]);

export async function POST(request: Request) {
  const { id, messages } = await request.json();
  const modelMessages = convertToModelMessages(messages);

  const message = new HumanMessage({ content: modelMessages.at(-1)?.content! });

  //   console.log(
  //     await prompt.invoke({ question: message.text, context: ["test"] }),
  //   );
  //   console.log(await chain.invoke(message.text));

  const uiStream = createUIMessageStream({
    generateId: () => crypto.randomUUID(),
    async execute({ writer }) {
      writer.write({
        type: "start",
      });
      writer.write({
        type: "start-step",
      });

      const responseId = crypto.randomUUID();

      writer.write({ type: "text-start", id: responseId });

      const stream = await chain.stream(message.text);
      console.log("generating stream...");

      for await (const aiMessage of stream) {
        console.log(aiMessage);

        writer.write({
          id: responseId,
          type: "text-delta",
          delta: aiMessage.content,
          //   data: aiMessage.content,
        });
      }
      console.log("stream ended");

      writer.write({ type: "text-end", id: responseId });

      writer.write({
        type: "finish-step",
      });
      writer.write({
        type: "finish",
      });
    },
  });

  return createUIMessageStreamResponse({ stream: uiStream });
}
