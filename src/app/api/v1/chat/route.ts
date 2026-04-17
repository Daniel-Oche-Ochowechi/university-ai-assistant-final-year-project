import { openai } from "@/lib/openai";
import { getRelevantDocuments } from "@/lib/vector-search";
import { search } from "duck-duck-scrape";
import { MIU_KNOWLEDGE_BASE } from "@/lib/knowledge-base";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: Request) {
    try {
        // 1. Authenticate via Bearer Token
        const authHeader = req.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return Response.json({ error: "Missing or invalid Authorization header. Expected format: Bearer <API_KEY>" }, { status: 401 });
        }

        const apiKey = authHeader.replace("Bearer ", "").trim();

        // Validate Key against Database
        const { data: keyRecord, error: keyError } = await supabase
            .from("api_keys")
            .select("id, user_id")
            .eq("key", apiKey)
            .single();

        if (keyError || !keyRecord) {
            return Response.json({ error: "Invalid API Key" }, { status: 401 });
        }

        // 2. Parse Request
        const body = await req.json();
        const { messages, stream = false } = body;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return Response.json({ error: "Messages array is required" }, { status: 400 });
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

        // 3. Delegate to OpenAI Model
        if (!stream) {
            // Standard JSON response
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: apiMessages,
                temperature: 0.7,
                stream: false,
            });

            return Response.json({
                id: completion.id,
                object: "chat.completion",
                created: completion.created,
                model: completion.model,
                choices: [
                    {
                        index: 0,
                        message: {
                            role: "assistant",
                            content: completion.choices[0].message.content
                        },
                        finish_reason: completion.choices[0].finish_reason
                    }
                ]
            });
        } else {
            // Server-Sent Events (SSE) stream response
            const streamCompletion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: apiMessages,
                temperature: 0.7,
                stream: true,
            });

            const encoder = new TextEncoder();
            return new Response(
                new ReadableStream({
                    async start(controller) {
                        for await (const chunk of streamCompletion) {
                            const data = `data: ${JSON.stringify(chunk)}\n\n`;
                            controller.enqueue(encoder.encode(data));
                        }
                        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                        controller.close();
                    },
                }),
                { 
                    headers: { 
                        "Content-Type": "text/event-stream",
                        "Cache-Control": "no-cache",
                        "Connection": "keep-alive",
                    } 
                }
            );
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("[DEV_API_CHAT_ERROR]", error);
        return Response.json({ error: message }, { status: 500 });
    }
}
