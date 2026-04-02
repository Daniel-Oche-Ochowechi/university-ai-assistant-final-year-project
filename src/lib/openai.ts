import OpenAI from "openai";

// Primary client: NVIDIA-hosted Kimi-K2-Thinking model
export const openai = new OpenAI({
    apiKey: process.env.NVIDIA_API_KEY || "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",
    baseURL: "https://integrate.api.nvidia.com/v1",
});

// Secondary client: OpenAI for embeddings (text-embedding-3-small)
// NVIDIA's endpoint does not serve OpenAI embedding models.
export const embeddingOpenai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "dummy_key",
});
