'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User,
    Shield,
    Award,
    Smartphone,
    LogOut,
    Trash2,
    ArrowLeft,
    Loader2,
    Calendar,
    MapPin,
    Mail,
    Zap,
    Settings,
    Activity,
    EyeOff,
    MessageSquare,
    ChevronRight,
    ShieldCheck,
    Lock,
    Palette
} from 'lucide-react';
import Link from 'next/link';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'react-hot-toast';
import Badge from '../../components/ui/Badge';

const fetcher = (url: string) => api.get(url).then(res => res.data);

const ALLOWED_COLORS = [
    '#A8D5BA', // Sage
    '#C3B1E1', // Lavender
    '#B5D5F5', // Sky
    '#F4B8C1', // Rose
    '#FFD6A5', // Peach
    '#6CC89A', // Deep Green
    '#A594D3', // Deep Lavender
    '#1a1a2e', // Dark Navy
];

export default function ProfilePage() {
    const { user, logout, setAuth } = useAuthStore();
    const { data: meData, mutate: mutateMe } = useSWR('/auth/me', fetcher);
    const { data: achievementsData } = useSWR('/user/me/achievements', fetcher);
    const { data: sessionsData, mutate: mutateSessions } = useSWR('/user/me/sessions', fetcher);

    const [isUpdating, setIsUpdating] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);

    const currentUser = meData?.user || user;

    // Debug logging
    console.log('[Profile Page] Auth store user:', user);
    console.log('[Profile Page] meData:', meData);
    console.log('[Profile Page] currentUser:', currentUser);
    console.log('[Profile Page] currentUser.avatarUrl:', currentUser?.avatarUrl);
    const privacy = meData?.user?.privacy || {};

    const handleLogout = async () => {
        if (isLoggingOut) return;
        setIsLoggingOut(true);
        try {
            await api.post('/auth/logout');
            logout();
            window.location.href = '/login';
        } catch (err: any) {
            toast.error('Logout failed');
            setIsLoggingOut(false);
        }
    };

    const handleLogoutAll = async () => {
        if (isLoggingOutAll) return;
        try {
            if (confirm('Terminate all remote sessions?')) {
                setIsLoggingOutAll(true);
                await api.post('/user/me/sessions/logout-all');
                logout();
                window.location.href = '/login';
            }
        } catch (err: any) {
            toast.error('Reboot failed');
            setIsLoggingOutAll(false);
        }
    };

    const revokeSession = async (sessionId: string) => {
        setIsUpdating('session_' + sessionId);
        try {
            await api.delete(`/user/me/sessions/${sessionId}`);
            mutateSessions();
            toast.success('Session Terminated');
        } catch (err: any) {
            toast.error('Failed to revoke session');
        } finally {
            setIsUpdating(null);
        }
    };

    const updateColor = async (color: string) => {
        setIsUpdating('color');
        try {
            await api.post('/user/me/color', { color });
            if (user) setAuth({ ...user, color }, useAuthStore.getState().accessToken!);
            mutateMe();
            toast.success('Profile Theme Updated');
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Update failed');
        } finally {
            setIsUpdating(null);
        }
    };

    const togglePrivacy = async (field: string, currentValue: boolean) => {
        setIsUpdating(field);
        try {
            const updates = { [field]: !currentValue };
            await api.post('/user/me/settings', updates);
            mutateMe();
            toast.success(`${field.replace(/([A-Z])/g, ' $1').toUpperCase()} UPDATED`);
        } catch (err: any) {
            toast.error('Update failed');
        } finally {
            setIsUpdating(null);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Basic validation
        if (file.size > 5 * 1024 * 1024) return toast.error('File too large (max 5MB)');
        if (!file.type.startsWith('image/')) return toast.error('Invalid file type');

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const { data } = await api.post('/user/me/profile-image', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Update auth store with new avatar
            if (user) {
                setAuth({ ...user, avatarUrl: data.avatarUrl }, useAuthStore.getState().accessToken!);
            }
            mutateMe();
            toast.success('Profile Image Updated');
        } catch (err: any) {
            toast.error(err.message || 'Upload failed');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="min-h-screen pb-20 font-['Nunito']">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
                    <div className="flex items-center gap-3 sm:gap-4 w-full">
                        <Link href="/dashboard" className="p-2 sm:p-4 bg-white rounded-2xl border border-black/5 shadow-sm hover:shadow-md transition-all active:scale-95 flex-shrink-0">
                            <ArrowLeft size={18} className="sm:w-6 sm:h-6 text-[#1a1a2e]" />
                        </Link>
                        <div className="min-w-0">
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-[#1a1a2e] truncate">Profile Settings</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="sage" className="text-[10px] sm:text-xs">Operator Active</Badge>
                                <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest hidden sm:inline">v4.0</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8">
                    {/* Left Column: Bio & Core Info */}
                    <div className="md:col-span-4 space-y-6 sm:space-y-8">
                        <div className="bg-white rounded-[40px] border border-black/5 p-6 sm:p-8 shadow-sm relative overflow-hidden">
                            {/* User Banner Decor */}
                            <div
                                className="absolute top-0 left-0 right-0 h-32 bg-opacity-10 pointer-events-none"
                                style={{ backgroundColor: currentUser?.color || '#A8D5BA' }}
                            />

                            <div className="relative pt-8 sm:pt-12 flex flex-col items-center">
                                <div className="relative group cursor-pointer" onClick={() => document.getElementById('avatar-upload')?.click()}>
                                    {isUploading && (
                                        <div className="absolute inset-0 z-10 bg-black/40 rounded-[48px] flex items-center justify-center backdrop-blur-sm">
                                            <Loader2 size={32} className="text-white animate-spin" />
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        id="avatar-upload"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                    />
                                    {currentUser?.avatarUrl ? (
                                        <div className="w-32 h-32 rounded-[48px] border-4 border-white shadow-xl overflow-hidden transition-transform group-hover:scale-105">
                                            <img
                                                src={currentUser.avatarUrl}
                                                alt={currentUser.username}
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                <Settings size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            className="w-32 h-32 rounded-[48px] border-4 border-white shadow-xl flex items-center justify-center text-5xl font-black transition-transform group-hover:scale-105"
                                            style={{ backgroundColor: `${currentUser?.color}20`, color: currentUser?.color }}
                                        >
                                            {currentUser?.username?.charAt(0).toUpperCase()}
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                                <Settings size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        </div>
                                    )}
                                    <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-black/5">
                                        <ShieldCheck size={20} className="text-[#A8D5BA]" />
                                    </div>
                                </div>

                                <div className="text-center mt-6 space-y-1">
                                    <h2 className="text-2xl font-black text-[#1a1a2e]">{currentUser?.username}</h2>
                                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Node ID: {currentUser?._id?.slice(-8).toUpperCase()}</p>
                                </div>

                                <div className="w-full mt-10 space-y-4 pt-8 border-t border-gray-50">
                                    <IdentityRow icon={Mail} label="Comms ID" value={currentUser?.email} />
                                    <IdentityRow icon={MapPin} label="Deployment" value={currentUser?.city || 'Wild_Zone'} />
                                    <IdentityRow icon={Calendar} label="Enlisted" value={currentUser?.createdAt ? new Date(currentUser.createdAt).toLocaleDateString() : '--'} />
                                </div>

                                <button
                                    onClick={handleLogout}
                                    disabled={isLoggingOut}
                                    className="w-full mt-10 py-5 bg-[#F4B8C1] hover:bg-[#E89BA5] text-[#c0392b] rounded-3xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3 shadow-sm active:scale-95"
                                >
                                    {isLoggingOut ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />}
                                    {isLoggingOut ? 'Terminating...' : 'Terminate Session'}
                                </button>
                            </div>
                        </div>

                        {/* Theme Customizer */}
                        <div className="bg-white rounded-[32px] border border-black/5 p-8 shadow-sm">
                            <h3 className="text-xs font-black text-[#1a1a2e] uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Zap size={16} className="text-[#A8D5BA]" />
                                Profile Theme
                            </h3>
                            <div className="grid grid-cols-4 gap-3">
                                {ALLOWED_COLORS.map(color => (
                                    <button
                                        key={color}
                                        onClick={() => updateColor(color)}
                                        disabled={isUpdating === 'color'}
                                        className={`
                                            h-10 rounded-xl transition-all p-0.5 border-2
                                            ${currentUser?.color === color ? 'border-[#1a1a2e] scale-110' : 'border-transparent hover:border-gray-100'}
                                            ${isUpdating === 'color' ? 'opacity-50' : ''}
                                        `}
                                    >
                                        <div className="w-full h-full rounded-lg" style={{ backgroundColor: color }} />
                                    </button>
                                ))}

                                {/* Custom Color Picker */}
                                <div className="col-span-4 mt-2 pt-4 border-t border-gray-50 flex items-center gap-4">
                                    <div className="relative">
                                        <div
                                            className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center cursor-pointer transition-all ${!ALLOWED_COLORS.includes(currentUser?.color) ? 'border-[#1a1a2e] scale-105 shadow-md' : 'border-gray-100'}`}
                                            style={{ backgroundColor: currentUser?.color }}
                                            onClick={() => document.getElementById('profileCustomColor')?.click()}
                                        >
                                            <Palette size={18} className="text-white mix-blend-difference" />
                                        </div>
                                        <input
                                            id="profileCustomColor"
                                            type="color"
                                            className="absolute inset-0 opacity-0 w-10 h-10 cursor-pointer"
                                            value={currentUser?.color || '#A8D5BA'}
                                            onChange={(e) => updateColor(e.target.value)}
                                        />
                                    </div>
                                    <input
                                        type="text"
                                        className="flex-1 h-10 bg-gray-50 border-none rounded-xl px-4 text-xs font-black uppercase tracking-widest text-[#1a1a2e] focus:ring-2 ring-[#A8D5BA]/20 outline-none"
                                        value={currentUser?.color || ''}
                                        placeholder="#HEXCODE"
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                                                if (val.length === 7) updateColor(val);
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Achievements & Settings */}
                    <div className="lg:col-span-8 space-y-8">
                        {/* Privacy & Security */}
                        <section className="bg-white rounded-[40px] border border-black/5 p-8 shadow-sm">
                            <h3 className="text-xl font-black text-[#1a1a2e] mb-8 flex items-center gap-3">
                                <Settings className="text-[#A8D5BA]" size={24} />
                                Privacy Protocols
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <SettingsToggle
                                    icon={EyeOff}
                                    label="Stealth Mode"
                                    description="Hide your performance metrics from world rankings."
                                    active={privacy.hideStatsFromPublic}
                                    loading={isUpdating === 'hideStatsFromPublic'}
                                    onToggle={() => togglePrivacy('hideStatsFromPublic', privacy.hideStatsFromPublic)}
                                />
                                <SettingsToggle
                                    icon={MessageSquare}
                                    label="Direct Comms"
                                    description="Allow other runners to initiate direct transmissions."
                                    active={privacy.allowDirectMessages}
                                    loading={isUpdating === 'allowDirectMessages'}
                                    onToggle={() => togglePrivacy('allowDirectMessages', privacy.allowDirectMessages)}
                                />
                            </div>
                        </section>

                        {/* Achievements Dossier */}
                        <section className="bg-white rounded-[40px] border border-black/5 p-8 shadow-sm">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xl font-black text-[#1a1a2e] flex items-center gap-3">
                                    <Award className="text-[#C3B1E1]" size={26} />
                                    Mission Achievements
                                </h3>
                                <Badge variant="lavender">{achievementsData?.earned || 0} / {achievementsData?.total || 0}</Badge>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {achievementsData?.achievements ? (
                                    achievementsData.achievements.map((ach: any) => (
                                        <div
                                            key={ach.key}
                                            className={`
                                                relative p-5 rounded-3xl border transition-all text-center
                                                ${ach.earned ? 'bg-[#F0F7F4] border-[#A8D5BA]/30 shadow-sm' : 'bg-gray-50/50 border-transparent opacity-40 grayscale'}
                                            `}
                                        >
                                            <div className="text-3xl mb-3">{ach.icon}</div>
                                            <h4 className="text-[10px] font-black text-[#1a1a2e] uppercase tracking-tight mb-1">{ach.name}</h4>
                                            <p className="text-[9px] font-bold text-gray-400 leading-tight uppercase line-clamp-2">{ach.description}</p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-full py-12 flex flex-col items-center justify-center">
                                        <Loader2 className="animate-spin text-gray-200 mb-4" size={32} />
                                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic">Syncing Dossier...</span>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Devices & Sessions */}
                        <section className="bg-white rounded-[40px] border border-black/5 overflow-hidden shadow-sm">
                            <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                                <h3 className="text-xl font-black text-[#1a1a2e] flex items-center gap-3">
                                    <Smartphone className="text-[#B5D5F5]" size={24} />
                                    Active Interfaces
                                </h3>
                                <button
                                    onClick={handleLogoutAll}
                                    disabled={isLoggingOutAll}
                                    className="text-[10px] font-black text-[#c0392b] hover:underline uppercase tracking-widest"
                                >
                                    {isLoggingOutAll ? 'Terminating...' : 'Force Global Sign-out'}
                                </button>
                            </div>

                            <div className="divide-y divide-gray-50">
                                {sessionsData?.sessions ? (
                                    sessionsData.sessions.map((session: any) => (
                                        <div key={session._id} className="p-6 flex items-center justify-between hover:bg-gray-50/50 transition-all group">
                                            <div className="flex items-center gap-6">
                                                <div className="w-14 h-14 bg-[#F4F7F4] rounded-2xl flex items-center justify-center text-[#B5D5F5] shadow-inner">
                                                    <Smartphone size={28} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm font-black text-[#1a1a2e] uppercase">
                                                            {session.userAgent?.split(' ')[0] || 'Remote Node'}
                                                        </span>
                                                        <Badge variant="sage" className="scale-75 origin-left">LIVE</Badge>
                                                    </div>
                                                    <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">
                                                        IP: {session.ipAddress} • {new Date(session.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => revokeSession(session._id)}
                                                disabled={!!isUpdating}
                                                className="w-10 h-10 rounded-xl bg-red-50 text-[#c0392b] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-100 shadow-sm"
                                            >
                                                {isUpdating === 'session_' + session._id ? (
                                                    <Loader2 size={18} className="animate-spin" />
                                                ) : (
                                                    <Trash2 size={18} />
                                                )}
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-12 text-center opacity-40 italic">
                                        <p className="text-xs font-black uppercase tracking-widest text-gray-400">Scanning for signal interference...</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}

function IdentityRow({ icon: Icon, label, value }: any) {
    return (
        <div className="flex items-center justify-between py-2 group">
            <div className="flex items-center gap-3">
                <Icon size={16} className="text-gray-300 group-hover:text-[#A8D5BA] transition-colors" />
                <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
            </div>
            <span className="text-xs font-black text-[#1a1a2e] group-hover:text-[#2E7D52] transition-colors truncate max-w-[140px]">{value}</span>
        </div>
    );
}

function SettingsToggle({ icon: Icon, label, description, active, loading, onToggle }: any) {
    return (
        <button
            onClick={onToggle}
            disabled={loading}
            className={`
                p-6 rounded-3xl border text-left transition-all relative overflow-hidden active:scale-95
                ${active ? 'bg-[#F0F7F4] border-[#A8D5BA]/50 ring-4 ring-[#A8D5BA]/5' : 'bg-white border-black/5 hover:bg-gray-50'}
                ${loading ? 'opacity-50 cursor-wait' : ''}
            `}
        >
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${active ? 'bg-[#A8D5BA] text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}>
                        <Icon size={22} />
                    </div>
                    <div>
                        <h4 className={`text-sm font-black uppercase tracking-tight mb-1 ${active ? 'text-[#1a1a2e]' : 'text-gray-400'}`}>{label}</h4>
                        <p className="text-[10px] font-bold text-gray-400 leading-snug max-w-[140px] uppercase">{description}</p>
                    </div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center ${active ? 'bg-[#A8D5BA] border-white shadow-sm' : 'border-gray-100 bg-white'}`}>
                    {active && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
            </div>
        </button>
    );
}
