"use client";

import { useEffect, useState } from "react";
import { useClerkSupabaseClient } from "@/lib/supabase";
import ChatWindow from "@/components/ChatWindow";
import { Plus, Loader2, Command, X, MessageSquareText, Code, Check, Key, Trash2, Edit2, Brain, ImageIcon, Mic, Zap, Shield, Sparkles, Globe, Laptop, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SignIn, UserButton, useUser, useAuth } from "@clerk/nextjs";
import Image from "next/image";

type ChatItem = { id: string; title: string; updated_at: string };

export default function Home() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const supabase = useClerkSupabaseClient();

  const [chats, setChats] = useState<ChatItem[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [showSignIn, setShowSignIn] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isEmbedModalOpen, setIsEmbedModalOpen] = useState(false);
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);
  const [apiKeys, setApiKeys] = useState<{id: string, name: string, key: string, created_at: string}[]>([]);
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchApiKeys = async () => {
    if (!user) return;
    const token = await getToken({ template: 'supabase' });
    const response = await fetch('/api/keys', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await response.json();
    if (data.keys) setApiKeys(data.keys);
  };

  const createApiKey = async () => {
    if (!user) return;
    setIsCreatingKey(true);
    const token = await getToken({ template: 'supabase' });
    await fetch('/api/keys', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Development Key' })
    });
    await fetchApiKeys();
    setIsCreatingKey(false);
  };

  const deleteApiKey = async (id: string) => {
    if (!user) return;
    const token = await getToken({ template: 'supabase' });
    await fetch(`/api/keys?id=${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    await fetchApiKeys();
  };

  useEffect(() => {
    if (isApiModalOpen) fetchApiKeys();
  }, [isApiModalOpen, user]);

  // Generate dynamic embed iframe based on current host
  const getEmbedCode = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    return `<iframe src="${baseUrl}/embed" width="100%" height="600" style="border:none; border-radius:12px; overflow:hidden;" allow="clipboard-write; microphone"></iframe>`;
  };

  useEffect(() => {
    if (isLoaded) {
      const savedChatId = localStorage.getItem('activeChatId');
      if (savedChatId) {
        setActiveChatId(savedChatId);
      }
    }
  }, [isLoaded]);

  useEffect(() => {
    if (!user) return;

    const fetchChats = async () => {
      const { data } = await supabase
        .from("user_chats")
        .select("id, title, updated_at")
        .eq("is_hidden", false)
        .eq("user_id", user.id)
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
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchChats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase]);

  if (!isLoaded) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#050505] text-white">
        <Loader2 size={32} className="animate-spin text-white/50" />
      </div>
    );
  }

  const navigateToChat = (id: string | null) => {
    setIsSidebarOpen(false); 
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
    e.stopPropagation(); 
    if (!user) return;
    await supabase.from("user_chats").update({ is_hidden: true }).eq("id", id);
    setChats(prev => prev.filter(c => c.id !== id));
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
    if (!user || !editingTitle.trim()) {
      setEditingChatId(null);
      return;
    }
    
    await supabase.from("user_chats").update({ title: editingTitle.trim() }).eq("id", id);
    setChats(prev => prev.map(c => c.id === id ? { ...c, title: editingTitle.trim() } : c));
    setEditingChatId(null);
  };

  const SidebarContent = () => (
    <>
      <div className="flex items-center justify-between pb-8 pt-4 px-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-rose-500 to-red-700 text-white flex items-center justify-center shadow-[0_0_20px_rgba(225,29,72,0.3)] border border-white/40">
            <Command size={20} strokeWidth={2.5} className="text-white drop-shadow-sm" />
          </div>
          <div>
            <h1 className="font-extrabold text-[15px] leading-none tracking-tight text-[#1c1917]">MIU AI Assistant</h1>
            <p className="text-[9px] text-zinc-500 font-bold tracking-[0.2em] uppercase mt-1.5">Official AI</p>
          </div>
        </div>
        
        <button 
          onClick={() => setIsSidebarOpen(false)}
          className="md:hidden p-2 rounded-full hover:bg-white/10 text-white/70"
        >
          <X size={20} />
        </button>
      </div>

      <button 
        onClick={() => navigateToChat(null)}
        className="w-full flex items-center justify-center gap-2 px-4 py-4 mb-8 bg-white border border-[#1c1917]/5 hover:border-red-500/20 hover:bg-rose-50/50 text-[#1c1917] text-[13px] font-bold rounded-2xl transition-all duration-300 shadow-sm hover:shadow-[0_4px_20px_rgba(225,29,72,0.1)] hover:scale-[1.02] group active:scale-[0.98]"
      >
        <Plus size={16} strokeWidth={3} className="text-rose-600 transition-transform duration-300 group-hover:rotate-90" />
        Start New Conversation
      </button>

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
                        ? "bg-rose-50 text-rose-700 font-semibold pr-16 shadow-[inset_0_1px_1px_rgba(255,255,255,1)] border border-rose-200" 
                        : "text-zinc-500 hover:text-[#1c1917] hover:bg-black/[0.03] pr-16 border border-transparent"
                    }`}
                  >
                    <MessageSquareText size={16} className={`shrink-0 transition-colors ${activeChatId === chat.id ? "text-rose-500" : "text-zinc-400 group-hover:text-zinc-600"}`} />
                    
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
                        className="flex-1 bg-white text-[#1c1917] px-2 py-1 rounded border border-[#1c1917]/10 focus:outline-none focus:border-rose-400 text-left"
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

      <div className="pt-6 mt-6 pb-4">
        <div className="bg-white backdrop-blur-3xl border border-[#1c1917]/5 rounded-[24px] p-4 flex flex-col gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <UserButton appearance={{ elements: { userButtonAvatarBox: "w-9 h-9" } }} />
            <div className="flex-1 min-w-0">
              <p className="text-[9px] text-zinc-500 font-bold tracking-[0.2em]">SESSION</p>
              <p className="text-[12px] text-zinc-200 font-bold truncate leading-tight mt-0.5">{user?.primaryEmailAddress?.emailAddress}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsApiModalOpen(true)}
              className="flex-shrink-0 flex items-center justify-center gap-2 px-3 py-2 text-[11px] font-bold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 hover:text-zinc-900 rounded-xl transition-all shadow-sm"
              title="Developer API"
            >
              <Key size={12} />
            </button>
            <button 
              onClick={() => setIsEmbedModalOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 px-2 py-2 text-[11px] font-bold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 hover:text-zinc-900 rounded-xl transition-all shadow-sm"
            >
              <Code size={12} /> Integrate
            </button>
          </div>
        </div>
      </div>
    </>
  );

  if (isLoaded && !user) {
    if (showSignIn) {
      return (
        <div className="flex bg-[#fdfbf7] h-screen w-full items-center justify-center relative overflow-hidden">
          <div className="absolute top-[20%] right-[10%] w-[500px] h-[500px] bg-gradient-to-bl from-rose-500/20 via-red-500/10 to-transparent pointer-events-none z-0 blur-[100px] rounded-full" />
          <div className="absolute bottom-[20%] left-[10%] w-[600px] h-[600px] bg-gradient-to-tr from-red-600/20 via-orange-500/10 to-transparent pointer-events-none z-0 blur-[120px] rounded-full" />
          <SignIn routing="hash" />
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#fdfbf7] flex flex-col relative overflow-x-hidden font-sans text-[#1c1917] scroll-smooth custom-scrollbar">
        {/* Ambient Background - Expanded for scrolling */}
        <div className="fixed top-[0%] right-[0%] w-[800px] h-[800px] bg-gradient-to-bl from-rose-400/20 via-red-300/10 to-transparent pointer-events-none z-0 blur-[150px] rounded-full" />
        <div className="fixed top-[40%] left-[0%] w-[600px] h-[600px] bg-gradient-to-tr from-red-500/15 via-rose-300/10 to-transparent pointer-events-none z-0 blur-[150px] rounded-full" />
        <div className="fixed bottom-[-10%] right-[20%] w-[700px] h-[700px] bg-gradient-to-t from-rose-600/10 via-orange-400/5 to-transparent pointer-events-none z-0 blur-[150px] rounded-full" />

        {/* Navbar */}
        <nav className="w-full px-8 py-6 flex items-center justify-between z-50 sticky top-0 bg-[#fdfbf7]/80 backdrop-blur-xl border-b border-[#1c1917]/5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-rose-500 to-red-700 text-white flex items-center justify-center shadow-[0_0_20px_rgba(225,29,72,0.3)]">
              <Command size={20} strokeWidth={2.5} />
            </div>
            <span className="font-extrabold text-[18px] tracking-tight">MIU AI</span>
          </div>
          <button 
            onClick={() => setShowSignIn(true)}
            className="px-6 py-2.5 rounded-full bg-[#1c1917] text-white text-[13px] font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            Sign In
          </button>
        </nav>

        <main className="w-full flex flex-col z-10 relative">
          
          {/* Hero Section */}
          <section className="min-h-[90vh] flex flex-col items-center justify-center px-6 text-center max-w-6xl mx-auto w-full pt-16 pb-24">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} className="w-full flex flex-col items-center z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-md border border-rose-500/20 text-rose-600 text-[11px] font-bold uppercase tracking-widest mb-10 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                Mewar University Official
              </div>
              
              <h1 className="text-5xl md:text-[6rem] font-extrabold tracking-tighter leading-[1.05] mb-8 text-[#1c1917]">
                The Next Generation of <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-600 via-red-600 to-orange-500 drop-shadow-sm">Campus Intelligence.</span>
              </h1>
              
              <p className="text-lg md:text-xl text-[#1c1917]/70 max-w-2xl mx-auto mb-10 font-medium leading-relaxed">
                Experience the smartest, fastest, and most elegant AI assistant ever built for Mewar University. Get instant answers, identify images, and manage your campus life seamlessly.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto mb-16">
                <button 
                  onClick={() => setShowSignIn(true)}
                  className="w-full sm:w-auto px-10 py-4 rounded-[20px] bg-gradient-to-r from-rose-600 to-red-700 text-white font-bold text-lg shadow-[0_15px_40px_rgba(225,29,72,0.3)] hover:shadow-[0_20px_50px_rgba(225,29,72,0.4)] hover:-translate-y-1 transition-all flex items-center justify-center gap-2 group"
                >
                  Start Chatting Free
                  <ChevronRight size={20} strokeWidth={3} className="transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </motion.div>

            {/* Hero Image */}
            <motion.div 
              initial={{ opacity: 0, y: 50 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
              className="relative w-full max-w-5xl mx-auto rounded-[40px] overflow-hidden shadow-2xl border border-white/20 bg-white/50 backdrop-blur-3xl z-10"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#fdfbf7]/80 z-10 pointer-events-none" />
              <Image 
                src="/assets/miu_hero.png" 
                alt="MIU AI Assistant Interface" 
                width={1200} 
                height={600} 
                className="w-full h-auto object-cover hover:scale-105 transition-transform duration-[2s] ease-out"
                priority
              />
            </motion.div>
          </section>

          {/* Features Grid */}
          <section className="py-32 px-6 w-full bg-white/60 backdrop-blur-3xl border-y border-[#1c1917]/5 relative z-20">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-20">
                <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">Supercharge your studies.</h2>
                <p className="text-[#1c1917]/60 font-medium text-xl max-w-2xl mx-auto">Everything you need to excel at Mewar University, wrapped in a breathtakingly fast interface.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Card 1 */}
                <motion.div whileHover={{ y: -10 }} transition={{ type: "spring", stiffness: 300 }} className="p-8 rounded-[32px] bg-white border border-[#1c1917]/5 shadow-lg hover:shadow-2xl transition-shadow duration-300 group overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-500" />
                  <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mb-8 text-rose-500 group-hover:scale-110 transition-transform relative overflow-hidden">
                    <Image src="/assets/vision_ai.png" alt="Vision AI" layout="fill" objectFit="cover" className="opacity-80 mix-blend-multiply" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 relative z-10">Vision AI</h3>
                  <p className="text-[#1c1917]/70 leading-relaxed text-[16px] relative z-10 font-medium">
                    Upload assignments, diagrams, or handwritten notes. Our advanced vision models will instantly identify, transcribe, and explain visual content with perfect clarity.
                  </p>
                </motion.div>

                {/* Card 2 */}
                <motion.div whileHover={{ y: -10 }} transition={{ type: "spring", stiffness: 300 }} className="p-8 rounded-[32px] bg-white border border-[#1c1917]/5 shadow-lg hover:shadow-2xl transition-shadow duration-300 group overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-500" />
                  <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mb-8 text-red-500 group-hover:scale-110 transition-transform relative overflow-hidden">
                    <Image src="/assets/reasoning_ai.png" alt="Advanced Reasoning" layout="fill" objectFit="cover" className="opacity-80 mix-blend-multiply" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 relative z-10">Advanced Reasoning</h3>
                  <p className="text-[#1c1917]/70 leading-relaxed text-[16px] relative z-10 font-medium">
                    Tackle complex calculus, write brilliant essays, or debug intricate code. The AI is designed to break down hard problems step-by-step for absolute comprehension.
                  </p>
                </motion.div>

                {/* Card 3 */}
                <motion.div whileHover={{ y: -10 }} transition={{ type: "spring", stiffness: 300 }} className="p-8 rounded-[32px] bg-white border border-[#1c1917]/5 shadow-lg hover:shadow-2xl transition-shadow duration-300 group overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-500" />
                  <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center mb-8 text-orange-500 group-hover:scale-110 transition-transform relative overflow-hidden">
                    <Image src="/assets/voice_ai.png" alt="Voice Dictation" layout="fill" objectFit="cover" className="opacity-80 mix-blend-multiply" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 relative z-10">Voice Dictation</h3>
                  <p className="text-[#1c1917]/70 leading-relaxed text-[16px] relative z-10 font-medium">
                    Speak naturally. Dictate long queries or have the assistant read answers back to you with incredibly human-like voices for effortless eyes-free studying.
                  </p>
                </motion.div>
              </div>
            </div>
          </section>

          {/* Social Proof / Stats */}
          <section className="py-24 px-6 max-w-5xl mx-auto w-full text-center">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div>
                <h4 className="text-4xl font-extrabold text-[#1c1917] mb-2">99.9%</h4>
                <p className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Uptime</p>
              </div>
              <div>
                <h4 className="text-4xl font-extrabold text-[#1c1917] mb-2">&lt;2s</h4>
                <p className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Response Time</p>
              </div>
              <div>
                <h4 className="text-4xl font-extrabold text-[#1c1917] mb-2">24/7</h4>
                <p className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Availability</p>
              </div>
              <div>
                <h4 className="text-4xl font-extrabold text-[#1c1917] mb-2">100%</h4>
                <p className="text-sm font-bold text-zinc-500 uppercase tracking-wider">MIU Ready</p>
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="py-24 px-6 w-full text-center relative overflow-hidden">
            <div className="max-w-3xl mx-auto relative z-10 p-12 bg-white rounded-[40px] border border-[#1c1917]/5 shadow-2xl shadow-rose-500/10">
              <Sparkles className="w-12 h-12 text-rose-500 mx-auto mb-6" />
              <h2 className="text-4xl font-extrabold tracking-tight mb-6">Ready to upgrade your workflow?</h2>
              <p className="text-[#1c1917]/60 text-lg mb-8 max-w-xl mx-auto font-medium">Join thousands of students and faculty members already using MIU AI to work smarter, not harder.</p>
              <button 
                onClick={() => setShowSignIn(true)}
                className="px-10 py-4 rounded-2xl bg-[#1c1917] text-white font-bold shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all"
              >
                Create Your Free Account
              </button>
            </div>
          </section>
          
          <footer className="py-8 text-center text-zinc-400 text-sm font-medium border-t border-[#1c1917]/5">
            &copy; {new Date().getFullYear()} Mewar University. All rights reserved. Designed for excellence.
          </footer>
        </main>
      </div>
    );
  }

  return (
    <>
      <div className="flex w-full h-[100dvh] overflow-hidden bg-[#fdfbf7] text-[#1c1917] font-sans selection:bg-rose-500/20 relative z-0">

          <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1]">
            <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] bg-rose-400/20 blur-[150px] rounded-full" />
            <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }} className="absolute -bottom-[20%] -left-[10%] w-[60%] h-[60%] bg-red-400/10 blur-[150px] rounded-full" />
          </div>

          <aside className="hidden md:flex flex-col w-[320px] border-r border-[#1c1917]/5 bg-white/70 backdrop-blur-[60px] p-6 shrink-0 z-10 relative shadow-[10px_0_50px_rgba(0,0,0,0.02)]">
            <SidebarContent />
          </aside>

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
                className="md:hidden fixed top-0 bottom-0 left-0 w-[80%] max-w-[300px] border-r border-[#1c1917]/5 bg-[#fdfbf7] p-5 z-50 flex flex-col shadow-2xl will-change-transform"
              >
                <SidebarContent />
              </motion.aside>
            )}
          </AnimatePresence>

          <main className="flex-1 relative h-full min-w-0 flex flex-col items-center">
            {user && (
              <ChatWindow 
                chatId={activeChatId} 
                userId={user.id} 
                onChatCreated={navigateToChat} 
                onMenuToggle={() => setIsSidebarOpen(true)}
              />
            )}
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
    </>
  );
}
