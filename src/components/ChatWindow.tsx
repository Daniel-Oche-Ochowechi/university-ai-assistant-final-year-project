'use client';

import { useState, useRef, useEffect } from "react";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import { Sparkles, Brain, Search, Info, X, Menu, Volume2, VolumeX } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

export type Message = {
    role: "user" | "assistant" | "system" | "tool";
    content: string;
    imageUrl?: string;
    timestamp?: Date;
    tool_call_id?: string;
    isStreaming?: boolean;
};

interface ChatWindowProps {
    chatId?: string | null;
    onChatCreated?: (id: string, title: string) => void;
    userId?: string;
    onMenuToggle?: () => void;
}

export default function ChatWindow({ chatId, onChatCreated, userId, onMenuToggle }: ChatWindowProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const [thinkingText, setThinkingText] = useState("");
    const [isLoaded, setIsLoaded] = useState(false);
    const [showThoughts, setShowThoughts] = useState(true);
    const [autoSpeak, setAutoSpeak] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const activeChatIdRef = useRef<string | null>(chatId || null);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        setIsLoaded(false);

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setIsLoading(false);
            setIsThinking(false);
        }

        if (!chatId) {
            setMessages([{ role: "assistant", content: "Hi! I'm your MIU AI Assistant. How can I help you today?", timestamp: new Date() }]);
            setIsThinking(false);
            setThinkingText("");
            setIsLoaded(true);
            activeChatIdRef.current = null;
            return;
        }

        // Avoid refetching if we already know this chat internally (just created it)
        if (activeChatIdRef.current === chatId && messages.length > 1) {
            setIsLoaded(true);
            return;
        }

        activeChatIdRef.current = chatId;

        const fetchChat = async () => {
            const { data } = await supabase.from('user_chats').select('messages').eq('id', chatId).single();
            if (data && data.messages) {
                const parsedMessages = data.messages.map((m: any) => ({
                    ...m,
                    timestamp: m.timestamp ? new Date(m.timestamp) : undefined
                }));
                // Prevent race conditions: Ensure we only set messages if the prop hasn't changed while fetching
                if (activeChatIdRef.current === chatId) {
                    setMessages(parsedMessages);
                    setIsLoaded(true);
                }
            } else {
                setIsLoaded(true);
            }
        };
        fetchChat();
    }, [chatId]);

    const saveChatToDb = async (newMessages: Message[]) => {
        if (!userId) return;
        const messagesForDb = newMessages.map(m => ({
            role: m.role,
            content: m.content,
            imageUrl: m.imageUrl,
            timestamp: m.timestamp?.toISOString()
        }));

        const currentChatId = activeChatIdRef.current;

        if (!currentChatId && onChatCreated) {
            const firstUserMsg = newMessages.find(m => m.role === 'user')?.content || 'New Chat';
            const title = firstUserMsg.length > 40 ? firstUserMsg.substring(0, 40) + '...' : firstUserMsg;
            const { data } = await supabase.from('user_chats').insert({
                user_id: userId,
                title,
                messages: messagesForDb
            }).select().single();
            if (data) {
                // Update refs immediately so the second save handles it as an update
                activeChatIdRef.current = data.id; 
                onChatCreated(data.id, data.title);
            }
        } else if (currentChatId) {
            await supabase.from('user_chats').update({
                messages: messagesForDb,
                updated_at: new Date().toISOString()
            }).eq('id', currentChatId);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading, isThinking]);

    const handleSendMessage = async (content: string, imageUrl?: string) => {
        const newUserMessage: Message = { role: "user", content, imageUrl, timestamp: new Date() };
        const updatedMessages = [...messages, newUserMessage];
        setMessages(updatedMessages);
        setIsLoading(true);
        setIsThinking(false);
        setThinkingText("");
        
        await saveChatToDb(updatedMessages);

        abortControllerRef.current = new AbortController();

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    messages: updatedMessages.map(m => ({ role: m.role, content: m.content, imageUrl: m.imageUrl })) 
                }),
                signal: abortControllerRef.current.signal
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

            if (autoSpeak && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(aiResponseContent.replace(/[_*`#]/g, ''));
                window.speechSynthesis.speak(utterance);
            }

        } catch (error: any) {
            console.error(error);
            const errorMsg: Message = { role: "assistant", content: error.message || "Connection interrupted.", timestamp: new Date() };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
            setIsThinking(false);
        }
    };

    const clearChat = () => {
        if (onChatCreated) {
            onChatCreated("", "New Chat");
        } else {
            setMessages([{ role: "assistant", content: "Hi! I'm your MIU AI Assistant. How can I help you today?", timestamp: new Date() }]);
            setIsThinking(false);
            setThinkingText("");
        }
    };

    return (
        <div className="flex w-full h-full relative overflow-hidden bg-transparent">

            {/* Main Chat */}
            <div className="flex-1 flex flex-col min-w-0 border-r border-white/[0.04]">
                
                {/* Minimal Header */}
                <header className="px-5 md:px-8 py-4 border-b border-white/[0.04] bg-[#050505]/80 backdrop-blur-2xl flex items-center justify-between z-20">
                    <div className="flex items-center gap-4">
                        {/* Mobile Menu Button */}
                        <button 
                            onClick={onMenuToggle}
                            className="md:hidden p-2 -ml-2 rounded-xl text-white/70 hover:bg-white/10 transition-colors"
                        >
                            <Menu size={22} />
                        </button>
                        <div className="hidden md:flex p-2.5 rounded-xl bg-white/[0.04] border border-white/5">
                            <Sparkles className="text-white" size={16} />
                        </div>
                        <div>
                            <h1 className="text-sm font-bold text-white tracking-tight">MIU AI Assistant</h1>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Mewar University</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => {
                                setAutoSpeak(!autoSpeak);
                                if (autoSpeak) window.speechSynthesis.cancel();
                            }}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                            title={autoSpeak ? "Disable Voice Feedback" : "Enable Voice Feedback"}
                        >
                            {autoSpeak ? <Volume2 size={16} /> : <VolumeX size={16} />}
                        </button>
                         {isThinking && (
                            <motion.div 
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/10 text-[10px] font-bold text-zinc-300 flex items-center gap-2 uppercase tracking-widest backdrop-blur-md"
                            >
                                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                                Processing
                            </motion.div>
                         )}
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto px-4 md:px-8 py-8 custom-scrollbar">
                    <div className="max-w-3xl mx-auto w-full">
                        {!isLoaded ? (
                             <div className="flex items-center justify-center h-40">
                                <Loader2 size={24} className="animate-spin text-white/30" />
                             </div>
                        ) : (
                            <AnimatePresence mode="popLayout" initial={false}>
                                {messages.filter(msg => msg.role !== "system" && msg.role !== "tool").map((msg, index) => (
                                    <MessageBubble
                                        key={index}
                                        role={msg.role as any}
                                        content={msg.content}
                                        imageUrl={msg.imageUrl}
                                        timestamp={msg.timestamp}
                                    />
                                ))}
                            </AnimatePresence>
                        )}
                        <div ref={messagesEndRef} className="h-20" />
                    </div>
                </main>

                <div className="bg-gradient-to-t from-[#050505] via-[#050505] to-transparent pt-10 pb-4 md:pb-6 relative z-10 w-full">
                    <ChatInput
                        onSendMessage={handleSendMessage}
                        onClearChat={clearChat}
                        isLoading={isLoading}
                    />
                </div>
            </div>

            {/* Thought Sidebar (Optional / Desktop only mostly) */}
            <AnimatePresence>
                {(isThinking || (thinkingText && showThoughts)) && (
                    <motion.aside
                        initial={{ opacity: 0, x: 320 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 320 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="hidden lg:flex flex-col w-[350px] bg-[#0A0A0A]/90 backdrop-blur-3xl border-l border-white/[0.04] relative z-30"
                    >
                        <div className="absolute top-0 right-0 w-full h-full bg-zinc-800/[0.02] pointer-events-none" />
                        
                        <div className="p-5 border-b border-white/[0.04] flex items-center justify-between relative">
                            <div className="flex items-center gap-3">
                                <h3 className="font-bold text-xs uppercase tracking-widest text-zinc-400">Internal Reasoning</h3>
                            </div>
                            <button 
                                onClick={() => setShowThoughts(false)}
                                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-zinc-500"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 space-y-6 relative">
                            {/* Synthesis Log */}
                            <div className="flex gap-4">
                                <div className="flex flex-col items-center">
                                    <div className="w-1.5 h-1.5 bg-white rounded-full mt-1 blur-[1px] animate-pulse" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Thoughts</p>
                                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 overflow-hidden transition-all duration-500 shadow-inner">
                                        <p className="text-[12px] leading-relaxed text-zinc-400 font-mono opacity-80 whitespace-pre-wrap">
                                            {thinkingText || "Developing optimal response pattern..."}
                                        </p>
                                    </div>
                                </div>
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
