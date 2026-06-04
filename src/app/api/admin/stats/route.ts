import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
    try {
        // Fetch all user_chats (using admin client to bypass RLS)
        const { data: chats, error: chatsError } = await supabaseAdmin
            .from("user_chats")
            .select("id, user_id, title, messages, updated_at")
            .order("updated_at", { ascending: false });

        if (chatsError) {
            throw new Error(`Failed to fetch chats: ${chatsError.message}`);
        }

        // Fetch all api_keys
        const { data: apiKeys, error: keysError } = await supabaseAdmin
            .from("api_keys")
            .select("id, user_id, created_at");

        if (keysError) {
            throw new Error(`Failed to fetch API keys: ${keysError.message}`);
        }

        // Calculate statistics
        const totalChats = chats?.length || 0;
        let totalMessages = 0;
        const uniqueUsers = new Set<string>();

        // Analyze chats and messages
        const analyzedChats = (chats || []).map((chat) => {
            let messageCount = 0;
            try {
                // Determine message count based on whether it's an array
                const messagesArray = Array.isArray(chat.messages) ? chat.messages : JSON.parse(chat.messages as unknown as string || "[]");
                messageCount = messagesArray.length;
                totalMessages += messageCount;
            } catch (e) {
                // Ignore parsing errors for empty/invalid json
            }

            if (chat.user_id) {
                uniqueUsers.add(chat.user_id);
            }

            return {
                id: chat.id,
                user_id: chat.user_id,
                title: chat.title,
                message_count: messageCount,
                updated_at: chat.updated_at,
            };
        });

        // Add users from api keys as well
        (apiKeys || []).forEach(key => {
            if (key.user_id) uniqueUsers.add(key.user_id);
        });

        const stats = {
            totalUsers: uniqueUsers.size,
            totalChats,
            totalMessages,
            totalApiKeys: apiKeys?.length || 0,
        };

        return NextResponse.json({
            stats,
            recentChats: analyzedChats.slice(0, 50), // Send top 50 recent chats for the table
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("[ADMIN_STATS_ERROR]", error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
