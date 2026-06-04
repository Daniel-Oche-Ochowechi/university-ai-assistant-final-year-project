"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { Users, MessageSquareText, Activity, Key, Loader2, Database, ShieldAlert, ChevronLeft, Search } from "lucide-react";
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

  useEffect(() => {
    if (!isLoaded || !user) return;

    const fetchStats = async () => {
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

    fetchStats();
  }, [user, isLoaded]);

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#fdfbf7] flex flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-[#1c1917] mb-2">Access Denied or Error</h1>
        <p className="text-zinc-500 max-w-md">{error}</p>
        <Link href="/" className="mt-8 px-6 py-2 bg-rose-600 text-white rounded-full font-bold hover:bg-rose-700 transition-colors">
          Return to Home
        </Link>
      </div>
    );
  }

  const filteredChats = recentChats.filter(chat => 
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    chat.user_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-[#1c1917] font-sans selection:bg-rose-500/20">
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
        <div className="text-[11px] font-bold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-full border border-rose-100 uppercase tracking-widest">
          Admin Mode Active
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
          
          <div className="bg-white border border-[#1c1917]/10 rounded-3xl overflow-hidden shadow-sm">
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
              <span>Data fetched in real-time</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
