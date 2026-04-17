import { openai } from "@/lib/openai";
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


        // Bypassing slow web scraping and database calls to guarantee blazing-fast OpenAI latency
        const systemContent = [
            "You are a helpful, lightning-fast AI assistant for Mewar International University (MIU) Nigeria.",
            "Answer questions accurately and concisely. Rely on your integrated OpenAI intelligence and the comprehensive knowledge base below.",
            `\n## Core Knowledge Base\n${MIU_KNOWLEDGE_BASE}`,
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
