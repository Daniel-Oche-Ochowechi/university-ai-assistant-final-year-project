import { openai } from "@/lib/openai";
import { getRelevantDocuments } from "@/lib/vector-search";
import { search } from "duck-duck-scrape";

// Using Node.js runtime for maximum compatibility with all dependencies
export const runtime = "nodejs";

export async function GET() {
    return Response.json({ status: "API is active", model: "Hybrid (Kimi-K2-Thinking / GPT-4o Vision)" });
}

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        if (!messages || messages.length === 0) {
            return Response.json({ error: "Messages are required" }, { status: 400 });
        }

        // Check if the conversation has any images uploaded to enable Vision mode
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hasImage = messages.some((m: any) => m.imageUrl);
        const targetModel = hasImage ? "gpt-4o" : "moonshotai/kimi-k2-thinking";

        // 1. RAG — Vector Search for relevant documents
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lastUserMessage = messages.slice().reverse().find((m: any) => m.role === "user");
        const userQuery = lastUserMessage?.content || "";
        const relevantDocs = await getRelevantDocuments(userQuery);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const contextText = relevantDocs.map((doc: any) => doc.content).join("\n\n");

        // 2. Optional web search — run proactively for queries that look like they need fresh info
        let webContext = "";
        const needsWebSearch = /news|latest|current|today|2024|2025|2026|schedule|event|announce/i.test(userQuery);
        if (needsWebSearch) {
            try {
                const searchResults = await search(`Mewar International University Nigeria ${userQuery}`);
                webContext = searchResults.results
                    .slice(0, 4)
                    .map(r => `Title: ${r.title}\nSnippet: ${r.description}`)
                    .join("\n\n");
            } catch {
                // silently ignore search failures
            }
        }

        const systemContent = [
            "You are a helpful AI assistant for Mewar International University (MIU) Nigeria.",
            "Answer questions accurately and concisely using the provided context.",
            contextText ? `\n## Knowledge Base Context\n${contextText}` : "",
            webContext ? `\n## Live Web Results\n${webContext}` : "",
        ].join("\n");

        // Format messages. If using Vision, convert imageURL to the OpenAI format
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const apiMessages: any[] = [
            { role: "system", content: systemContent },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...messages.map((m: any) => {
                if (m.imageUrl && m.role === "user") {
                    return {
                        role: m.role,
                        content: [
                            { type: "text", text: m.content || "Please analyze this image." },
                            { type: "image_url", image_url: { url: m.imageUrl } }
                        ]
                    };
                }
                return { role: m.role, content: m.content };
            })
        ];

        // 3. Call OpenAI (or Kimi-K2 if no image)
        const stream = await openai.chat.completions.create({
            model: targetModel,
            messages: apiMessages,
            temperature: 0.7, // Lower text temp for gpt-4o, kimi was 1
            max_tokens: 4000,
            stream: true,
        });

        const encoder = new TextEncoder();

        return new Response(
            new ReadableStream({
                async start(controller) {
                    let isThinking = false;

                    for await (const chunk of stream) {
                        const delta = chunk.choices[0]?.delta as {
                            content?: string;
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            reasoning_content?: string;
                        };

                        // Stream reasoning (thinking) tokens prefixed with a special marker
                        const reasoning = delta?.reasoning_content;
                        if (reasoning) {
                            if (!isThinking) {
                                controller.enqueue(encoder.encode("__THINKING_START__"));
                                isThinking = true;
                            }
                            controller.enqueue(encoder.encode(reasoning));
                        }

                        // When the final answer content starts, close the thinking block
                        if (delta?.content) {
                            if (isThinking) {
                                controller.enqueue(encoder.encode("__THINKING_END__"));
                                isThinking = false;
                            }
                            controller.enqueue(encoder.encode(delta.content));
                        }
                    }

                    // Close any still-open thinking block
                    if (isThinking) {
                        controller.enqueue(encoder.encode("__THINKING_END__"));
                    }

                    controller.close();
                },
            }),
            { headers: { "Content-Type": "text/event-stream" } }
        );
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("[CHAT_STREAM_ERROR]", error);
        return Response.json({ error: message }, { status: 500 });
    }
}
