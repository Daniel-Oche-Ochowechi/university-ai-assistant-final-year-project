import { openai } from "@/lib/openai";
import { getRelevantDocuments } from "@/lib/vector-search";
import { search } from "duck-duck-scrape";

// Using Node.js runtime for maximum compatibility with all dependencies
export const runtime = "nodejs";

export async function GET() {
    return Response.json({ status: "API is active", model: "Kimi-K2-Thinking" });
}

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        if (!messages || messages.length === 0) {
            return Response.json({ error: "Messages are required" }, { status: 400 });
        }

        // 1. RAG — Vector Search for relevant documents
        const lastUserMessage = messages.slice().reverse().find((m: { role: string; content?: string }) => m.role === "user");
        const userQuery = lastUserMessage?.content || "";
        const relevantDocs = await getRelevantDocuments(userQuery);
        const contextText = relevantDocs.map((doc: { content: string }) => doc.content).join("\n\n");

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

        const apiMessages: { role: string; content: string }[] = [
            { role: "system", content: systemContent },
            ...messages,
        ];

        // 3. Call NVIDIA Kimi-K2-Thinking (streaming)
        const stream = await openai.chat.completions.create({
            model: "moonshotai/kimi-k2-thinking",
            messages: apiMessages as Parameters<typeof openai.chat.completions.create>[0]["messages"],
            temperature: 1,
            top_p: 0.9,
            max_tokens: 16384,
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
                        // so the frontend can distinguish them from the final answer.
                        const reasoning = delta?.reasoning_content;
                        if (reasoning) {
                            if (!isThinking) {
                                // Signal start of reasoning block
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
