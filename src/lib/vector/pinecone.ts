import { Pinecone, type RecordMetadata } from "@pinecone-database/pinecone";

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

export interface MedBotRecord extends RecordMetadata {
  text: string;
  subject: string;
  chapter_number: string;
  chapter_title: string;
  page: number;
}

export const geminiIndex = pc.Index<MedBotRecord>(process.env.PINECONE_INDEX!);
