"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ChatWindow from "@/components/ChatWindow";
import Auth from "@/components/Auth";
import { Plus, LogOut, Loader2, Command, X, MessageSquareText, Code, Check, Key, Trash2, Edit2 } from "lucide-react";
import { Session } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";

type ChatItem = { id: string; title: string; updated_at: string };

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isEmbedModalOpen, setIsEmbedModalOpen] = useState(false);
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);
  const [apiKeys, setApiKeys] = useState<{id: string, name: string, key: string, created_at: string}[]>([]);
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchApiKeys = async () => {
    if (!session) return;
    const response = await fetch('/api/keys', {
      headers: { 'Authorization': `Bearer ${session.access_token}` },
    });
    const data = await response.json();
    if (data.keys) setApiKeys(data.keys);
  };

  const createApiKey = async () => {
    if (!session) return;
    setIsCreatingKey(true);
    await fetch('/api/keys', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Development Key' })
    });
    await fetchApiKeys();
    setIsCreatingKey(false);
  };

  const deleteApiKey = async (id: string) => {
    if (!session) return;
    await fetch(`/api/keys?id=${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });
    await fetchApiKeys();
  };

  useEffect(() => {
    if (isApiModalOpen) fetchApiKeys();
  }, [isApiModalOpen, session]);

  // Generate dynamic embed iframe based on current host
  const getEmbedCode = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    return `<iframe src="${baseUrl}/embed" width="100%" height="600" style="border:none; border-radius:12px; overflow:hidden;" allow="clipboard-write; microphone"></iframe>`;
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      const savedChatId = localStorage.getItem('activeChatId');
      if (savedChatId) {
        setActiveChatId(savedChatId);
      }
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
        .eq("is_hidden", false)
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
    setIsSidebarOpen(false); // Close mobile sidebar on select
    // Small delay to allow the sidebar exit animation to finish smoothly
    // before triggering a heavy ChatWindow remount/fetch component
    setTimeout(() => {
        setActiveChatId(id);
        if (id) {
            localStorage.setItem('activeChatId', id);
        } else {
            localStorage.removeItem('activeChatId');
        }
    }, 100);
  };

  const handleDeleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent chat selection toggle
    if (!session) return;
    
    // Soft delete the chat by marking it hidden
    await supabase.from("user_chats").update({ is_hidden: true }).eq("id", id);
    
    // Optimistic UI update
    setChats(prev => prev.filter(c => c.id !== id));
    
    // Instantly generate a clean slate if they deleted the active viewed chat
    if (activeChatId === id) {
      navigateToChat(null);
    }
  };

  const startEditingChat = (id: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(id);
    setEditingTitle(currentTitle);
  };

  const handleRenameChat = async (id: string) => {
    if (!session || !editingTitle.trim()) {
      setEditingChatId(null);
      return;
    }
    
    await supabase.from("user_chats").update({ title: editingTitle.trim() }).eq("id", id);
    setChats(prev => prev.map(c => c.id === id ? { ...c, title: editingTitle.trim() } : c));
    setEditingChatId(null);
  };

  const SidebarContent = () => (
    <>
      {/* Sidebar Header */}
      <div className="flex items-center justify-between pb-8 pt-4 px-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-white to-zinc-300 text-black flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.2)]">
            <Command size={20} strokeWidth={2.5} className="text-black" />
          </div>
          <div>
            <h1 className="font-extrabold text-[15px] leading-none tracking-tight text-white drop-shadow-md">MIU AI Assistant</h1>
            <p className="text-[9px] text-zinc-400 font-bold tracking-[0.2em] uppercase mt-1.5">Official AI</p>
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
        className="w-full flex items-center justify-center gap-2 px-4 py-4 mb-8 bg-gradient-to-r from-zinc-100 to-zinc-300 text-black text-[13px] font-bold rounded-2xl transition-all duration-300 shadow-[0_4px_20px_rgba(255,255,255,0.15)] hover:shadow-[0_4px_30px_rgba(255,255,255,0.25)] hover:scale-[1.02] group active:scale-[0.98]"
      >
        <Plus size={16} strokeWidth={3} className="text-current transition-transform duration-300 group-hover:rotate-90" />
        Start New Conversation
      </button>

      {/* Navigation / Recent Activity */}
      <div className="flex-1 overflow-y-auto custom-scrollbar -mr-4 pr-4">
        <div className="text-[10px] text-zinc-500 font-bold mb-4 px-3 tracking-[0.2em] uppercase">Recent Activity</div>
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
                <motion.div layout key={chat.id} className="relative group">
                  <button 
                    onClick={() => {
                      if (editingChatId !== chat.id) navigateToChat(chat.id);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-3 text-[13px] rounded-xl transition-all duration-300 ${
                      activeChatId === chat.id 
                        ? "bg-white/[0.08] text-white font-semibold pr-16 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] border border-white/5" 
                        : "text-zinc-500 hover:text-white hover:bg-white/[0.04] pr-16 border border-transparent"
                    }`}
                  >
                    <MessageSquareText size={16} className={`shrink-0 transition-colors ${activeChatId === chat.id ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" : "text-zinc-600 group-hover:text-zinc-400"}`} />
                    
                    {editingChatId === chat.id ? (
                      <input
                        autoFocus
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={() => handleRenameChat(chat.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameChat(chat.id);
                          if (e.key === 'Escape') setEditingChatId(null);
                        }}
                        className="flex-1 bg-black/50 text-white px-2 py-1 rounded border border-white/20 focus:outline-none focus:border-white/50 text-left"
                      />
                    ) : (
                      <span className="truncate flex-1 text-left">{chat.title}</span>
                    )}
                  </button>
                  
                  {editingChatId !== chat.id && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button
                        onClick={(e) => startEditingChat(chat.id, chat.title, e)}
                        className="p-2 rounded-lg bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 hover:scale-105 transition-all"
                        title="Rename Chat"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={(e) => handleDeleteChat(chat.id, e)}
                        className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:scale-105 transition-all"
                        title="Delete Chat"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer / User Profile */}
      <div className="pt-6 mt-6 pb-4">
        <div className="bg-[#050505]/40 backdrop-blur-3xl border border-white/[0.05] rounded-[24px] p-4 flex flex-col gap-4 shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-white font-bold uppercase text-xs shadow-inner">
              {session.user.email?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] text-zinc-500 font-bold tracking-[0.2em]">SESSION</p>
              <p className="text-[12px] text-zinc-200 font-bold truncate leading-tight mt-0.5">{session.user.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsApiModalOpen(true)}
              className="flex-shrink-0 flex items-center justify-center gap-2 px-3 py-2 text-[11px] font-bold text-white bg-white/[0.06] hover:bg-white/15 rounded-xl transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
              title="Developer API"
            >
              <Key size={12} />
            </button>
            <button 
              onClick={() => setIsEmbedModalOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 px-2 py-2 text-[11px] font-bold text-white bg-white/[0.06] hover:bg-white/15 rounded-xl transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
            >
              <Code size={12} /> Integrate
            </button>
            <button 
              onClick={handleSignOut}
              className="flex-shrink-0 flex items-center justify-center gap-2 px-3 py-2 text-[11px] font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-all"
            >
              <LogOut size={12} />
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex w-full h-[100dvh] overflow-hidden bg-[#000000] text-zinc-100 font-sans selection:bg-white/20 relative z-0">

      {/* Animated Mesh Gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1]">
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] bg-indigo-500/20 blur-[150px] rounded-full" />
        <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.1, 0.2, 0.1] }} transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }} className="absolute -bottom-[20%] -left-[10%] w-[60%] h-[60%] bg-purple-500/20 blur-[150px] rounded-full" />
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-[320px] border-r border-white/[0.04] bg-[#000000]/40 backdrop-blur-[60px] p-6 shrink-0 z-10 relative shadow-[10px_0_50px_rgba(0,0,0,0.5)]">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 z-40 bg-black/80"
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
            transition={{ type: "tween", ease: "circOut", duration: 0.3 }}
            className="md:hidden fixed top-0 bottom-0 left-0 w-[80%] max-w-[300px] border-r border-white/[0.04] bg-[#0A0A0A] p-5 z-50 flex flex-col shadow-2xl will-change-transform"
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
              className="relative w-full max-w-lg bg-[#0A0A0A]/90 backdrop-blur-3xl border border-white/[0.08] rounded-[32px] overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.8)] p-6 md:p-8"
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
                className={`w-full py-4 rounded-[20px] text-sm font-extrabold flex items-center justify-center gap-2 transition-all duration-300 ${
                  copied ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.3)]" : "bg-gradient-to-r from-zinc-100 to-zinc-300 text-black hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                }`}
              >
                {copied ? <><Check size={16} /> Copied to Clipboard!</> : <><Code size={16} /> Copy Embed Code</>}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Developer API Modal */}
      <AnimatePresence>
        {isApiModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsApiModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[#0A0A0A]/90 backdrop-blur-3xl border border-white/[0.08] rounded-[32px] overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.8)] p-6 md:p-8"
            >
              <button 
                onClick={() => setIsApiModalOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
              
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Key size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">Developer API</h2>
                  <p className="text-xs text-zinc-400">Generate stateless keys for external backends</p>
                </div>
              </div>

              <div className="mb-6 space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                {apiKeys.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-white/10 text-center text-xs text-zinc-500">
                    No API keys active.
                  </div>
                ) : (
                  apiKeys.map(k => (
                    <div key={k.id} className="flex flex-col gap-2 p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-zinc-300">{k.name}</span>
                        <button onClick={() => deleteApiKey(k.id)} className="text-red-400 hover:text-red-300 p-1">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-3 py-2 bg-black border border-white/10 rounded-lg text-[11px] text-zinc-400 font-mono truncate select-all">
                          {k.key}
                        </code>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(k.key);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-colors"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button 
                onClick={createApiKey}
                disabled={isCreatingKey}
                className="w-full py-4 rounded-[20px] text-sm font-extrabold flex items-center justify-center gap-2 transition-all duration-300 bg-gradient-to-r from-zinc-100 to-zinc-300 text-black hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-50"
              >
                {isCreatingKey ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Generate New Key
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
