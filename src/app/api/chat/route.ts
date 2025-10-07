import { google, GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import {
  convertToModelMessages,
  streamText,
  UIMessage,
  tool,
  stepCountIs,
  hasToolCall,
  generateText,
} from "ai";
import { findRelevantContent } from "@/lib/ai/retrieval";
import { z } from "zod";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  google.tools.googleSearch;
  const result = streamText({
    model: google("gemini-2.5-flash"),
    temperature: 0.2,
    messages: convertToModelMessages(messages),
    system: `You are a helpful assistant.\
    Always call the 'getInformation' tool to retrieve \
    information from the knowledge base.`,
    // maxOutputTokens: 512,
    stopWhen: stepCountIs(2),
    prepareStep: ({ stepNumber, steps }) => {
      if (stepNumber === 0) {
        return {
          toolChoice: { type: "tool", toolName: "getInformation" }, // MUST call tool now
        };
      }
      return {
        toolChoice: "none", // no tools, generate text
      };
    },
    tools: {
      getInformation: tool({
        description:
          "get information from your Qdrant knowledge base to answer questions",
        inputSchema: z.object({
          question: z.string()
            .describe(`A self-contained search query formulated from the user's request and conversation history.\
            The query should be concise, keyword-rich, and capture the core semantic intent for searching a vector database.`),
        }),
        providerOptions: {
          google: {} satisfies GoogleGenerativeAIProviderOptions,
        },
        type: "function",
        execute: async ({ question }, { messages, abortSignal }) => {
          console.log("Executing getInformation tool with question:", question);
          try {
            const prompt = await generateText({
              model: google("gemini-2.5-pro"),
              messages,
              system: `You are an expert at rewriting user questions into effective search queries for a vector database.\
              Based on the conversation history and the latest user question, formulate a self-contained search query.\
              The query should be concise, rich in keywords, and stripped of conversational filler.\
              It should capture the core semantic intent of the user's request.`,
              // prompt: question,
              abortSignal,
            });

            const results = await findRelevantContent(prompt.text, {
              topK: 5,
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
    // toolChoice: { toolName: "getInformation", type: "tool" },
  });

  return result.toUIMessageStreamResponse();
}
