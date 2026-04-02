"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Sparkles, Mail, Lock, Loader2, ArrowRight, Chrome, Apple, ArrowLeft, KeyRound } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type AuthView = "signin" | "signup" | "forgot-password" | "otp-verify" | "reset-password";

export default function Auth({ onAuthSuccess }: { onAuthSuccess: () => void }) {
    const [view, setView] = useState<AuthView>("signin");
    
    // Check for reset-password in URL on mount
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get("view") === "reset-password") {
            setView("reset-password");
        }
    }, []);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [otpCode, setOtpCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (view === "signup") {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                setView("otp-verify");
                setMessage("Check your email for the verification code!");
            } else if (view === "signin") {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                onAuthSuccess();
            } else if (view === "reset-password") {
                const { error } = await supabase.auth.updateUser({
                    password: password,
                });
                if (error) throw error;
                setMessage("Password updated successfully! Redirecting...");
                setTimeout(() => onAuthSuccess(), 2000);
            } else if (view === "forgot-password") {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/auth/callback?view=reset-password`,
                });
                if (error) throw error;
                setMessage("Password reset link sent to your email!");
            } else if (view === "otp-verify") {
                const { error } = await supabase.auth.verifyOtp({
                    email,
                    token: otpCode,
                    type: "signup",
                });
                if (error) throw error;
                onAuthSuccess();
            }
        } catch (err: any) {
            setError(err.message || "An error occurred during authentication.");
        } finally {
            setLoading(false);
        }
    };

    const handleOAuth = async (provider: "google" | "apple") => {
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });
            if (error) throw error;
        } catch (err: any) {
            setError(err.message || `Failed to sign in with ${provider}`);
            setLoading(false);
        }
    };

    return (
        <div className="flex w-full h-screen bg-black text-white selection:bg-white/20 items-center justify-center relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-[20%] right-[10%] w-[500px] h-[500px] bg-gradient-to-bl from-indigo-500/20 via-purple-500/10 to-transparent pointer-events-none -z-10 blur-[100px] rounded-full" />
            <div className="absolute bottom-[20%] left-[10%] w-[600px] h-[600px] bg-gradient-to-tr from-blue-600/20 via-cyan-500/10 to-transparent pointer-events-none -z-10 blur-[120px] rounded-full" />

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                className="w-full max-w-[400px] p-8 rounded-[2.5rem] bg-white/[0.03] backdrop-blur-3xl border border-white/[0.08] shadow-2xl relative z-10"
            >
                <div className="flex flex-col items-center mb-10">
                    <div className="p-3 rounded-2xl bg-white shadow-xl shadow-white/10 ring-1 ring-white/20 mb-6">
                        <Sparkles className="text-black" size={24} />
                    </div>
                    <h1 className="text-2xl font-semibold tracking-tight text-white mb-2">
                        {view === "signup" && "Join Nexus AI"}
                        {view === "signin" && "Welcome Back"}
                        {view === "forgot-password" && "Reset Password"}
                        {view === "otp-verify" && "Verify Email"}
                        {view === "reset-password" && "Set New Password"}
                    </h1>
                    <p className="text-sm text-neutral-400 font-medium text-center px-4">
                        {view === "signup" && "Create an account to save your chats and stay connected."}
                        {view === "signin" && "Sign in to access your chat history and continue exploring."}
                        {view === "forgot-password" && "Enter your email to receive a password reset link."}
                        {view === "otp-verify" && "Enter the verification code sent to your email."}
                        {view === "reset-password" && "Enter your new password below."}
                    </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                    <AnimatePresence mode="wait">
                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0, y: -10 }}
                                animate={{ opacity: 1, height: 'auto', y: 0 }}
                                exit={{ opacity: 0, height: 0, y: -10 }}
                                className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium px-4 py-3 rounded-xl text-center"
                            >
                                {error}
                            </motion.div>
                        )}
                        {message && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0, y: -10 }}
                                animate={{ opacity: 1, height: 'auto', y: 0 }}
                                exit={{ opacity: 0, height: 0, y: -10 }}
                                className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium px-4 py-3 rounded-xl text-center"
                            >
                                {message}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {view !== "otp-verify" && (
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-white transition-colors" size={18} />
                            <input
                                type="email"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-white/30 focus:bg-white/[0.05] transition-all"
                            />
                        </div>
                    )}

                    {view === "otp-verify" && (
                        <div className="relative group">
                            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-white transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Verification Code"
                                value={otpCode}
                                onChange={(e) => setOtpCode(e.target.value)}
                                required
                                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-white/30 focus:bg-white/[0.05] transition-all text-center tracking-widest text-lg font-bold"
                            />
                        </div>
                    )}

                    {(view === "signin" || view === "signup" || view === "reset-password") && (
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-white transition-colors" size={18} />
                            <input
                                type="password"
                                placeholder={view === "reset-password" ? "New Password" : "Password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-white/30 focus:bg-white/[0.05] transition-all"
                            />
                        </div>
                    )}

                    {view === "signin" && (
                        <div className="flex justify-end px-1">
                            <button
                                type="button"
                                onClick={() => setView("forgot-password")}
                                className="text-xs font-medium text-neutral-500 hover:text-white transition-colors"
                            >
                                Forgot password?
                            </button>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !email || (view !== "forgot-password" && view !== "otp-verify" && password.length < 6)}
                        className="w-full flex items-center justify-center gap-2 bg-white text-black font-semibold rounded-2xl py-3.5 mt-6 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-xl shadow-white/5"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : (
                            <>
                                {view === "signup" && "Create Account"}
                                {view === "signin" && "Sign In"}
                                {view === "forgot-password" && "Send Reset Link"}
                                {view === "otp-verify" && "Verify Code"}
                                {view === "reset-password" && "Update Password"}
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>

                {(view === "signin" || view === "signup") && (
                    <div className="mt-8">
                        <div className="relative mb-6">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-white/10"></span>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-black px-2 text-neutral-500 font-bold tracking-widest">Or continue with</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => handleOAuth("google")}
                                className="flex items-center justify-center gap-2 bg-white/[0.03] border border-white/10 rounded-2xl py-3 text-sm font-medium hover:bg-white/[0.08] transition-all active:scale-[0.98]"
                            >
                                <Chrome size={18} />
                                Google
                            </button>
                            <button
                                onClick={() => handleOAuth("apple")}
                                className="flex items-center justify-center gap-2 bg-white/[0.03] border border-white/10 rounded-2xl py-3 text-sm font-medium hover:bg-white/[0.08] transition-all active:scale-[0.98]"
                            >
                                <Apple size={18} />
                                Apple
                            </button>
                        </div>
                    </div>
                )}

                <div className="mt-8 text-center">
                    {view === "forgot-password" ? (
                        <button
                            type="button"
                            onClick={() => { setView("signin"); setError(null); setMessage(null); }}
                            className="text-xs font-medium text-neutral-400 hover:text-white transition-colors flex items-center justify-center gap-2 mx-auto"
                        >
                            <ArrowLeft size={14} /> Back to Sign In
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => { setView(view === "signup" ? "signin" : "signup"); setError(null); setMessage(null); }}
                            className="text-xs font-medium text-neutral-400 hover:text-white transition-colors"
                        >
                            {view === "signup" ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
