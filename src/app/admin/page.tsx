"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { Users, MessageSquareText, Activity, Key, Loader2, Database, ShieldAlert, ChevronLeft, Search, Lock, Unlock, ArrowRight } from "lucide-react";
import Link from "next/link";

type ChatData = {
  id: string;
  user_id: string;
  title: string;
  message_count: number;
  updated_at: string;
};

type Stats = {
  totalUsers: number;
  totalChats: number;
  totalMessages: number;
  totalApiKeys: number;
};

export default function AdminDashboard() {
  const { user, isLoaded } = useUser();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentChats, setRecentChats] = useState<ChatData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Admin Login State
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState("");

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setAuthError("");

    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      const data = await res.json();
      
      if (data.success) {
        setIsUnlocked(true);
        fetchStats();
      } else {
        setAuthError(data.error || "Invalid passcode");
      }
    } catch (err: any) {
      setAuthError("Failed to connect to authentication server.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) {
        throw new Error("Failed to fetch admin stats. Ensure SUPABASE_SERVICE_ROLE_KEY is configured.");
      }
      const data = await res.json();
      setStats(data.stats);
      setRecentChats(data.recentChats);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check if session storage has the unlock flag already
    const unlocked = sessionStorage.getItem("adminUnlocked");
    if (unlocked === "true") {
      setIsUnlocked(true);
    }
  }, []);

  useEffect(() => {
    if (isUnlocked && isLoaded && user) {
      fetchStats();
      sessionStorage.setItem("adminUnlocked", "true");
    }
  }, [isUnlocked, user, isLoaded]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
      </div>
    );
  }

  // --- ADMIN LOGIN SCREEN ---
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center relative overflow-hidden font-sans text-[#1c1917]">
        {/* Ambient background for login */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-tr from-rose-400/20 via-red-300/10 to-transparent blur-[120px] rounded-full pointer-events-none" />
        
        <Link href="/" className="absolute top-8 left-8 p-3 rounded-full bg-white/50 hover:bg-white text-zinc-500 hover:text-[#1c1917] transition-all shadow-sm flex items-center gap-2">
          <ChevronLeft size={18} />
          <span className="text-sm font-bold">Return Home</span>
        </Link>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative z-10 w-full max-w-md bg-white/80 backdrop-blur-2xl p-10 rounded-[40px] border border-white shadow-2xl shadow-rose-500/10 text-center"
        >
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-rose-50 to-red-50 text-rose-600 flex items-center justify-center mx-auto mb-6 shadow-inner border border-rose-100">
            <Lock size={28} />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">Restricted Access</h1>
          <p className="text-zinc-500 text-sm font-medium mb-8">Enter the master passcode to access the System Intelligence Dashboard.</p>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="relative">
              <input 
                type="password" 
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter passcode..." 
                className="w-full bg-[#fdfbf7] border border-zinc-200 rounded-2xl py-4 px-5 pr-14 text-center font-mono tracking-widest focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-500/10 transition-all text-lg shadow-inner"
                autoFocus
              />
              <button 
                type="submit" 
                disabled={isAuthenticating || !passcode}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-[#1c1917] text-white hover:bg-rose-600 transition-colors disabled:opacity-50 disabled:hover:bg-[#1c1917]"
              >
                {isAuthenticating ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
              </button>
            </div>
            
            <AnimatePresence>
              {authError && (
                <motion.p 
                  initial={{ opacity: 0, y: -10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0 }}
                  className="text-red-500 text-sm font-bold"
                >
                  {authError}
                </motion.p>
              )}
            </AnimatePresence>
          </form>
        </motion.div>
      </div>
    );
  }

  // --- MAIN DASHBOARD SCREEN ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fdfbf7] flex flex-col items-center justify-center">
        <Unlock className="w-10 h-10 text-rose-500 mb-4 animate-pulse" />
        <p className="text-zinc-500 font-bold tracking-widest uppercase text-xs">Authenticating & Loading Data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#fdfbf7] flex flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-[#1c1917] mb-2">System Error</h1>
        <p className="text-zinc-500 max-w-md">{error}</p>
        <div className="flex gap-4 mt-8">
          <button onClick={fetchStats} className="px-6 py-2 bg-[#1c1917] text-white rounded-full font-bold hover:bg-zinc-800 transition-colors">
            Retry
          </button>
          <button onClick={() => { setIsUnlocked(false); sessionStorage.removeItem("adminUnlocked"); }} className="px-6 py-2 bg-red-100 text-red-600 rounded-full font-bold hover:bg-red-200 transition-colors">
            Logout
          </button>
        </div>
      </div>
    );
  }

  const filteredChats = recentChats.filter(chat => 
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    chat.user_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} className="min-h-screen bg-[#fdfbf7] text-[#1c1917] font-sans selection:bg-rose-500/20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#1c1917]/5 shadow-sm px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 rounded-full hover:bg-black/5 text-zinc-500 hover:text-[#1c1917] transition-all">
            <ChevronLeft size={20} />
          </Link>
          <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-[#1c1917] to-zinc-800 text-white flex items-center justify-center shadow-sm">
            <Database size={16} />
          </div>
          <h1 className="font-extrabold text-[18px] tracking-tight">System Intelligence Dashboard</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 uppercase tracking-widest flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Admin Authenticated
          </div>
          <button 
            onClick={() => { setIsUnlocked(false); sessionStorage.removeItem("adminUnlocked"); }}
            className="p-2 rounded-full hover:bg-red-50 text-red-500 transition-colors tooltip"
            title="Lock Dashboard"
          >
            <Lock size={18} />
          </button>
        </div>
      </header>

      <main className="p-8 max-w-7xl mx-auto space-y-12">
        {/* Stat Cards */}
        <section>
          <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-6">Global Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-3xl p-6 border border-[#1c1917]/5 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity"><Users size={80} /></div>
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mb-4"><Users size={20} /></div>
              <h3 className="text-3xl font-extrabold mb-1">{stats?.totalUsers.toLocaleString()}</h3>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total Unique Users</p>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-3xl p-6 border border-[#1c1917]/5 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity"><MessageSquareText size={80} /></div>
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-4"><MessageSquareText size={20} /></div>
              <h3 className="text-3xl font-extrabold mb-1">{stats?.totalChats.toLocaleString()}</h3>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total Conversations</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-3xl p-6 border border-[#1c1917]/5 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity"><Activity size={80} /></div>
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-4"><Activity size={20} /></div>
              <h3 className="text-3xl font-extrabold mb-1">{stats?.totalMessages.toLocaleString()}</h3>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Messages Processed</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white rounded-3xl p-6 border border-[#1c1917]/5 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity"><Key size={80} /></div>
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mb-4"><Key size={20} /></div>
              <h3 className="text-3xl font-extrabold mb-1">{stats?.totalApiKeys.toLocaleString()}</h3>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Active API Keys</p>
            </motion.div>
          </div>
        </section>

        {/* Analyzing Table */}
        <section>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">System Analysis Table</h2>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search by User ID or Title..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-[#1c1917]/10 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20 transition-all shadow-sm"
              />
            </div>
          </div>
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-white border border-[#1c1917]/10 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#1c1917]/[0.02] border-b border-[#1c1917]/5">
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Conversation Title</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">User ID</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Messages</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredChats.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-zinc-500 italic">No records found.</td>
                    </tr>
                  ) : (
                    filteredChats.map((chat) => (
                      <tr key={chat.id} className="border-b border-[#1c1917]/5 hover:bg-rose-50/30 transition-colors">
                        <td className="px-6 py-4 font-semibold text-[#1c1917] max-w-[200px] truncate" title={chat.title}>
                          {chat.title}
                        </td>
                        <td className="px-6 py-4">
                          <code className="px-2 py-1 bg-zinc-100 text-zinc-600 rounded text-xs font-mono border border-zinc-200">
                            {chat.user_id.substring(0, 15)}...
                          </code>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-[#1c1917]/5 text-xs font-bold text-[#1c1917]">
                            {chat.message_count}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-zinc-500">
                          {new Date(chat.updated_at).toLocaleString(undefined, {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="bg-zinc-50 px-6 py-4 border-t border-[#1c1917]/5 text-xs text-zinc-500 flex justify-between items-center">
              <span>Showing {filteredChats.length} records</span>
              <span>Data fetched in real-time directly from Database</span>
            </div>
          </motion.div>
        </section>
      </main>
    </motion.div>
  );
}
