'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, User, Loader2, Sparkles, X, Radio, ArrowRight, Bot } from 'lucide-react';
import api from '../../services/api';

const C = {
    sage: '#A8D5BA',
    sageDark: '#6CC89A',
    sageDeep: '#2E7D52',
    lavender: '#C3B1E1',
    lavenderDeep: '#A594D3',
    white: '#FFFFFF',
    bg: '#F8FAF8',
    ink: '#1A1A2E',
    muted: '#94A3B8',
};

export default function ChatPopup() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<any[]>([
        {
            role: 'assistant',
            content: "HELLO RUNNER. I am your Tactical Liaison. Ready to help you optimize your routes or manage your territories. What's our next objective?"
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isLoading, isOpen]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg = { role: 'user', content: input.trim() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const { data } = await api.post('/bot/ask', { question: userMsg.content });
            setMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
        } catch (error: any) {
            setMessages(prev => [...prev, { role: 'assistant', content: "CONNECTION LOSS. Signal to HQ is unstable. Please verify your grid connection." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[9999] font-['Nunito']">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 30, scale: 0.9, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: 30, scale: 0.9, filter: 'blur(10px)' }}
                        className="absolute bottom-[88px] right-0 w-[420px] max-w-[calc(100vw-48px)] h-[600px] max-h-[calc(100vh-140px)] bg-white/90 backdrop-blur-2xl border border-white/20 shadow-[0_32px_128px_-32px_rgba(46,125,82,0.25)] flex flex-col overflow-hidden rounded-[40px]"
                    >
                        {/* Premium Header */}
                        <div className="p-6 bg-gradient-to-br from-[#A8D5BA] to-[#6CC89A] flex items-center justify-between shadow-lg relative overflow-hidden">
                            <div className="absolute inset-0 opacity-10 pointer-events-none">
                                <Radio size={120} className="absolute -right-8 -top-8 rotate-12" />
                            </div>

                            <div className="flex items-center gap-4 relative z-10">
                                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/30 shadow-inner">
                                    <Bot size={24} />
                                </div>
                                <div className="space-y-0.5">
                                    <h3 className="text-sm font-black font-['Syne'] uppercase tracking-widest text-white">RECON_UNIT_ALPHA</h3>
                                    <div className="flex items-center gap-2">
                                        <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                                        <span className="text-[10px] text-white/70 font-black uppercase tracking-widest">Uplink Active</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all active:scale-90 relative z-10"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide relative bg-[#F8FAF8]/50">
                            {messages.map((m, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex gap-3 ${m.role === 'assistant' ? 'items-start' : 'items-start flex-row-reverse'}`}
                                >
                                    <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center shadow-sm ${m.role === 'assistant'
                                        ? 'bg-white text-[#A8D5BA]'
                                        : 'bg-[#A594D3] text-white'
                                        }`}>
                                        {m.role === 'assistant' ? <Radio size={16} /> : <User size={16} />}
                                    </div>

                                    <div className={`flex flex-col gap-1 max-w-[80%] ${m.role === 'assistant' ? 'items-start' : 'items-end'}`}>
                                        <div className={`px-5 py-3.5 text-sm font-bold leading-relaxed tracking-tight shadow-sm rounded-2xl ${m.role === 'assistant'
                                            ? 'bg-white border border-black/5 text-[#1A1A2E] rounded-tl-none'
                                            : 'bg-[#C3B1E1] text-[#1A1A2E] rounded-tr-none'
                                            }`}>
                                            {m.content}
                                        </div>
                                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest px-1">
                                            {m.role === 'assistant' ? 'Tactical Bot' : 'Identity Verified'}
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                            {isLoading && (
                                <motion.div className="flex gap-3">
                                    <div className="w-8 h-8 bg-white rounded-xl text-[#A8D5BA] flex items-center justify-center shadow-sm">
                                        <Loader2 size={16} className="animate-spin" />
                                    </div>
                                    <div className="bg-white/40 border border-black/5 px-5 py-3 rounded-2xl rounded-tl-none">
                                        <div className="flex gap-1">
                                            {[0, 1, 2].map((d) => (
                                                <motion.div
                                                    key={d}
                                                    animate={{ opacity: [0.2, 1, 0.2] }}
                                                    transition={{ duration: 1, repeat: Infinity, delay: d * 0.2 }}
                                                    className="w-1.5 h-1.5 rounded-full bg-[#A8D5BA]"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                            <div ref={scrollRef} />
                        </div>

                        {/* Premium Input Area */}
                        <div className="p-8 bg-white border-t border-black/5">
                            <form onSubmit={handleSend} className="relative group">
                                <div className="absolute -inset-2 bg-gradient-to-r from-[#A8D5BA] to-[#6CC89A] opacity-0 group-focus-within:opacity-10 transition duration-500 blur-xl rounded-full" />

                                <div className="relative flex items-center bg-[#F8FAF8] border border-black/5 rounded-3xl p-2 pr-2 shadow-inner group-focus-within:border-[#A8D5BA]/50 transition-all">
                                    <div className="pl-4 pr-2 text-slate-300">
                                        <Sparkles size={18} />
                                    </div>
                                    <input
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder="Command HQ..."
                                        className="flex-1 bg-transparent py-4 text-sm font-bold text-[#1A1A2E] focus:outline-none placeholder:text-slate-300 placeholder:italic placeholder:font-bold"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!input.trim() || isLoading}
                                        className="h-12 px-6 bg-[#A8D5BA] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-[#6CC89A] hover:scale-105 active:scale-95 disabled:bg-gray-100 disabled:text-gray-300 disabled:scale-100 transition-all flex items-center gap-2 group-send"
                                    >
                                        Execute
                                        <ArrowRight size={14} className="group-send-hover:translate-x-0.5 transition-transform" />
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Redesigned Trigger Button */}
            <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className={`w-16 h-16 rounded-[24px] flex items-center justify-center transition-all duration-500 shadow-2xl relative group ${isOpen
                    ? 'bg-[#E89BA5] text-white shadow-[#E89BA5]/30'
                    : 'bg-gradient-to-br from-[#A8D5BA] to-[#6CC89A] text-white shadow-green-200'
                    }`}
            >
                <div className="absolute inset-0 bg-white/20 rounded-[24px] opacity-0 group-hover:opacity-100 transition-opacity" />
                {isOpen ? <X size={28} /> : (
                    <div className="relative">
                        <MessageCircle size={30} fill="currentColor" fillOpacity={0.2} />
                        <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-white rounded-full border-2 border-[#A8D5BA] flex items-center justify-center"
                        >
                            <div className="w-1 h-1 rounded-full bg-[#A8D5BA] animate-pulse" />
                        </motion.div>
                    </div>
                )}
            </motion.button>
        </div>
    );
}
