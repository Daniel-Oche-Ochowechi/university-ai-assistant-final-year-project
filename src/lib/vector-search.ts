import { supabase } from './supabase';
import { embeddingOpenai as openai } from './openai';

export async function getRelevantDocuments(query: string, matchThreshold: number = 0.5, matchCount: number = 5) {
  try {
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });

    const embedding = embeddingResponse.data[0].embedding;

    const { data: documents, error } = await supabase.rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
    });

    if (error) throw error;

    return documents as { id: string; content: string; similarity: number }[];
  } catch (error) {
    console.error("Vector search error:", error);
    return [];
  }
}
