import { google } from '@ai-sdk/google';
import { convertToModelMessages, streamText, UIMessage, tool, stepCountIs } from 'ai';
import { findRelevantContent } from '@/lib/ai/retrieval';
import { z } from 'zod';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: google('gemini-2.5-flash'),
    messages: convertToModelMessages(messages),
    system: `You are a helpful assistant for a medical RAG app. Only answer using information from tool calls.
If no relevant information is found in the tool calls, respond exactly: "Sorry, I don't know."`,
    stopWhen: stepCountIs(5),
    tools: {
      getInformation: tool({
        description: 'get information from your Qdrant knowledge base to answer questions',
        inputSchema: z.object({
          question: z.string().describe('the user\'s question'),
          topK: z.number().int().min(1).max(12).optional(),
        }),
        execute: async ({ question, topK }) => {
          try {
            const results = await findRelevantContent(question, { topK });
            // Return compact context for the model
            return results.map((r) => ({ content: r.content, score: r.score }));
          } catch (err) {
            const message = err instanceof Error ? err.message : 'unknown error';
            return [{ content: '', score: 0, error: `retrieval failed: ${message}` }];
          }
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
