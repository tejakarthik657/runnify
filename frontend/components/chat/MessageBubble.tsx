'use client';

import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { formatDistanceToNow } from 'date-fns';

export default function MessageBubble({ message }: { message: any }) {
    const { user } = useAuthStore();
    const isMe = message.sender._id === user?.id;

    return (
        <div className={`flex flex-col mb-6 ${isMe ? 'items-end' : 'items-start'} group animate-in fade-in slide-in-from-bottom-2 duration-300 font-['Nunito']`}>
            {/* Metadata Strip */}
            <div className={`flex items-center gap-2 mb-1.5 px-2 text-[10px] font-black uppercase tracking-widest`}>
                {!isMe && (
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 border border-black/5">
                            {message.sender.avatarUrl ? (
                                <img src={message.sender.avatarUrl} alt={message.sender.username} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-[#F0F7F4] text-[8px] font-black" style={{ color: message.sender.color }}>
                                    {message.sender.username.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <span
                            className="text-[#2E7D52]"
                            style={{ color: message.sender.color }}
                        >
                            {message.sender.username}
                        </span>
                    </div>
                )}
                {isMe && (
                    <div className="flex items-center gap-2">
                        <span className="text-[#A8D5BA]">
                            YOU
                        </span>
                        <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 border border-black/5">
                            {user?.avatarUrl ? (
                                <img src={user.avatarUrl} alt="Me" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-[#F0F7F4] text-[8px] font-black" style={{ color: user?.color }}>
                                    {user?.username?.charAt(0).toUpperCase() || 'M'}
                                </div>
                            )}
                        </div>
                    </div>
                )}
                <span className="text-gray-400 font-bold">
                    • {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                </span>
            </div>

            {/* Message Body */}
            <div
                className={`
                    relative max-w-[85%] px-5 py-3.5 text-sm font-bold leading-relaxed shadow-sm transition-all duration-200
                    ${isMe
                        ? 'bg-[#A8D5BA] text-white rounded-[24px] rounded-tr-none'
                        : 'bg-white text-[#1a1a2e] border border-black/5 rounded-[24px] rounded-tl-none group-hover:shadow-md'
                    }
                `}
            >
                <p>{message.content}</p>
            </div>

            {/* Action Hook */}
            {!isMe && (
                <button className="mt-1.5 px-2 text-[9px] font-black uppercase tracking-widest text-[#A8D5BA] opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0">
                    Send Direct Message
                </button>
            )}
        </div>
    );
}