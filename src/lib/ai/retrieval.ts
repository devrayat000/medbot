import { embed } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { getQdrantClient, getQdrantCollection } from "@/lib/vector/qdrant";

const dmr = createOpenAI({
  baseURL: "http://localhost:12434/engines/llama.cpp/v1",
  apiKey: "sk",
  name: "docker",
});

// Use Google text embedding model for queries and documents.
// gemini-embedding-exp-01 is a current general-purpose text embedding model.
const embeddingModel = dmr.textEmbeddingModel(
  "hf.co/nomic-ai/nomic-embed-text-v2-moe-gguf",
);

export async function generateEmbedding(value: string) {
  const input = value.replaceAll("\n", " ").trim();
  const { embedding } = await embed({ model: embeddingModel, value: input });
  return embedding;
}

export type RetrievedChunk = {
  content: string;
  score: number;
  id?: string;
  metadata?: Record<string, unknown>;
};

export async function findRelevantContent(
  userQuery: string,
  opts?: { topK?: number; scoreThreshold?: number },
): Promise<RetrievedChunk[]> {
  const topK = opts?.topK ?? 6;
  const threshold = opts?.scoreThreshold ?? 0.2; // cosine similarity approx (Qdrant returns 1 - cosine by default when using cosine metric)

  const [client, collection, vector] = await Promise.all([
    Promise.resolve(getQdrantClient()),
    Promise.resolve(getQdrantCollection()),
    generateEmbedding(userQuery),
  ]);

  // Search in Qdrant
  const res = await client.search(collection, {
    vector,
    limit: topK,
    with_payload: true,
    with_vector: false,
    score_threshold: threshold,
  });

  return res.map((p) => ({
    id: typeof p.id === "string" ? p.id : String(p.id),
    content: (p.payload?.text as string) ?? "",
    score: p.score ?? 0,
    // metadata: (p.payload as Record<string, unknown>) ?? {},
  }));
}
