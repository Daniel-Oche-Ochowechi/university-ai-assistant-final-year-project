'use client';

import { useState, useRef, useEffect } from "react";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import { Sparkles, Brain, Search, Info, ChevronRight, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

export type Message = {
    role: "user" | "assistant" | "system" | "tool";
    content: string;
    timestamp?: Date;
    tool_call_id?: string;
    isStreaming?: boolean;
};

interface ChatWindowProps {
    chatId?: string | null;
    onChatCreated?: (id: string, title: string) => void;
    userId?: string;
}

export default function ChatWindow({ chatId, onChatCreated, userId }: ChatWindowProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const [thinkingText, setThinkingText] = useState("");
    const [isLoaded, setIsLoaded] = useState(false);
    const [showThoughts, setShowThoughts] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setIsLoaded(false);
        if (!chatId) {
            setMessages([{ role: "assistant", content: "Welcome to Nexus AI. I have full access to MIU Nigeria's knowledge base and current web data. How can I assist you in your academic journey today?", timestamp: new Date() }]);
            setIsLoaded(true);
            return;
        }

        const fetchChat = async () => {
            const { data } = await supabase.from('user_chats').select('messages').eq('id', chatId).single();
            if (data && data.messages) {
                const parsedMessages = data.messages.map((m: any) => ({
                    ...m,
                    timestamp: m.timestamp ? new Date(m.timestamp) : undefined
                }));
                setMessages(parsedMessages);
            }
            setIsLoaded(true);
        };
        fetchChat();
    }, [chatId]);

    const saveChatToDb = async (newMessages: Message[]) => {
        if (!userId) return;
        const messagesForDb = newMessages.map(m => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp?.toISOString()
        }));

        if (!chatId && onChatCreated) {
            const firstUserMsg = newMessages.find(m => m.role === 'user')?.content || 'New Chat';
            const title = firstUserMsg.length > 40 ? firstUserMsg.substring(0, 40) + '...' : firstUserMsg;
            const { data } = await supabase.from('user_chats').insert({
                user_id: userId,
                title,
                messages: messagesForDb
            }).select().single();
            if (data) onChatCreated(data.id, data.title);
        } else if (chatId) {
            await supabase.from('user_chats').update({
                messages: messagesForDb,
                updated_at: new Date().toISOString()
            }).eq('id', chatId);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading, isThinking]);

    const handleSendMessage = async (content: string) => {
        const newUserMessage: Message = { role: "user", content, timestamp: new Date() };
        const updatedMessages = [...messages, newUserMessage];
        setMessages(updatedMessages);
        setIsLoading(true);
        setIsThinking(false);
        setThinkingText("");
        
        await saveChatToDb(updatedMessages);

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    messages: updatedMessages.map(m => ({ role: m.role, content: m.content })) 
                }),
            });

            if (!response.ok) throw new Error("Failed to fetch response");
            if (!response.body) throw new Error("No response body");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let aiResponseContent = "";
            let reasoningBuffer = "";
            let inThinking = false;
            
            const aiMessage: Message = {
                role: "assistant",
                content: "",
                timestamp: new Date(),
                isStreaming: true
            };
            
            setMessages(prev => [...prev, aiMessage]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                let chunk = decoder.decode(value);

                if (chunk.includes("__THINKING_START__")) {
                    inThinking = true;
                    setIsThinking(true);
                    chunk = chunk.replace("__THINKING_START__", "");
                }
                if (chunk.includes("__THINKING_END__")) {
                    inThinking = false;
                    // Keep isThinking true for a moment for a smooth transition or UI polish
                    chunk = chunk.replace("__THINKING_END__", "");
                }

                if (inThinking) {
                    reasoningBuffer += chunk;
                    setThinkingText(reasoningBuffer);
                    continue;
                }

                if (chunk) {
                    aiResponseContent += chunk;
                    setMessages(prev => {
                        const newMessages = [...prev];
                        const lastMsg = newMessages[newMessages.length - 1];
                        if (lastMsg && lastMsg.role === "assistant") {
                            lastMsg.content = aiResponseContent;
                        }
                        return newMessages;
                    });
                }
            }

            const finalAiMessage: Message = {
                role: "assistant", content: aiResponseContent, timestamp: new Date()
            };
            const finalMessages = [...updatedMessages, finalAiMessage];
            setMessages(finalMessages);
            await saveChatToDb(finalMessages);
        } catch (error: any) {
            console.error(error);
            const errorMsg: Message = { role: "assistant", content: error.message || "Connection interrupted.", timestamp: new Date() };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
            setIsThinking(false);
        }
    };

    const clearChat = () => { if (onChatCreated) onChatCreated("", "New Chat"); };

    return (
        <div className="flex w-full h-full relative overflow-hidden bg-transparent">

            {/* Left side: Main Chat */}
            <div className="flex-1 flex flex-col min-w-0 border-r border-white/[0.04]">
                
                {/* Minimal Header */}
                <header className="px-8 py-5 border-b border-white/[0.04] bg-white/[0.01] backdrop-blur-3xl flex items-center justify-between z-20">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                            <Sparkles className="text-indigo-400" size={18} />
                        </div>
                        <div>
                            <h1 className="text-sm font-bold text-white tracking-tight">Nexus Dialogue</h1>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Active Channel</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                         {isThinking && (
                            <motion.div 
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-400 flex items-center gap-2 uppercase tracking-widest"
                            >
                                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
                                Analyzing Data
                            </motion.div>
                         )}
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto px-6 py-8 custom-scrollbar">
                    <div className="max-w-3xl mx-auto">
                        {!isLoaded ? (
                             <div className="flex items-center justify-center h-40">
                                <Loader2 size={24} className="animate-spin text-indigo-500/30" />
                             </div>
                        ) : (
                            <AnimatePresence mode="popLayout" initial={false}>
                                {messages.filter(msg => msg.role !== "system" && msg.role !== "tool").map((msg, index) => (
                                    <MessageBubble
                                        key={index}
                                        role={msg.role as any}
                                        content={msg.content}
                                        timestamp={msg.timestamp}
                                    />
                                ))}
                            </AnimatePresence>
                        )}
                        <div ref={messagesEndRef} className="h-20" />
                    </div>
                </main>

                <div className="bg-gradient-to-t from-[#020617] via-[#020617] to-transparent pt-10 pb-4">
                    <ChatInput
                        onSendMessage={handleSendMessage}
                        onClearChat={clearChat}
                        isLoading={isLoading}
                    />
                </div>
            </div>

            {/* Right side: Thought Sidebar (Only visible when thinking or if explicitly toggled) */}
            <AnimatePresence>
                {(isThinking || (thinkingText && showThoughts)) && (
                    <motion.aside
                        initial={{ opacity: 0, x: 320 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 320 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="hidden lg:flex flex-col w-[350px] bg-white/[0.01] backdrop-blur-3xl border-l border-white/[0.04] relative z-30"
                    >
                        <div className="absolute top-0 right-0 w-full h-[500px] bg-indigo-500/[0.03] blur-[100px] pointer-events-none" />
                        
                        <div className="p-6 border-b border-white/[0.04] flex items-center justify-between relative">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20">
                                    <Brain className="text-violet-400" size={18} />
                                </div>
                                <h3 className="font-bold text-sm tracking-tight">Neural Processing</h3>
                            </div>
                            <button 
                                onClick={() => setShowThoughts(false)}
                                className="p-2 rounded-lg hover:bg-white/5 transition-colors text-slate-500"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6 relative">
                            {/* Reasoning Stepper (Mock or real) */}
                            <div className="space-y-4">
                                <div className="flex gap-4">
                                    <div className="flex flex-col items-center">
                                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full ring-4 ring-indigo-500/20" />
                                        <div className="flex-1 w-[1px] bg-white/5 my-2" />
                                    </div>
                                    <div className="pb-4">
                                        <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Knowledge Retrieval</p>
                                        <p className="text-xs text-slate-400 leading-relaxed font-medium">Accessing MIU Nigeria vector database for relevant documents...</p>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex flex-col items-center">
                                        <div className="w-1.5 h-1.5 bg-violet-500 rounded-full ring-4 ring-violet-500/20" />
                                        <div className="flex-1 w-[1px] bg-white/5 my-2" />
                                    </div>
                                    <div className="pb-4">
                                        <p className="text-[11px] font-bold text-violet-400 uppercase tracking-widest mb-1">Live Web Analysis</p>
                                        <p className="text-xs text-slate-400 leading-relaxed font-medium">Proactively searching DuckDuckGo for latest 2026 academic updates...</p>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex flex-col items-center">
                                        <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse ring-4 ring-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.4)]" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold text-cyan-400 uppercase tracking-widest mb-1">Synthesis in Progress</p>
                                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 mt-3 overflow-hidden transition-all duration-500">
                                            <p className="text-[13px] leading-relaxed text-slate-300 font-serif italic opacity-80 whitespace-pre-wrap">
                                                {thinkingText || "Developing response strategy..."}
                                            </p>
                                            <div className="h-8 bg-gradient-to-t from-black/20 to-transparent absolute bottom-4 left-4 right-4 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-white/[0.04] bg-indigo-500/5">
                            <div className="flex items-center gap-3 text-indigo-300">
                                <Info size={14} />
                                <p className="text-[10px] font-bold uppercase tracking-wider">Kimi-K2-Thinking Engine</p>
                            </div>
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>
        </div>
    );
}

function Loader2({ size, className }: { size: number, className?: string }) {
    return <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><Brain size={size} className={className} /></motion.div>;
}
