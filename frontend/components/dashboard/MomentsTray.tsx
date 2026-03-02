'use client';

import React, { useState, useRef } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Clock, MapPin, Navigation2, Camera, Loader2, X, Upload } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const fetcher = (url: string) => api.get(url).then(res => res.data);

export default function MomentsTray() {
    const { data, mutate, isLoading } = useSWR('/user/moments', fetcher, { refreshInterval: 60000 });
    const [selectedMoment, setSelectedMoment] = useState<any>(null);
    const [isSharing, setIsSharing] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [momentImage, setMomentImage] = useState<string | null>(null);
    const [momentFile, setMomentFile] = useState<File | null>(null);
    const [momentCaption, setMomentCaption] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Check file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                toast.error('Image too large (max 10MB)');
                return;
            }

            // Store original file for upload
            setMomentFile(file);

            // Create preview
            const reader = new FileReader();
            reader.onload = (evt) => {
                setMomentImage(evt.target?.result as string);
                setShowShareModal(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const shareMoment = async () => {
        if (!momentFile) {
            toast.error('Please select an image');
            return;
        }

        setIsSharing(true);
        try {
            // Create FormData for multipart upload using original file
            const formData = new FormData();
            formData.append('file', momentFile);
            formData.append('caption', momentCaption || 'Securing the city one hex at a time. 🏃‍♂️⚔️');

            // DON'T set Content-Type normally - browser will automatically add proper boundary, 
            // but we need to override the default JSON setting in api.ts
            await api.post('/user/me/moments', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success('Moment shared with the city!');

            // Reset state
            setMomentImage(null);
            setMomentFile(null);
            setMomentCaption('');
            setShowShareModal(false);

            // Refresh moments list
            mutate();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to share moment');
        } finally {
            setIsSharing(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <Camera size={18} className="text-[#A8D5BA]" />
                    <h3 className="text-sm font-black text-[#1a1a2e] uppercase tracking-widest">Active Moments</h3>
                </div>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSharing}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-[#A8D5BA]/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#2E7D52] hover:bg-[#F0F7F4] transition-all active:scale-95 disabled:opacity-50"
                >
                    {isSharing ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                    Share Today's Run
                </button>

                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleImageSelect}
                    className="hidden"
                />
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 pt-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
                <AnimatePresence mode="popLayout">
                    {isLoading ? (
                        [1, 2, 3].map(i => (
                            <div key={i} className="min-w-[120px] h-[180px] rounded-3xl bg-gray-100 animate-pulse border border-black/5" />
                        ))
                    ) : data?.moments?.length > 0 ? (
                        data.moments.map((moment: any) => (
                            <motion.div
                                key={moment._id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                whileHover={{ y: -4, scale: 1.02 }}
                                onClick={() => setSelectedMoment(moment)}
                                className="relative min-w-[130px] h-[190px] rounded-[32px] overflow-hidden cursor-pointer shadow-sm border border-black/5 flex-shrink-0 group"
                            >
                                <img
                                    src={moment.imageUrl}
                                    alt="Runner Moment"
                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                                <div className="absolute top-3 left-3 flex items-center gap-2">
                                    {moment.userAvatarUrl ? (
                                        <div className="w-8 h-8 rounded-xl border-2 border-white shadow-lg overflow-hidden">
                                            <img src={moment.userAvatarUrl} alt={moment.username} className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className="w-8 h-8 rounded-xl border-2 border-white shadow-lg flex items-center justify-center text-[10px] font-black" style={{ backgroundColor: moment.userColor }}>
                                            {moment.username[0].toUpperCase()}
                                        </div>
                                    )}
                                </div>

                                <div className="absolute bottom-4 left-4 right-4 text-white">
                                    <p className="text-[10px] font-black uppercase tracking-tight truncate">{moment.username}</p>
                                    <div className="flex items-center gap-1 mt-1 opacity-60">
                                        <Clock size={8} />
                                        <span className="text-[8px] font-bold uppercase tracking-widest">
                                            {Math.max(1, Math.floor((new Date(moment.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60)))}h left
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <div className="w-full py-12 flex flex-col items-center justify-center bg-white rounded-[40px] border border-dashed border-gray-100">
                            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-200 mb-4">
                                <Camera size={24} />
                            </div>
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] italic">No active field moments</p>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* Lightbox */}
            <AnimatePresence>
                {selectedMoment && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedMoment(null)}
                        className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white max-w-md w-full rounded-[48px] overflow-hidden shadow-2xl relative"
                        >
                            <button
                                onClick={() => setSelectedMoment(null)}
                                className="absolute top-6 right-6 z-10 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-all"
                            >
                                <X size={20} />
                            </button>

                            <div className="relative h-[400px]">
                                <img src={selectedMoment.imageUrl} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                                <div className="absolute bottom-8 left-8 right-8 text-white flex items-end justify-between">
                                    <div className="flex items-center gap-4">
                                        {selectedMoment.userAvatarUrl ? (
                                            <div className="w-14 h-14 rounded-2xl border border-white/30 shadow-lg overflow-hidden">
                                                <img src={selectedMoment.userAvatarUrl} alt={selectedMoment.username} className="w-full h-full object-cover" />
                                            </div>
                                        ) : (
                                            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-xl font-black shadow-lg" style={{ color: selectedMoment.userColor }}>
                                                {selectedMoment.username[0].toUpperCase()}
                                            </div>
                                        )}
                                        <div>
                                            <h4 className="text-xl font-black uppercase tracking-tight leading-none mb-1">{selectedMoment.username}</h4>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Deployment Sector: {selectedMoment.city || 'Wild_Zone'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 space-y-6">
                                <div className="p-6 bg-[#F8FAFB] rounded-[32px] border border-black/5">
                                    <p className="text-sm font-bold text-[#1a1a2e] leading-relaxed italic">
                                        "{selectedMoment.caption}"
                                    </p>
                                </div>

                                {selectedMoment.stats && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-[#F0F7F4] rounded-2xl border border-[#A8D5BA]/20">
                                            <div className="text-[10px] font-black text-[#2E7D52] uppercase tracking-[0.2em] mb-1">Distance</div>
                                            <div className="text-lg font-black text-[#1a1a2e]">{selectedMoment.stats.distanceKm.toFixed(1)} KM</div>
                                        </div>
                                        <div className="p-4 bg-[#F5F3FF] rounded-2xl border border-[#A594D3]/20">
                                            <div className="text-[10px] font-black text-[#A594D3] uppercase tracking-[0.2em] mb-1">Captured</div>
                                            <div className="text-lg font-black text-[#1a1a2e]">{selectedMoment.stats.hexCount} HEX</div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center justify-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] pb-2">
                                    <Clock size={12} />
                                    This data will self-destruct in {Math.max(1, Math.floor((new Date(selectedMoment.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60)))} hours
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Share Moment Modal */}
            <AnimatePresence>
                {showShareModal && momentImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => {
                            setShowShareModal(false);
                            setMomentImage(null);
                            setMomentFile(null);
                            setMomentCaption('');
                        }}
                        className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md flex items-center justify-center p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white max-w-md w-full rounded-[48px] overflow-hidden shadow-2xl"
                        >
                            <div className="relative h-[320px]">
                                <img src={momentImage} alt="Moment preview" className="w-full h-full object-cover" />
                                <button
                                    onClick={() => {
                                        setShowShareModal(false);
                                        setMomentImage(null);
                                        setMomentFile(null);
                                        setMomentCaption('');
                                    }}
                                    className="absolute top-6 right-6 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-8 space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">
                                        Moment Caption (Optional)
                                    </label>
                                    <textarea
                                        value={momentCaption}
                                        onChange={(e) => setMomentCaption(e.target.value.slice(0, 160))}
                                        placeholder="Add a message to your moment..."
                                        className="w-full h-20 p-4 bg-[#F8FAFB] border border-black/5 rounded-2xl text-sm font-bold text-[#1a1a2e] placeholder:text-gray-300 focus:outline-none focus:border-[#A8D5BA] resize-none"
                                    />
                                    <p className="text-[8px] text-gray-400 mt-2">{momentCaption.length}/160</p>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setShowShareModal(false);
                                            setMomentImage(null);
                                            setMomentFile(null);
                                            setMomentCaption('');
                                        }}
                                        className="flex-1 h-12 bg-gray-100 hover:bg-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-600 rounded-[20px] transition-all active:scale-95"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={shareMoment}
                                        disabled={isSharing}
                                        className="flex-1 h-12 bg-gradient-to-r from-[#A8D5BA] to-[#6CC89A] hover:shadow-lg disabled:opacity-50 text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-[20px] transition-all flex items-center justify-center gap-2 active:scale-95"
                                    >
                                        {isSharing ? (
                                            <>
                                                <Loader2 size={14} className="animate-spin" />
                                                Sharing...
                                            </>
                                        ) : (
                                            <>
                                                <Upload size={14} />
                                                Share Now
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
