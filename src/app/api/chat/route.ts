import { google } from "@ai-sdk/google";
import {
  convertToModelMessages,
  streamText,
  UIMessage,
  tool,
  stepCountIs,
  generateText,
} from "ai";
import { findRelevantContent } from "@/lib/ai/retrieval";
import { z } from "zod";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: google("gemini-2.5-pro"),
    messages: convertToModelMessages(messages),
    system: `You are a helpful assistant.`,
    stopWhen: stepCountIs(5),
    tools: {
      getInformation: tool({
        description:
          "get information from your Qdrant knowledge base to answer questions",
        inputSchema: z.object({
          question: z.string().describe("the user's question"),
        }),
        execute: async ({ question }, { messages, abortSignal }) => {
          try {
            const prompt = await generateText({
              model: google("gemini-2.5-flash"),
              messages,
              system: `You are a retriever. \
              Use the messages from the chat history and formulate a concise prompt including important keywords \
              search through a vector database in 80-100 words.`,
              abortSignal,
            });
            console.log(prompt.text);

            const results = await findRelevantContent(prompt.text, {
              topK: 12,
            });
            // Return compact context for the model
            return results.map((r) => ({ content: r.content, score: r.score }));
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "unknown error";
            return [
              { content: "", score: 0, error: `retrieval failed: ${message}` },
            ];
          }
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
