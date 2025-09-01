import { embed } from "ai";
import { google } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { geminiIndex } from "@/lib/vector/pinecone";

// const dmr = createOpenAI({
//   baseURL: "http://localhost:12434/engines/llama.cpp/v1",
//   apiKey: "sk",
//   name: "docker",
// });

// Use Google text embedding model for queries and documents.
// gemini-embedding-exp-01 is a current general-purpose text embedding model.
// const embeddingModel = dmr.textEmbeddingModel(
//   "hf.co/nomic-ai/nomic-embed-text-v2-moe-gguf",
// );
const embeddingModel = google.textEmbeddingModel("gemini-embedding-001");

export async function generateEmbedding(value: string) {
  const input = value.replaceAll("\n", " ").trim();
  const { embedding } = await embed({ model: embeddingModel, value: input });
  return embedding;
}

export async function findRelevantContent(
  userQuery: string,
  opts?: { topK?: number; scoreThreshold?: number },
) {
  const topK = opts?.topK ?? 6;
  const threshold = opts?.scoreThreshold ?? 0.2; // cosine similarity approx (Qdrant returns 1 - cosine by default when using cosine metric)

  const vector = await generateEmbedding(userQuery);

  const res = await geminiIndex.query({
    topK,
    vector,
    includeMetadata: true,
  });

  return res.matches.map((p) => ({
    id: p.id,
    score: p.score,
    content: p.metadata?.text,
  }));
}
