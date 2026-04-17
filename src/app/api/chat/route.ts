import { openai } from "@/lib/openai";
import { getRelevantDocuments } from "@/lib/vector-search";
import { search } from "duck-duck-scrape";
import { MIU_KNOWLEDGE_BASE } from "@/lib/knowledge-base";

// Using Node.js runtime for maximum compatibility with all dependencies
export const runtime = "nodejs";

export async function GET() {
    return Response.json({ status: "API is active", model: "OpenAI GPT-4o-mini" });
}

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        if (!messages || messages.length === 0) {
            return Response.json({ error: "Messages are required" }, { status: 400 });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lastUserMessage = messages.slice().reverse().find((m: any) => m.role === "user");
        const userQuery = lastUserMessage?.content || "";
        
        let webContext = "";
        const needsWebSearch = /news|latest|current|today|2024|2025|2026|schedule|event|announce/i.test(userQuery);

        // Fetch docs and web search in parallel to drastically cut response latency
        const [relevantDocs, searchResults] = await Promise.all([
            getRelevantDocuments(userQuery),
            needsWebSearch 
                ? search(`Mewar International University Nigeria ${userQuery}`).catch(() => null)
                : Promise.resolve(null)
        ]);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const contextText = relevantDocs.map((doc: any) => doc.content).join("\n\n");
        
        if (searchResults && searchResults.results) {
            webContext = searchResults.results
                .slice(0, 4)
                .map(r => `Title: ${r.title}\nSnippet: ${r.description}`)
                .join("\n\n");
        }

        const systemContent = [
            "You are a helpful and highly knowledgeable AI assistant for Mewar International University (MIU) Nigeria.",
            "Answer questions accurately and concisely. Prioritize the provided context, but if the information is missing, rely on your instructions and the comprehensive knowledge base below.",
            `\n## Core Knowledge Base\n${MIU_KNOWLEDGE_BASE}`,
            contextText ? `\n## Vector Knowledge Base Context\n${contextText}` : "",
            webContext ? `\n## Live Web Results\n${webContext}` : "",
        ].join("\n");

        // Format messages
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const apiMessages: any[] = [
            { role: "system", content: systemContent },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...messages.map((m: any) => {
                if (m.imageUrl && m.role === "user") {
                    return {
                        role: m.role,
                        content: [
                            { type: "text", text: m.content || "Please analyze this context." },
                            { type: "image_url", image_url: { url: m.imageUrl } }
                        ]
                    };
                }
                return { role: m.role, content: m.content };
            })
        ];

        const encoder = new TextEncoder();

        // 3. SINGLE ROUTING LOGIC via OPENAI
        const stream = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: apiMessages,
            temperature: 0.7,
            stream: true,
        });

        return new Response(
            new ReadableStream({
                async start(controller) {
                    for await (const chunk of stream) {
                        const delta = chunk.choices[0]?.delta as {
                            content?: string;
                        };

                        if (delta?.content) {
                            controller.enqueue(encoder.encode(delta.content));
                        }
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
