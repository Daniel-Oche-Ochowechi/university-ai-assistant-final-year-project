"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ChatWindow from "@/components/ChatWindow";
import Auth from "@/components/Auth";
import { Sparkles, MessageSquare, Plus, LogOut, Loader2, Command } from "lucide-react";
import { Session } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";

type ChatItem = { id: string; title: string; updated_at: string };

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

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
      <div className="flex h-screen w-full items-center justify-center bg-[#020617] text-white">
        <Loader2 size={32} className="animate-spin text-indigo-500/50" />
      </div>
    );
  }

  if (!session) {
    return <Auth onAuthSuccess={() => {}} />;
  }

  return (
    <div className="flex w-full h-screen overflow-hidden bg-[#020617] text-slate-100 selection:bg-indigo-500/30">

      {/* Ambient Depth Glows - GenZ Aesthetics (Vivid Fuchsia & Cyan) */}
      <div className="fixed top-[-15%] left-[-10%] w-[50%] h-[50%] bg-fuchsia-600/15 blur-[140px] rounded-full pointer-events-none -z-0 mix-blend-screen animate-[pulse_8s_ease-in-out_infinite]" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/15 blur-[130px] rounded-full pointer-events-none -z-0 mix-blend-screen animate-[pulse_6s_ease-in-out_infinite_alternate]" />
      <div className="fixed top-[40%] left-[50%] translate-x-[-50%] w-[60%] h-[20%] bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none -z-0 opacity-50 transition-opacity duration-1000" />

      {/* Sidebar - Modern Luxury Component */}
      <motion.aside 
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="hidden md:flex flex-col w-[300px] border-r border-white/[0.08] bg-white/[0.01] backdrop-blur-3xl p-6 shrink-0 z-10 relative overflow-hidden"
      >
        
        {/* Sidebar Header */}
        <div className="flex items-center gap-3 px-1 pb-10 pt-2 relative">
          <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-2xl shadow-indigo-500/20 ring-1 ring-white/10 group overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Command size={20} className="relative z-10 text-slate-900 transition-transform group-hover:scale-110" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none tracking-tight text-white">MIU Assistant</h1>
            <p className="text-[10px] text-indigo-400/80 font-bold tracking-widest uppercase mt-1">Nexus AI Core</p>
          </div>
        </div>

        {/* New Chat Button - Classy Solid */}
        <button 
          onClick={() => setActiveChatId(null)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3.5 mb-8 bg-white text-slate-950 text-sm font-bold rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(255,255,255,0.1)] group"
        >
          <Plus size={18} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-300" />
          Start New Conversation
        </button>

        {/* Navigation / Recent Activity */}
        <div className="flex-1 overflow-y-auto custom-scrollbar -mr-4 pr-4">
          <div className="text-[11px] text-slate-500 uppercase font-bold mb-4 px-2 tracking-[0.2em]">Recent Thought Patterns</div>
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {chats.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="px-3 py-4 text-xs text-slate-600 bg-white/[0.02] border border-dashed border-white/5 rounded-2xl text-center"
                >
                  Your mind is clear.
                </motion.div>
              ) : (
                chats.map((chat) => (
                  <motion.button 
                    layout
                    key={chat.id}
                    onClick={() => setActiveChatId(chat.id)}
                    className={`w-full flex items-center gap-4 px-4 py-3 text-sm rounded-2xl transition-all duration-300 group border ${
                      activeChatId === chat.id 
                        ? "bg-white/[0.08] text-white border-white/10 shadow-lg" 
                        : "text-slate-400 border-transparent hover:text-white hover:bg-white/[0.04] hover:border-white/5"
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full transition-all duration-500 ${activeChatId === chat.id ? "bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.5)] scale-125" : "bg-slate-700 group-hover:bg-slate-500"}`} />
                    <span className="truncate flex-1 text-left font-medium">{chat.title}</span>
                  </motion.button>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer / User Profile */}
        <div className="border-t border-white/[0.08] pt-6 mt-6 relative z-10">
          <div className="bg-white/[0.03] border border-white/[0.05] rounded-3xl p-4 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold uppercase text-xs">
                {session.user.email?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 font-semibold tracking-wide">SESSION ACTIVE</p>
                <p className="text-[13px] text-slate-200 font-bold truncate leading-tight mt-0.5">{session.user.email}</p>
              </div>
            </div>
            <button 
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all group border border-transparent hover:border-red-500/20"
            >
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Chat Area */}
      <main className="flex-1 relative h-full min-w-0 bg-[#020617] flex flex-col">
        <ChatWindow 
          chatId={activeChatId} 
          userId={session.user.id} 
          onChatCreated={(id) => setActiveChatId(id)} 
        />
      </main>
    </div>
  );
}
