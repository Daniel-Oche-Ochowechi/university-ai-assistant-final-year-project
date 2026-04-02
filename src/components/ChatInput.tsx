import { useState, useRef, useEffect } from "react";
import { ArrowUp, Eraser, Command } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ChatInputProps {
    onSendMessage: (message: string) => void;
    onClearChat: () => void;
    isLoading: boolean;
}

export default function ChatInput({ onSendMessage, onClearChat, isLoading }: ChatInputProps) {
    const [input, setInput] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [input]);

    // Auto-focus on mount
    useEffect(() => {
        textareaRef.current?.focus();
    }, []);

    const handleSend = () => {
        if (input.trim() && !isLoading) {
            onSendMessage(input.trim());
            setInput("");
            if (textareaRef.current) {
                textareaRef.current.style.height = "auto";
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto px-4 md:px-6 pb-2 pt-2">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                    "relative flex items-end gap-3 bg-[#111] border border-white/[0.08] rounded-[32px] p-2 pl-6 transition-all duration-300 z-10 shadow-2xl",
                    isFocused ? "border-white/[0.2] bg-[#151515]" : ""
                )}
            >

                {/* Minimal Icon Indicator */}
                <div className={cn(
                    "flex-shrink-0 mb-3.5 transition-colors duration-300",
                    isFocused ? "text-white" : "text-zinc-600"
                )}>
                    <Command size={18} strokeWidth={2.5} />
                </div>

                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder="Message Nexus..."
                    className="w-full max-h-[200px] resize-none bg-transparent text-zinc-100 placeholder:text-zinc-600 focus:outline-none py-3.5 shrink font-medium text-[15px] leading-relaxed scrollbar-hide"
                    rows={1}
                    disabled={isLoading}
                />

                <div className="flex gap-2 mb-1 shrink-0 pr-1 z-20">
                    <AnimatePresence>
                        {input.length > 0 && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
                                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                exit={{ opacity: 0, scale: 0.5, rotate: 45 }}
                                onClick={() => setInput("")}
                                type="button"
                                className="p-3 rounded-full text-zinc-500 hover:text-white hover:bg-white/10 transition-all duration-300"
                                title="Clear Draft"
                            >
                                <Eraser size={18} />
                            </motion.button>
                        )}
                    </AnimatePresence>

                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className={cn(
                            "w-10 h-10 rounded-full transition-all duration-300 flex items-center justify-center relative overflow-hidden group z-20 shadow-md",
                            input.trim() && !isLoading
                                ? "bg-white text-zinc-950 hover:scale-105 active:scale-95"
                                : "bg-zinc-800 text-zinc-600"
                        )}
                    >
                        <ArrowUp size={20} strokeWidth={3} className="relative z-10 transition-transform duration-300" />
                    </button> // Clean, simple send button
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center justify-center mt-3"
            >
                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest px-2">
                    NEXUS AI ASSISTANT V2.0
                </span>
            </motion.div>
        </div>
    );
}
