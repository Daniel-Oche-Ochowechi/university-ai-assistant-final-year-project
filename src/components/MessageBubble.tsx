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
  timestamp?: Date;
}

export default function MessageBubble({ role, content, timestamp }: MessageBubbleProps) {
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
      initial={{ opacity: 0, y: 24, filter: "blur(12px)", scale: 0.95 }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)", scale: 1 }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "flex w-full mb-10 group",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div className={cn(
        "flex max-w-[85%] sm:max-w-[75%] gap-5",
        isUser ? "flex-row-reverse" : "flex-row"
      )}>

        {/* Avatar with Glow */}
        <div className="flex-shrink-0 mt-1 relative">
          {isUser ? (
            <div className="h-10 w-10 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center shadow-2xl shadow-black/50 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent" />
              <User size={18} className="text-slate-300 relative z-10" />
            </div>
          ) : (
            <div className="h-10 w-10 rounded-2xl bg-white flex items-center justify-center shadow-xl shadow-indigo-500/20 ring-1 ring-white/20 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Sparkles size={18} className="text-slate-900 relative z-10 transition-transform group-hover:scale-110" />
            </div>
          )}
        </div>

        {/* Message Content Container */}
        <div className={cn(
          "flex flex-col relative",
          isUser ? "items-end" : "items-start"
        )}>
          
          <div
            className={cn(
              "px-6 py-4.5 text-[15px] leading-relaxed tracking-wide font-medium relative group",
              isUser
                ? "bg-white text-slate-950 rounded-[2rem] rounded-tr-[4px] shadow-[0_10px_30px_rgba(255,255,255,0.05)]"
                : "bg-white/[0.03] text-slate-200 rounded-[2rem] rounded-tl-[4px] border border-white/[0.06] shadow-2xl backdrop-blur-3xl"
            )}
          >
            {/* Ambient inner glow for assistant messages */}
            {!isUser && (
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-500/[0.03] to-transparent rounded-[2rem] pointer-events-none" />
            )}

            <div className="relative z-10 text-[15px] w-full max-w-full">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || "");
                    return !inline && match ? (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.98, filter: "blur(5px)" }}
                        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className="relative my-4 group/code w-full overflow-hidden"
                      >
                        <div className="absolute top-2 right-2 px-2 py-1 bg-white/10 border border-white/20 rounded-md backdrop-blur-md flex items-center gap-2 opacity-0 group-hover/code:opacity-100 transition-opacity z-10 pointer-events-none">
                            <span className="text-[10px] font-bold text-white uppercase tracking-widest">{match[1]}</span>
                        </div>
                        <SyntaxHighlighter
                          style={oneDark}
                          language={match[1]}
                          PreTag="div"
                          className="rounded-2xl border border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.2)] text-[13px] !bg-[#0b0f19]/80 backdrop-blur-3xl !m-0 w-full overflow-x-auto custom-scrollbar"
                          {...props}
                        >
                          {String(children).replace(/\n$/, "")}
                        </SyntaxHighlighter>
                      </motion.div>
                    ) : (
                      <code className="bg-black/20 border border-white/5 text-indigo-300 px-1.5 py-0.5 rounded-lg font-mono text-[13px] whitespace-pre-wrap break-words" {...props}>
                        {children}
                      </code>
                    );
                  },
                  p({children}) {
                    return (
                      <motion.p 
                        initial={{ opacity: 0, filter: "blur(4px)", y: 4 }}
                        animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        className="leading-relaxed opacity-90 mb-4 inline-block w-full break-words"
                      >
                        {children}
                      </motion.p>
                    );
                  },
                  ul({children}) {
                    return (
                      <motion.ul 
                        initial={{ opacity: 0, filter: "blur(4px)" }}
                        animate={{ opacity: 1, filter: "blur(0px)" }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        className="list-disc pl-5 opacity-90 mb-4 space-y-2"
                      >
                        {children}
                      </motion.ul>
                    );
                  },
                  ol({children}) {
                    return (
                      <motion.ol 
                        initial={{ opacity: 0, filter: "blur(4px)" }}
                        animate={{ opacity: 1, filter: "blur(0px)" }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        className="list-decimal pl-5 opacity-90 mb-4 space-y-2"
                      >
                        {children}
                      </motion.ol>
                    );
                  },
                  li({children}) {
                    return (
                      <motion.li 
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="pl-1 leading-relaxed marker:text-indigo-400"
                      >
                        {children}
                      </motion.li>
                    );
                  },
                  strong({children}) {
                    return <strong className="font-bold text-white tracking-tight drop-shadow-md">{children}</strong>;
                  },
                  a({children, href}) {
                    return <a href={href} className="text-indigo-400 font-medium hover:text-indigo-300 underline decoration-indigo-500/30 underline-offset-4 transition-colors hover:decoration-indigo-400" target="_blank" rel="noopener noreferrer">{children}</a>
                  },
                  h1({children}) {
                    return <h1 className="text-2xl font-bold text-white mb-4 mt-6 tracking-tight">{children}</h1>;
                  },
                  h2({children}) {
                    return <h2 className="text-xl font-bold text-white mb-3 mt-5 tracking-tight">{children}</h2>;
                  },
                  h3({children}) {
                    return <h3 className="text-lg font-bold text-white mb-2 mt-4 tracking-tight">{children}</h3>;
                  },
                  blockquote({children}) {
                    return <blockquote className="border-l-4 border-indigo-500/50 pl-4 py-1 my-4 bg-indigo-500/5 rounded-r-xl italic text-slate-300">{children}</blockquote>;
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
                        className="absolute -right-12 top-4 p-2.5 rounded-xl bg-white/[0.05] border border-white/5 text-slate-500 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300"
                    >
                        {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    </motion.button>
                )}
            </AnimatePresence>
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-3 mt-3 px-2">
            {timestamp && (
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest opacity-60">
                {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            )}
            {!isUser && (
                <span className="text-[10px] font-bold text-indigo-400/60 uppercase tracking-widest">
                    Nexus Optimized
                </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
