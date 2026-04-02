import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { MIU_KNOWLEDGE_BASE } from '../lib/knowledge-base';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const openaiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !supabaseKey || !openaiKey) {
  console.error("Missing environment variables. Ensure .env.local has SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and OPENAI_API_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const openai = new OpenAI({ apiKey: openaiKey });

async function seed() {
  console.log("Starting Knowledge Base Seeding...");

  // Split the KB into meaningful chunks (simple split by double newline for now)
  const chunks = MIU_KNOWLEDGE_BASE.split('\n\n').filter(c => c.trim().length > 10);

  console.log(`Processing ${chunks.length} chunks...`);

  // Clear existing documents
  const { error: deleteError } = await supabase.from('documents').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (deleteError) console.warn("Note: Could not clear documents table (might be empty).", deleteError.message);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`Embedding chunk ${i + 1}/${chunks.length}...`);

    try {
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunk,
      });

      const embedding = embeddingResponse.data[0].embedding;

      const { error } = await supabase.from('documents').insert({
        content: chunk,
        embedding: embedding,
      });

      if (error) throw error;
    } catch (err: any) {
      console.error(`Error processing chunk ${i}:`, err.message);
    }
  }

  console.log("Seeding complete!");
}

seed();
