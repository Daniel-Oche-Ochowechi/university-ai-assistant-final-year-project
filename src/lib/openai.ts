import OpenAI from "openai";

// Primary client: standard OpenAI API
export const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Secondary client: alias to primary client, for embedding uses
export const embeddingOpenai = openai;
