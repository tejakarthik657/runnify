'use client';

import React from 'react';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import {
    ShieldCheck,
    ExternalLink,
    Database,
    Clock,
    ArrowLeft,
    Loader2,
    Lock,
    Globe,
    FileSearch,
    Terminal,
    Fingerprint,
    Cpu,
    Link as LinkIcon,
    ChevronRight,
    Search
} from 'lucide-react';
import Link from 'next/link';
import api from '../../services/api';
import Badge from '../../components/ui/Badge';

const fetcher = (url: string) => api.get(url).then(res => res.data);

export default function BlockchainPage() {
    const { data: proofsData, isLoading } = useSWR('/blockchain/proofs', fetcher);
    const { data: myProof } = useSWR('/blockchain/my-proof/today', fetcher);

    return (
        <div className="min-h-screen pb-20 font-['Nunito'] bg-[#F4F7F4]">
            <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 bg-white p-8 rounded-[40px] border border-black/5 shadow-sm">
                    <div className="flex items-center gap-6">
                        <Link href="/dashboard" className="p-4 bg-[#F4F7F4] rounded-2xl border border-black/5 hover:shadow-md transition-all active:scale-95">
                            <ArrowLeft size={24} className="text-[#1a1a2e]" />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-black text-[#1a1a2e]">Proof of Run</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="lavender">Immutable Ledger</Badge>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Protocol Integrity V.4</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 bg-[#F8F5FE] px-5 py-3 rounded-2xl border border-[#C3B1E1]/20 shadow-inner">
                        <div className="w-2 h-2 rounded-full bg-[#A594D3] animate-pulse" />
                        <span className="text-[10px] font-black text-[#A594D3] uppercase tracking-widest leading-none">Net: Solana Mainnet Node</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* LEFT COLUMN: Immutable Proofs */}
                    <div className="lg:col-span-8 space-y-8">

                        {/* Protocol Integrity Hero */}
                        <div className="relative bg-gradient-to-br from-[#A594D3] to-[#C3B1E1] rounded-[48px] p-10 overflow-hidden shadow-lg group">
                            <div className="absolute top-0 right-0 opacity-10 -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                                <ShieldCheck size={320} />
                            </div>

                            <div className="relative z-10 space-y-8">
                                <div className="max-w-xl">
                                    <h2 className="text-3xl font-black text-white mb-4 tracking-tight">Trust but verify.</h2>
                                    <p className="text-white/80 text-lg font-bold leading-relaxed">
                                        We anchor a cryptographic hash of every finalized run to the blockchain, ensuring all rankings and rewards are
                                        <span className="text-white bg-white/10 px-2 py-0.5 rounded-lg mx-1">transparent and tamper-proof.</span>
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <StatusPill icon={Globe} label="Protocol" value="Solana_Dev" />
                                    <StatusPill icon={Database} label="Sync" value="NOMINAL" />
                                    <StatusPill icon={Cpu} label="Nodes" value="Distrubuted" />
                                </div>
                            </div>
                        </div>

                        {/* Global Epochs History */}
                        <section className="bg-white rounded-[40px] border border-black/5 p-8 shadow-sm">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-3">
                                    <Search size={18} className="text-[#A594D3]" /> Global Epoch History
                                </h3>
                                <Badge variant="lavender" size="sm">LIVE FEED</Badge>
                            </div>

                            <div className="space-y-4">
                                {isLoading ? (
                                    <div className="h-60 flex flex-col items-center justify-center bg-gray-50/50 rounded-[32px] border-2 border-dashed border-gray-100">
                                        <Loader2 className="animate-spin text-[#A594D3] mb-4" size={48} />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">Decrypting On-Chain Data...</span>
                                    </div>
                                ) : proofsData?.proofs?.length > 0 ? (
                                    proofsData.proofs.map((proof: any) => (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            key={proof.date}
                                            className="bg-white border border-black/5 p-6 rounded-[28px] flex items-center justify-between group hover:shadow-md transition-all shadow-sm"
                                        >
                                            <div className="flex items-center gap-6">
                                                <div className="w-14 h-14 bg-[#F8F5FE] rounded-2xl flex items-center justify-center text-[#A594D3] shadow-inner">
                                                    <LinkIcon size={24} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <span className="text-sm font-black text-[#1a1a2e] uppercase">
                                                            Epoch Report [{proof.date}]
                                                        </span>
                                                        <Badge variant="sage" size="sm" className="scale-75 origin-left">VERIFIED</Badge>
                                                    </div>
                                                    <div className="text-[10px] text-gray-400 font-bold truncate max-w-[180px] md:max-w-md uppercase tracking-widest">
                                                        ROOT: {proof.rootHash || 'AWAITING_HASH...'}
                                                    </div>
                                                </div>
                                            </div>
                                            <Link
                                                href={`https://explorer.solana.com/tx/${proof.txHash}?cluster=devnet`}
                                                target="_blank"
                                                className="flex items-center gap-2 px-5 py-3 bg-[#F8F5FE] text-[#A594D3] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#A594D3] hover:text-white transition-all active:scale-95 shadow-sm"
                                            >
                                                Explorer <ExternalLink size={14} />
                                            </Link>
                                        </motion.div>
                                    ))
                                ) : (
                                    <div className="py-20 text-center bg-gray-50/50 rounded-[32px] border-2 border-dashed border-gray-100 flex flex-col items-center">
                                        <FileSearch className="text-gray-200 mb-4" size={48} />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-300 italic max-w-[200px] leading-relaxed">
                                            Station scanning for global proofs in current epoch...
                                        </p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* RIGHT COLUMN: Personal Hash */}
                    <div className="lg:col-span-4 space-y-8">

                        <div className="bg-white rounded-[40px] border border-black/5 p-8 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#B5D5F5] opacity-[0.05] rounded-full -mr-16 -mt-16 blur-2xl" />

                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-8 flex items-center gap-3">
                                <Fingerprint size={18} className="text-[#B5D5F5]" /> Personal Node
                            </h3>

                            {myProof?.proof ? (
                                <div className="space-y-8">
                                    <div className="p-6 bg-[#F1F7FD] rounded-3xl border border-[#B5D5F5]/30 shadow-inner">
                                        <p className="text-[10px] text-[#2980B9] font-black uppercase tracking-widest mb-4">Today's Leaf Hash</p>
                                        <p className="text-xs font-bold font-mono break-all leading-relaxed text-[#1a1a2e] bg-white p-4 rounded-xl shadow-sm">
                                            {myProof.proof.leafHash}
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        <p className="text-[11px] text-gray-400 font-bold leading-relaxed italic uppercase tracking-tighter">
                                            "This unique signature anchors your movement data to the global state. Any alteration will sever the link."
                                        </p>
                                        <button className="w-full py-5 bg-[#B5D5F5] text-[#2980B9] rounded-[24px] font-black text-xs uppercase tracking-widest hover:shadow-lg transition-all active:scale-95 shadow-sm">
                                            Export JSON Proof
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-12 flex flex-col items-center">
                                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-200 mb-6 shadow-inner">
                                        <Lock size={24} />
                                    </div>
                                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic text-center leading-relaxed">
                                        No active session detected <br /> on this node today.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Security Badge Card */}
                        <div className="bg-white rounded-[40px] border border-black/5 p-8 shadow-sm">
                            <div className="w-12 h-12 bg-[#F0F7F4] rounded-2xl flex items-center justify-center text-[#6CC89A] shadow-inner mb-6">
                                <ShieldCheck size={24} />
                            </div>
                            <h4 className="text-sm font-black text-[#1a1a2e] uppercase tracking-widest mb-3">Anti-Cheat Validated</h4>
                            <p className="text-xs font-bold text-gray-400 leading-relaxed uppercase tracking-tight">
                                Blockchain anchoring prevents even root administrators from modifying finalized run logs. Your ranking is absolute.
                            </p>
                            <div className="mt-6 pt-6 border-t border-gray-50 text-[9px] font-black text-gray-200 uppercase tracking-[0.2em]">
                                ID: TR-SEC-CRYPTO-77-VERIFIED
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}

function StatusPill({ icon: Icon, label, value }: any) {
    return (
        <div className="bg-white/10 p-5 rounded-3xl border border-white/5 backdrop-blur-sm">
            <div className="text-white/50 text-[9px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-2">
                <Icon size={12} /> {label}
            </div>
            <div className="text-xs font-black text-white uppercase tracking-wider">{value}</div>
        </div>
    );
}
