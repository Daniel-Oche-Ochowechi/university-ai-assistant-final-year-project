"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ChatWindow from "@/components/ChatWindow";
import Auth from "@/components/Auth";
import { Plus, LogOut, Loader2, Command, X, MessageSquareText, Code, Check } from "lucide-react";
import { Session } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";

type ChatItem = { id: string; title: string; updated_at: string };

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isEmbedModalOpen, setIsEmbedModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate dynamic embed iframe based on current host
  const getEmbedCode = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    return `<iframe src="${baseUrl}/embed" width="100%" height="600" style="border:none; border-radius:12px; overflow:hidden;" allow="clipboard-write; microphone"></iframe>`;
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;

    const fetchChats = async () => {
      const { data } = await supabase
        .from("user_chats")
        .select("id, title, updated_at")
        .order("updated_at", { ascending: false });
      
      if (data) setChats(data);
    };

    fetchChats();

    const channel = supabase
      .channel("public:user_chats")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_chats",
          filter: `user_id=eq.${session.user.id}`,
        },
        () => {
          fetchChats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#050505] text-white">
        <Loader2 size={32} className="animate-spin text-white/50" />
      </div>
    );
  }

  if (!session) {
    return <Auth onAuthSuccess={() => {}} />;
  }

  const navigateToChat = (id: string | null) => {
    setActiveChatId(id);
    setIsSidebarOpen(false); // Close mobile sidebar on select
  };

  const SidebarContent = () => (
    <>
      {/* Sidebar Header */}
      <div className="flex items-center justify-between pb-8 pt-4 px-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center shadow-lg">
            <Command size={18} className="text-black" />
          </div>
          <div>
            <h1 className="font-bold text-base leading-none tracking-tight text-white">MIU AI Assistant</h1>
            <p className="text-[10px] text-zinc-400 font-semibold tracking-widest uppercase mt-1">Official AI</p>
          </div>
        </div>
        
        {/* Mobile Close Button */}
        <button 
          onClick={() => setIsSidebarOpen(false)}
          className="md:hidden p-2 rounded-full hover:bg-white/10 text-white/70"
        >
          <X size={20} />
        </button>
      </div>

      {/* New Chat Button - Smooth Glassy Solid */}
      <button 
        onClick={() => navigateToChat(null)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3.5 mb-8 bg-white/10 hover:bg-white text-white hover:text-black text-[13px] font-bold rounded-2xl transition-all duration-300 shadow-[0_4px_20px_rgba(255,255,255,0.02)] group active:scale-[0.98]"
      >
        <Plus size={16} strokeWidth={3} className="text-current transition-transform duration-300 group-hover:rotate-90" />
        Start New Conversation
      </button>

      {/* Navigation / Recent Activity */}
      <div className="flex-1 overflow-y-auto custom-scrollbar -mr-4 pr-4">
        <div className="text-[10px] text-zinc-500 font-bold mb-4 px-2 tracking-[0.1em]">RECENT ACTIVE</div>
        <div className="space-y-1">
          <AnimatePresence mode="popLayout">
            {chats.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-3 py-6 text-xs text-zinc-600 bg-white/[0.02] rounded-2xl text-center italic"
              >
                No history.
              </motion.div>
            ) : (
              chats.map((chat) => (
                <motion.button 
                  layout
                  key={chat.id}
                  onClick={() => navigateToChat(chat.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-[13px] rounded-xl transition-all duration-300 group ${
                    activeChatId === chat.id 
                      ? "bg-white/[0.06] text-white font-semibold" 
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.03]"
                  }`}
                >
                  <MessageSquareText size={16} className={`shrink-0 transition-colors ${activeChatId === chat.id ? "text-white" : "text-zinc-600 group-hover:text-zinc-400"}`} />
                  <span className="truncate flex-1 text-left">{chat.title}</span>
                </motion.button>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer / User Profile */}
      <div className="pt-6 mt-6 pb-2">
        <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl p-3 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-bold uppercase text-xs">
              {session.user.email?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-zinc-500 font-bold tracking-wider">SESSION</p>
              <p className="text-[12px] text-zinc-200 font-medium truncate leading-tight">{session.user.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsEmbedModalOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 px-2 py-2 text-[11px] font-semibold text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all"
            >
              <Code size={12} /> Integrate
            </button>
            <button 
              onClick={handleSignOut}
              className="flex-1 flex items-center justify-center gap-2 px-2 py-2 text-[11px] font-semibold text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
            >
              <LogOut size={12} /> Logout
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex w-full h-[100dvh] overflow-hidden bg-[#050505] text-zinc-100 font-sans selection:bg-white/20">

      {/* Ultra Minimal Ambient Glow (Gen Z Classy Vibe) */}
      <div className="fixed top-0 left-[20%] w-[60%] h-[40%] bg-zinc-800/15 blur-[120px] rounded-full pointer-events-none -z-0 mix-blend-screen opacity-50" />

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-[280px] border-r border-white/[0.04] bg-[#050505]/60 backdrop-blur-3xl p-5 shrink-0 z-10 relative">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside 
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="md:hidden fixed top-0 bottom-0 left-0 w-[80%] max-w-[300px] border-r border-white/[0.04] bg-[#0A0A0A] p-5 z-50 flex flex-col shadow-2xl"
          >
            <SidebarContent />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <main className="flex-1 relative h-full min-w-0 flex flex-col items-center">
        <ChatWindow 
          chatId={activeChatId} 
          userId={session.user.id} 
          onChatCreated={navigateToChat} 
          onMenuToggle={() => setIsSidebarOpen(true)}
        />
      </main>

      {/* Embed Modal */}
      <AnimatePresence>
        {isEmbedModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsEmbedModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[#0A0A0A] border border-white/10 rounded-3xl overflow-hidden shadow-2xl p-6 md:p-8"
            >
              <button 
                onClick={() => setIsEmbedModalOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
              
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Code size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">Website Integration</h2>
                  <p className="text-xs text-zinc-400">Embed this AI on your official website</p>
                </div>
              </div>

              <div className="mb-6 space-y-2">
                <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Iframe Snippet</label>
                <div className="relative group">
                  <pre className="p-4 rounded-xl bg-black border border-white/10 text-zinc-300 text-xs font-mono overflow-x-auto select-all whitespace-pre-wrap">
                    {getEmbedCode()}
                  </pre>
                </div>
              </div>

              <button 
                onClick={() => {
                  navigator.clipboard.writeText(getEmbedCode());
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className={`w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  copied ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white text-black hover:bg-zinc-200"
                }`}
              >
                {copied ? <><Check size={16} /> Copied to Clipboard!</> : <><Code size={16} /> Copy Embed Code</>}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
