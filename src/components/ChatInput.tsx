import { useState, useRef, useEffect } from "react";
import { ArrowUp, Eraser, Command, Image as ImageIcon, Mic, MicOff, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ChatInputProps {
    onSendMessage: (message: string, imageUrl?: string) => void;
    onClearChat: () => void;
    isLoading: boolean;
}

export default function ChatInput({ onSendMessage, onClearChat, isLoading }: ChatInputProps) {
    const [input, setInput] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognitionRef = useRef<any>(null);

    // Initialize Speech Recognition
    useEffect(() => {
        // @ts-expect-error w3c standard fallback
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            recognitionRef.current.onresult = (event: any) => {
                let currentTranscript = "";
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        setInput(prev => prev + transcript + " ");
                    } else {
                        currentTranscript += transcript;
                    }
                }
            };

            recognitionRef.current.onerror = () => {
                setIsRecording(false);
            };

            recognitionRef.current.onend = () => {
                setIsRecording(false);
            };
        }
    }, []);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [input]);

    const handleSend = () => {
        if ((input.trim() || imagePreview) && !isLoading) {
            onSendMessage(input.trim(), imagePreview || undefined);
            setInput("");
            setImageFile(null);
            setImagePreview(null);
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

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const toggleRecording = () => {
        if (!recognitionRef.current) {
            alert("Speech recognition is not supported in this browser.");
            return;
        }

        if (isRecording) {
            recognitionRef.current.stop();
            setIsRecording(false);
        } else {
            recognitionRef.current.start();
            setIsRecording(true);
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto px-4 md:px-6 pb-2 pt-2 flex flex-col gap-2">
            
            {/* Image Preview Area */}
            <AnimatePresence>
                {imagePreview && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="relative self-start ml-2 mb-2"
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imagePreview} alt="Upload preview" className="h-20 w-auto rounded-xl object-cover border border-white/10 shadow-lg" />
                        <button 
                            onClick={removeImage}
                            className="absolute -top-2 -right-2 p-1 bg-zinc-800 border border-white/20 rounded-full text-white hover:bg-zinc-700 transition-colors shadow-xl"
                        >
                            <X size={12} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                    "relative flex items-end gap-2 bg-[#0A0A0A]/80 backdrop-blur-2xl border border-white/[0.08] rounded-[32px] p-2 pl-4 transition-all duration-500 z-10 shadow-2xl",
                    isFocused ? "border-white/[0.25] shadow-[0_0_40px_rgba(255,255,255,0.06)] bg-[#0C0C0C]" : "",
                    isRecording ? "border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)] bg-[#1A0A0A]" : ""
                )}
            >

                {/* Left side actions */}
                <div className="flex gap-1 mb-2.5 shrink-0">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 rounded-full text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
                        title="Upload Image"
                        disabled={isLoading}
                    >
                        <ImageIcon size={18} />
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleImageChange} 
                        accept="image/*" 
                        className="hidden" 
                    />
                    
                    <button
                        onClick={toggleRecording}
                        className={cn(
                            "p-2 rounded-full transition-all duration-300",
                            isRecording 
                                ? "text-red-400 bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse" 
                                : "text-zinc-500 hover:text-white hover:bg-white/10"
                        )}
                        title="Voice Dictation"
                    >
                        {isRecording ? <Mic size={18} /> : <MicOff size={18} />}
                    </button>
                </div>

                <div className="flex-1 min-w-0">
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        placeholder={isRecording ? "Listening to your voice..." : "Message MIU AI..."}
                        className="w-full max-h-[200px] resize-none bg-transparent text-white placeholder:text-zinc-500 focus:outline-none py-3 shrink font-medium text-[15px] leading-relaxed scrollbar-hide selection:bg-white/20"
                        rows={1}
                        disabled={isLoading}
                    />
                </div>

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
                        disabled={(!input.trim() && !imagePreview) || isLoading}
                        className={cn(
                            "w-10 h-10 rounded-full transition-all duration-500 flex items-center justify-center relative overflow-hidden group z-20",
                            (input.trim() || imagePreview) && !isLoading
                                ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.4)] hover:scale-105 active:scale-95"
                                : "bg-white/5 text-zinc-600 border border-white/[0.05]"
                        )}
                    >
                        <ArrowUp size={20} strokeWidth={3} className="relative z-10 transition-transform duration-300" />
                    </button>
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center justify-center mt-3"
            >
                <div className="flex items-center gap-1">
                    <Command size={10} className="text-zinc-400 drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]" />
                    <span className="text-[10px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-zinc-300 to-zinc-500 uppercase tracking-widest pl-1">
                        MIU AI Assistant V2.1
                    </span>
                </div>
            </motion.div>
        </div>
    );
}
