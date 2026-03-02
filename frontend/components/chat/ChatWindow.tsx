'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../hooks/useSocket';
import MessageBubble from './MessageBubble';
import { Send, Loader2, Hash, Users, ShieldAlert, Radio, Terminal, Zap, ShieldCheck } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

export default function ChatWindow({ roomId, roomName, type }: any) {
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);
    const socket = useSocket('chat');

    const isDM = type === 'dm';
    const accentColor = isDM ? '#A594D3' : '#A8D5BA'; // Lavender for DM, Sage for Public

    useEffect(() => {
        const loadHistory = async () => {
            setIsLoading(true);
            try {
                const { data } = await api.get(`/chat/${roomId}/history?limit=50`);
                setMessages(data.messages || []);
            } catch (error: any) {
                toast.error('Sync failed');
            } finally {
                setIsLoading(false);
            }
        };

        if (roomId) {
            loadHistory();
            socket?.emit('join-room', roomId);
        }

        return () => {
            if (roomId) socket?.emit('leave-room', roomId);
        };
    }, [roomId, socket]);

    useEffect(() => {
        if (!socket) return;
        const handleNewMessage = (msg: any) => {
            if (msg.roomId === roomId) {
                setMessages(prev => [...prev, msg]);
            }
        };
        socket.on('message', handleNewMessage);
        return () => { socket.off('message', handleNewMessage); };
    }, [socket, roomId]);

    useEffect(() => {
        if (scrollRef.current) {
            // Use requestAnimationFrame to ensure DOM is fully rendered
            requestAnimationFrame(() => {
                scrollRef.current?.scrollTo({
                    top: scrollRef.current.scrollHeight,
                    behavior: 'smooth'
                });
            });
        }
    }, [messages]);

    const sendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !socket) return;
        socket.emit('send-message', {
            roomId,
            content: input.trim()
        });
        setInput('');
    };

    return (
        <div className="flex flex-col h-full bg-[#F4F7F4] font-['Nunito'] relative">

            {/* Floating Header Card */}
            <div className="p-4 md:p-6 z-10">
                <div className="bg-white rounded-[24px] p-4 md:p-6 shadow-sm border border-black/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner" style={{ backgroundColor: `${accentColor}15`, color: accentColor }}>
                            {isDM ? <Radio size={24} /> : <Hash size={24} />}
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-[#1a1a2e] leading-tight">{roomName}</h3>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{type} Frequency Active</p>
                            </div>
                        </div>
                    </div>

                    <button className="p-3 text-gray-300 hover:text-[#E89BA5] transition-all rounded-xl hover:bg-red-50">
                        <ShieldAlert size={20} />
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-6 pb-6 space-y-2 scrollbar-hide"
            >
                {isLoading ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4">
                        <Loader2 className="animate-spin text-[#A8D5BA]" size={40} />
                        <span className="text-xs font-black uppercase tracking-widest text-gray-400 italic">Decrypting Comms...</span>
                    </div>
                ) : messages.length > 0 ? (
                    <div className="pt-4">
                        {messages.map((msg, i) => <MessageBubble key={msg._id || i} message={msg} />)}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                        <div className="w-20 h-20 bg-white rounded-[32px] flex items-center justify-center text-gray-200 mb-6 shadow-sm">
                            <Zap size={32} />
                        </div>
                        <p className="text-xs font-black uppercase tracking-widest text-gray-400 italic">Clear Frequency • Standing by for Intel</p>
                    </div>
                )}
            </div>

            {/* Composer Area */}
            <div className="p-6 md:p-8">
                <form onSubmit={sendMessage} className="relative group">
                    <div className="absolute -inset-1 bg-[#A8D5BA]/20 rounded-[32px] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />

                    <div className="relative flex items-center bg-white rounded-[28px] p-2 pr-2.5 shadow-md border border-black/5 group-focus-within:border-[#A8D5BA]/50 transition-all">
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 bg-transparent py-4 pl-6 pr-4 text-sm font-bold text-[#1a1a2e] focus:outline-none placeholder:text-gray-300 placeholder:italic"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim()}
                            className={`
                                h-12 w-12 rounded-2xl flex items-center justify-center transition-all shadow-sm active:scale-95
                                ${input.trim()
                                    ? 'bg-[#A8D5BA] text-white hover:bg-[#6CC89A] shadow-[0_4px_12px_rgba(168,213,186,0.4)]'
                                    : 'bg-gray-50 text-gray-200'}
                            `}
                        >
                            <Send size={20} className={input.trim() ? "translate-x-0.5 -translate-y-0.5" : ""} />
                        </button>
                    </div>
                </form>

                <div className="flex justify-between items-center mt-4 px-4">
                    <div className="flex items-center gap-2">
                        <ShieldCheck size={12} className="text-[#A8D5BA]" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">End-to-End Encrypted</span>
                    </div>
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">v1.4.0_Stable</span>
                </div>
            </div>
        </div>
    );
}
