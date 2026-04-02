import { useState, useRef, useEffect } from "react";
import { ArrowUp, Eraser, Sparkles, Command } from "lucide-react";
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
        <div className="w-full max-w-4xl mx-auto px-6 pb-8 pt-4">
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className={cn(
                    "relative flex items-end gap-3 bg-white/[0.02] backdrop-blur-3xl rounded-[2.5rem] p-3 pl-8 transition-all duration-500 overflow-visible z-10",
                    isFocused 
                        ? "shadow-[0_0_60px_rgba(236,72,153,0.15),0_0_60px_rgba(6,182,212,0.15)] bg-white/[0.04]" 
                        : ""
                )}
            >
                {/* Dynamic Neon Border Wrapper */}
                <div className={cn(
                    "absolute inset-0 rounded-[2.5rem] p-[1px] -z-10 transition-opacity duration-500 pointer-events-none",
                    isFocused ? "opacity-100" : "opacity-30"
                )}>
                    <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-500/40 via-indigo-500/40 to-cyan-500/40 rounded-[2.5rem]" />
                </div>

                <div className="absolute -top-4 left-8 px-3 py-1.5 bg-indigo-500 border border-indigo-400 rounded-full flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-500 shadow-[0_0_20px_rgba(99,102,241,0.5)] transform -translate-y-2 group-hover:translate-y-0 z-20">
                    <Sparkles size={12} className="text-white" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-widest leading-none">Neural Link Active</span>
                </div>

                <div className={cn(
                    "flex-shrink-0 mb-3 transition-colors duration-300",
                    isFocused ? "text-fuchsia-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]" : "text-slate-500"
                )}>
                    <Command size={18} />
                </div>

                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder="Describe your inquiry..."
                    className="w-full max-h-[220px] resize-none bg-transparent text-slate-100 placeholder:text-slate-600 focus:outline-none py-3.5 shrink font-medium text-[15px] leading-relaxed scrollbar-hide selection:bg-fuchsia-500/30"
                    rows={1}
                    disabled={isLoading}
                />

                <div className="flex gap-2.5 mb-1.5 shrink-0 pr-1 z-20">
                    <AnimatePresence>
                        {input.length > 0 && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
                                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                exit={{ opacity: 0, scale: 0.5, rotate: 45 }}
                                onClick={() => setInput("")}
                                type="button"
                                className="p-3 rounded-2xl text-slate-500 hover:text-white hover:bg-white/10 transition-all duration-300 active:scale-90"
                                title="Clear Draft"
                            >
                                <Eraser size={18} />
                            </motion.button>
                        )}
                    </AnimatePresence>

                    <button
                        onClick={onClearChat}
                        type="button"
                        className="p-3 rounded-2xl text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-300 hidden sm:block active:scale-95 group"
                        title="Decommission History"
                        disabled={isLoading}
                    >
                        <Eraser size={18} className="group-hover:drop-shadow-[0_0_8px_rgba(244,63,94,0.8)] opacity-50 group-hover:opacity-100 transition-opacity" />
                    </button>

                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className={cn(
                            "w-12 h-12 rounded-2xl transition-all duration-500 flex items-center justify-center relative overflow-hidden group z-20",
                            input.trim() && !isLoading
                                ? "bg-white text-slate-950 hover:scale-110 active:scale-95 shadow-[0_0_25px_rgba(255,255,255,0.3)]"
                                : "bg-white/5 text-slate-700"
                        )}
                    >
                        {input.trim() && !isLoading && (
                            <div className="absolute inset-0 bg-gradient-to-tr from-fuchsia-400/20 via-indigo-500/20 to-cyan-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        )}
                        <ArrowUp size={22} strokeWidth={3} className="relative z-10 group-hover:-translate-y-1 group-active:translate-y-0 transition-transform duration-300" />
                    </button>
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center justify-center gap-1.5 mt-5"
            >
                <div className="w-1 h-1 rounded-full bg-cyan-400/50 shadow-[0_0_5px_rgba(6,182,212,0.8)]" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] px-2">
                    Enhanced by <span className="bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 to-cyan-400">Nexus Intel Core-16</span>
                </span>
                <div className="w-1 h-1 rounded-full bg-fuchsia-400/50 shadow-[0_0_5px_rgba(236,72,153,0.8)]" />
            </motion.div>
        </div>
    );
}
