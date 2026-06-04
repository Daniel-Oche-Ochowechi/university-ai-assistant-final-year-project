import React, { useState } from "react";
import { User, Sparkles, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';

function CodeBlock({ language, code }: { language: string, code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative my-4 group/code w-full overflow-hidden rounded-[20px] shadow-2xl border border-white/[0.05]">
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#050505] border-b border-white/[0.05]">
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{language}</span>
        <button 
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 hover:text-white transition-colors uppercase tracking-wider"
        >
          {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy Code'}
        </button>
      </div>
      <SyntaxHighlighter
        style={oneDark}
        language={language}
        PreTag="div"
        className="!text-[13px] !bg-[#0A0A0A] !m-0 w-full overflow-x-auto custom-scrollbar !py-4 !px-4"
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

interface MessageBubbleProps {
  role: "user" | "assistant" | "system";
  content: string;
  imageUrl?: string;
  timestamp?: Date;
  isThinkingBubble?: boolean;
}

function ThinkingAnimation() {
   return (
      <div className="flex items-center gap-3 h-6 px-2">
        <div className="flex gap-1.5">
          <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: 0 }} className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
          <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
          <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
        </div>
        <span className="text-[11px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 uppercase tracking-widest animate-pulse">
          Processing
        </span>
      </div>
   );
}

const MessageBubble = React.memo(({ role, content, imageUrl, timestamp, isThinkingBubble }: MessageBubbleProps) => {
  const isUser = role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "flex w-full mb-8 group",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div className={cn(
        "flex max-w-[95%] sm:max-w-[85%] lg:max-w-[75%] gap-4 relative",
        isUser ? "flex-row-reverse" : "flex-row"
      )}>

        {/* Minimal Avatar */}
        <div className="flex-shrink-0 mt-1 relative hidden sm:block">
          {isUser ? (
            <div className="h-9 w-9 rounded-[14px] bg-gradient-to-br from-indigo-500/20 to-purple-500/10 border border-white/10 flex items-center justify-center shadow-lg backdrop-blur-md">
              <User size={15} className="text-zinc-300" />
            </div>
          ) : (
            <div className="h-9 w-9 rounded-[14px] bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.4)] ring-1 ring-white/20">
              <Sparkles size={16} className="text-white drop-shadow-md" />
            </div>
          )}
        </div>

        {/* Message Content Container */}
        <div className={cn(
          "flex flex-col relative w-full min-w-0",
          isUser ? "items-end" : "items-start"
        )}>
          
          <div
            className={cn(
              "px-5 py-4 text-[14.5px] sm:text-[15px] leading-relaxed tracking-wide font-medium relative transition-all w-full min-w-0 break-words shadow-2xl",
              isUser
                ? "bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-[24px] rounded-tr-[8px] shadow-[0_10px_40px_rgba(79,70,229,0.3)] border border-white/10"
                : "bg-white/[0.02] backdrop-blur-3xl text-zinc-100 rounded-[24px] rounded-tl-[8px] border border-white/[0.08] shadow-[0_10px_50px_rgba(0,0,0,0.5)] ring-1 ring-inset ring-white/[0.02]",
              isThinkingBubble ? "w-auto max-w-[180px] bg-transparent border-white/5 backdrop-blur-lg shadow-none ring-0" : ""
            )}
          >
            {isThinkingBubble ? (
              <ThinkingAnimation />
            ) : (
              <>
                {imageUrl && (
              <div className="mb-4 overflow-hidden rounded-[16px] shadow-lg border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="Uploaded content" className="w-full max-w-[320px] h-auto object-cover" />
              </div>
            )}
            <div className="relative z-10 w-full min-w-0 prose prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || "");
                    const codeString = String(children).replace(/\n$/, "");
                    return !inline && match ? (
                      <CodeBlock language={match[1]} code={codeString} />
                    ) : (
                      <code className="bg-black/40 border border-white/10 text-cyan-400 px-1.5 py-0.5 rounded-md font-mono text-[13px] whitespace-pre-wrap break-words" {...props}>
                        {children}
                      </code>
                    );
                  },
                  p({children}) {
                    return (
                      <p className="leading-relaxed mb-4 last:mb-0 break-words opacity-95">
                        {children}
                      </p>
                    );
                  },
                  ul({children}) {
                    return <ul className="list-disc pl-5 mb-4 space-y-2 opacity-90 marker:text-cyan-500/70">{children}</ul>;
                  },
                  ol({children}) {
                    return <ol className="list-decimal pl-5 mb-4 space-y-2 opacity-90 marker:text-cyan-500/70">{children}</ol>;
                  },
                  li({children}) {
                    return <li className="pl-1">{children}</li>;
                  },
                  strong({children}) {
                    return <strong className="font-semibold text-white drop-shadow-sm">{children}</strong>;
                  },
                  a({children, href}) {
                    return <a href={href} className="text-cyan-400 font-medium hover:text-cyan-300 underline underline-offset-4 transition-colors" target="_blank" rel="noopener noreferrer">{children}</a>
                  },
                  h1({children}) {
                    return <h1 className="text-xl font-bold text-white mb-4 mt-6 tracking-tight drop-shadow-md">{children}</h1>;
                  },
                  h2({children}) {
                    return <h2 className="text-lg font-bold text-white mb-3 mt-5 tracking-tight drop-shadow-sm">{children}</h2>;
                  },
                  h3({children}) {
                    return <h3 className="text-base font-bold text-white mb-2 mt-4 tracking-tight">{children}</h3>;
                  },
                  blockquote({children}) {
                    return <blockquote className="border-l-[3px] border-cyan-500/50 pl-4 py-1.5 my-4 bg-cyan-500/5 rounded-r-xl italic text-zinc-300">{children}</blockquote>;
                  }
                }}
              >
                {content}
              </ReactMarkdown>
            </div>

            {/* Quick Actions (Copy) */}
            <AnimatePresence>
                {!isUser && !isThinkingBubble && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.15)' }}
                        whileTap={{ scale: 0.9 }}
                        animate={{ opacity: 1 }}
                        onClick={handleCopy}
                        className="absolute -right-12 top-2 p-2 rounded-xl bg-white/[0.05] backdrop-blur-md border border-white/10 text-zinc-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl"
                    >
                        {copied ? <Check size={14} className="text-cyan-400" /> : <Copy size={14} />}
                    </motion.button>
                )}
            </AnimatePresence>
              </>
            )}
          </div>

          {/* Minimal Metadata */}
          <div className="flex items-center gap-2 mt-2 px-3">
            {timestamp && (
                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest transition-colors group-hover:text-zinc-500">
                {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

MessageBubble.displayName = 'MessageBubble';

export default MessageBubble;
