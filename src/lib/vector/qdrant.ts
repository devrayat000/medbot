// Qdrant REST client initialization and helpers
import { QdrantClient } from "@qdrant/js-client-rest";

let client: QdrantClient | null = null;

export function getQdrantClient(): QdrantClient {
  const url = process.env.QDRANT_URL;
  const apiKey = process.env.QDRANT_API_KEY;
  if (!url) {
    throw new Error("Missing QDRANT_URL environment variable");
  }
  if (client) return client;
  client = new QdrantClient({ url, apiKey });
  return client;
}

export function getQdrantCollection(): string {
  const collection = process.env.QDRANT_COLLECTION;
  if (!collection) {
    throw new Error("Missing QDRANT_COLLECTION environment variable");
  }
  return collection;
}
