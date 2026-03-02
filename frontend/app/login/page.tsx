'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { LogIn, UserPlus, Mail, Lock, User, MapPin, Loader2, Shield, Hash, Terminal, Sparkles, ChevronRight, Globe, Palette, Upload } from 'lucide-react';
import Badge from '../../components/ui/Badge';

const loginSchema = z.object({
    email: z.string().email('Invalid comms address'),
    password: z.string().min(6, 'Access key too short'),
});

const registerSchema = z.object({
    username: z.string().min(3, 'Callsign too short'),
    email: z.string().email('Invalid comms address'),
    password: z.string().min(6, 'Access key too short'),
    city: z.string().min(2, 'Sector required'),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color hex'),
});

type AuthFormData = z.infer<typeof registerSchema>;

interface RegisterFormData extends AuthFormData { }

export default function LoginPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const setAuth = useAuthStore((state) => state.setAuth);

    const {
        register,
        handleSubmit,
        control,
        formState: { errors },
        setValue,
        reset,
    } = useForm<AuthFormData>({
        resolver: zodResolver(isLogin ? loginSchema : registerSchema) as any,
        defaultValues: {
            username: '',
            email: '',
            password: '',
            city: '',
            color: '#A8D5BA',
        },
    });

    const watchedUsername = useWatch({ control, name: 'username' });
    const watchedColor = useWatch({ control, name: 'color' });
    const [previewHash, setPreviewHash] = useState('TR-XXXX');

    useEffect(() => {
        if (watchedUsername && watchedUsername.length >= 3) {
            const hash = watchedUsername.slice(0, 4).toUpperCase();
            setPreviewHash(`TR-${hash}`);
        } else {
            setPreviewHash('TR-XXXX');
        }
    }, [watchedUsername]);

    const onSubmit = async (data: AuthFormData) => {
        setIsLoading(true);
        if (!data.color) data.color = '#A8D5BA';
        try {
            const endpoint = isLogin ? '/auth/login' : '/auth/register';
            console.log(`[Registration] Sending JSON to ${endpoint}`);
            const response = await api.post(endpoint, { ...data });

            const { user, accessToken } = response.data;
            console.log('[Registration] User data received:', user);
            console.log('[Registration] User has avatarUrl:', !!user.avatarUrl);
            if (user.avatarUrl) {
                console.log('[Registration] Avatar URL:', user.avatarUrl);
            }

            setAuth(user, accessToken);

            toast.success(isLogin ? 'Welcome back, Runner!' : 'Deployment Successful!');
            router.replace('/dashboard');
        } catch (error: any) {
            const errorMessage = error.response?.data?.error || error.message || 'Authentication failed';
            toast.error(errorMessage);
            console.error('[Auth Error]', error.response?.data || error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleMode = () => {
        setIsLogin(!isLogin);
        reset();
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 relative font-['Nunito'] bg-[#F4F7F4] overflow-hidden">
            {/* Background Accents */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#A8D5BA] opacity-[0.05] rounded-full -mr-48 -mt-48 blur-3xl p-10 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#C3B1E1] opacity-[0.05] rounded-full -ml-48 -mb-48 blur-3xl p-10 pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-[480px] z-10"
            >
                <div className="bg-white rounded-[48px] p-10 md:p-14 shadow-xl border border-black/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-[#A8D5BA] opacity-[0.03] w-32 h-32 rounded-full -mr-10 -mt-10 blur-xl" />

                    <div className="text-center mb-12">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-[28px] bg-[#F0F7F4] text-[#A8D5BA] mb-6 shadow-inner border border-[#A8D5BA]/10">
                            {isLogin ? <Shield size={36} /> : <Sparkles size={36} />}
                        </div>
                        <h1 className="text-4xl font-black text-[#1a1a2e] tracking-tight mb-3">
                            {isLogin ? 'Hello again!' : 'Join the Race'}
                        </h1>
                        <p className="text-sm font-bold text-gray-400 max-w-[280px] mx-auto leading-relaxed">
                            {isLogin ? 'Securely access your territory management suite.' : 'Create your unique runner profile and start claiming hexes.'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <AnimatePresence mode="wait">
                            {!isLogin && (
                                <motion.div
                                    key="register-fields"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="space-y-6 overflow-hidden"
                                >
                                    <div className="flex items-center justify-between p-5 bg-[#F8F5FE] rounded-3xl border border-[#C3B1E1]/20 shadow-inner">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-[#A594D3] shadow-sm">
                                                <Hash size={16} />
                                            </div>
                                            <span className="text-[10px] font-black text-[#A594D3] uppercase tracking-widest">Assigned Node ID</span>
                                        </div>
                                        <span className="text-sm font-black text-[#A594D3] tracking-wider">{previewHash}</span>
                                    </div>

                                    <div className="space-y-4">
                                        <InputField
                                            icon={User}
                                            placeholder="Your Callsign"
                                            register={register('username')}
                                            error={errors.username?.message}
                                        />
                                        <InputField
                                            icon={MapPin}
                                            placeholder="Operational Sector (City)"
                                            register={register('city')}
                                            error={errors.city?.message}
                                        />

                                        <div className="p-6 bg-white border border-black/5 rounded-[32px] shadow-sm">
                                            <div className="flex items-center gap-3 mb-5">
                                                <div className="w-8 h-8 rounded-xl bg-[#F0F7F4] flex items-center justify-center text-[#A8D5BA]">
                                                    <Palette size={16} />
                                                </div>
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Aura Spectrum</span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-3">
                                                {['#A8D5BA', '#C3B1E1', '#F4B8C1', '#FFD6A5', '#B5D5F5', '#A594D3', '#6CC89A'].map((color) => (
                                                    <button
                                                        key={color}
                                                        type="button"
                                                        onClick={() => setValue('color', color)}
                                                        className={`w-8 h-8 rounded-full transition-all border-4 ${watchedColor === color ? 'border-white scale-125 shadow-md ring-1 ring-black/5' : 'border-transparent hover:scale-110 opacity-70'}`}
                                                        style={{ backgroundColor: color }}
                                                    />
                                                ))}

                                                {/* Custom Color Picker */}
                                                <div className="relative flex items-center gap-2">
                                                    <div
                                                        className={`w-8 h-8 rounded-full border-4 flex items-center justify-center cursor-pointer transition-all ${!['#A8D5BA', '#C3B1E1', '#F4B8C1', '#FFD6A5', '#B5D5F5', '#A594D3', '#6CC89A'].includes(watchedColor) ? 'border-white scale-125 shadow-md' : 'border-transparent opacity-70'}`}
                                                        style={{ backgroundColor: watchedColor }}
                                                        onClick={() => document.getElementById('customColor')?.click()}
                                                    >
                                                        <Palette size={14} className="text-white mix-blend-difference" />
                                                    </div>
                                                    <input
                                                        id="customColor"
                                                        type="color"
                                                        className="absolute inset-0 opacity-0 w-8 h-8 cursor-pointer"
                                                        value={watchedColor}
                                                        onChange={(e) => setValue('color', e.target.value)}
                                                    />
                                                    <input
                                                        type="text"
                                                        className="w-20 h-8 bg-[#F0F7F4] border-none rounded-lg px-2 text-[10px] font-black uppercase tracking-widest text-[#1a1a2e]"
                                                        value={watchedColor}
                                                        onChange={(e) => setValue('color', e.target.value)}
                                                    />
                                                </div>
                                                <input type="hidden" {...register('color')} />
                                            </div>
                                        </div>

                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="space-y-4">
                            <InputField
                                icon={Mail}
                                type="email"
                                placeholder="Comms Address (Email)"
                                register={register('email')}
                                error={errors.email?.message}
                            />
                            <InputField
                                icon={Lock}
                                type="password"
                                placeholder="Access Key (Password)"
                                register={register('password')}
                                error={errors.password?.message}
                            />
                        </div>

                        <button
                            disabled={isLoading}
                            className="w-full h-16 bg-gradient-to-r from-[#A8D5BA] to-[#6CC89A] hover:shadow-lg disabled:opacity-50 text-white font-black uppercase text-xs tracking-[0.2em] rounded-[24px] transition-all flex items-center justify-center gap-3 active:scale-95 shadow-md group"
                        >
                            {isLoading ? <Loader2 className="animate-spin" size={20} /> : (
                                <>
                                    {isLogin ? 'Authorize Access' : 'Initialize Profile'}
                                    <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-10 text-center">
                        <button
                            onClick={toggleMode}
                            className="text-[10px] font-black text-gray-400 hover:text-[#A8D5BA] transition-colors uppercase tracking-[0.2em] py-2 px-4 rounded-xl border border-transparent hover:border-[#A8D5BA]/20"
                        >
                            {isLogin ? 'Need an entry permit? Sign Up' : 'Already registered? Log In'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

function InputField({ icon: Icon, placeholder, register, type = 'text', error }: any) {
    return (
        <div className="relative group">
            <div className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors ${error ? 'text-[#F4B8C1]' : 'text-gray-300 group-focus-within:text-[#A8D5BA]'}`}>
                <Icon size={18} />
            </div>
            <input
                {...register}
                type={type}
                placeholder={placeholder}
                className={`w-full h-16 bg-white border ${error ? 'border-[#F4B8C1]' : 'border-black/5'} rounded-[24px] pl-14 pr-6 text-sm font-bold placeholder:text-gray-300 placeholder:font-black placeholder:uppercase placeholder:tracking-widest focus:outline-none focus:border-[#A8D5BA] focus:shadow-sm transition-all text-[#1a1a2e]`}
            />
            {error && (
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-[#F4B8C1] uppercase tracking-widest">
                    {error}
                </div>
            )}
        </div>
    );
}
