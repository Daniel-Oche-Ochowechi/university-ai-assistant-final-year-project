import { User, Sparkles, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';

interface MessageBubbleProps {
  role: "user" | "assistant" | "system";
  content: string;
  imageUrl?: string;
  timestamp?: Date;
}

export default function MessageBubble({ role, content, imageUrl, timestamp }: MessageBubbleProps) {
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
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "flex w-full mb-8 group",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div className={cn(
        "flex max-w-[90%] sm:max-w-[80%] lg:max-w-[70%] gap-4",
        isUser ? "flex-row-reverse" : "flex-row"
      )}>

        {/* Minimal Avatar */}
        <div className="flex-shrink-0 mt-2 relative hidden sm:block">
          {isUser ? (
            <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center shadow-sm">
              <User size={14} className="text-zinc-300" />
            </div>
          ) : (
            <div className="h-8 w-8 rounded-full bg-zinc-100 flex items-center justify-center shadow-md ring-1 ring-white/10">
              <Sparkles size={14} className="text-black" />
            </div>
          )}
        </div>

        {/* Message Content Container */}
        <div className={cn(
          "flex flex-col relative w-full",
          isUser ? "items-end" : "items-start"
        )}>
          
          <div
            className={cn(
              "px-5 py-4 text-[14px] sm:text-[15px] leading-relaxed tracking-wide font-medium relative group",
              isUser
                ? "bg-zinc-100 text-zinc-950 rounded-[28px] rounded-br-[8px] shadow-sm"
                : "bg-[#111] text-zinc-200 rounded-[28px] rounded-bl-[8px] border border-white/[0.05] shadow-lg"
            )}
          >
            {imageUrl && (
              <div className="mb-4 overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="Uploaded content" className="w-full max-w-[300px] h-auto object-cover shadow-sm border border-black/5" />
              </div>
            )}
            <div className="relative z-10 w-full max-w-full">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || "");
                    return !inline && match ? (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="relative my-4 group/code w-full overflow-hidden rounded-2xl border border-white/[0.08]"
                      >
                        <div className="absolute top-2 right-2 px-2 py-1 bg-white/10 rounded-md flex items-center gap-2 opacity-0 group-hover/code:opacity-100 transition-opacity z-10 pointer-events-none">
                            <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest">{match[1]}</span>
                        </div>
                        <SyntaxHighlighter
                          style={oneDark}
                          language={match[1]}
                          PreTag="div"
                          className="!text-[13px] !bg-[#050505] !m-0 w-full overflow-x-auto custom-scrollbar !py-4 !px-5"
                          {...props}
                        >
                          {String(children).replace(/\n$/, "")}
                        </SyntaxHighlighter>
                      </motion.div>
                    ) : (
                      <code className="bg-white/10 border border-white/5 text-zinc-300 px-1.5 py-0.5 rounded-lg font-mono text-[13px] whitespace-pre-wrap break-words" {...props}>
                        {children}
                      </code>
                    );
                  },
                  p({children}) {
                    return (
                      <motion.p 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="leading-relaxed opacity-90 mb-4 last:mb-0 inline-block w-full break-words"
                      >
                        {children}
                      </motion.p>
                    );
                  },
                  ul({children}) {
                    return <ul className="list-disc pl-5 opacity-90 mb-4 space-y-2 marker:text-zinc-500">{children}</ul>;
                  },
                  ol({children}) {
                    return <ol className="list-decimal pl-5 opacity-90 mb-4 space-y-2">{children}</ol>;
                  },
                  li({children}) {
                    return <li className="pl-1 leading-relaxed">{children}</li>;
                  },
                  strong({children}) {
                    return <strong className="font-semibold text-current drop-shadow-sm">{children}</strong>;
                  },
                  a({children, href}) {
                    return <a href={href} className="text-indigo-400 font-medium hover:text-indigo-300 underline underline-offset-4 transition-colors" target="_blank" rel="noopener noreferrer">{children}</a>
                  },
                  h1({children}) {
                    return <h1 className="text-xl font-bold text-current mb-4 mt-6 tracking-tight">{children}</h1>;
                  },
                  h2({children}) {
                    return <h2 className="text-lg font-bold text-current mb-3 mt-5 tracking-tight">{children}</h2>;
                  },
                  h3({children}) {
                    return <h3 className="text-base font-bold text-current mb-2 mt-4 tracking-tight">{children}</h3>;
                  },
                  blockquote({children}) {
                    return <blockquote className="border-l-2 border-zinc-500 pl-4 py-1 my-4 bg-zinc-500/5 rounded-r-xl italic text-zinc-400">{children}</blockquote>;
                  }
                }}
              >
                {content}
              </ReactMarkdown>
            </div>

            {/* Quick Actions (Copy) */}
            <AnimatePresence>
                {!isUser && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        animate={{ opacity: 1 }}
                        onClick={handleCopy}
                        className="absolute -right-10 top-2 p-2 rounded-xl bg-[#111] border border-white/5 text-zinc-500 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300"
                    >
                        {copied ? <Check size={14} className="text-zinc-300" /> : <Copy size={14} />}
                    </motion.button>
                )}
            </AnimatePresence>
          </div>

          {/* Minimal Metadata */}
          <div className="flex items-center gap-2 mt-2 px-3">
            {timestamp && (
                <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
                {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
