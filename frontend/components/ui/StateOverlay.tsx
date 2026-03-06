'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, Loader2, X } from 'lucide-react';

interface StateOverlayProps {
  isVisible: boolean;
  type: 'loading' | 'error' | 'success' | 'info';
  title: string;
  message?: string;
  onDismiss?: () => void;
  isDismissible?: boolean;
}

export function StateOverlay({
  isVisible,
  type,
  title,
  message,
  onDismiss,
  isDismissible = true,
}: StateOverlayProps) {
  const icons = {
    loading: <Loader2 className="animate-spin" size={32} />,
    success: <CheckCircle2 size={32} />,
    error: <AlertCircle size={32} />,
    info: <Info size={32} />,
  };

  const colors = {
    loading: 'text-blue-500',
    success: 'text-green-500',
    error: 'text-red-500',
    info: 'text-blue-500',
  };

  const bgColors = {
    loading: 'bg-blue-50',
    success: 'bg-green-50',
    error: 'bg-red-50',
    info: 'bg-blue-50',
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] bg-black/30 backdrop-blur-sm flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className={`${bgColors[type]} rounded-[32px] p-8 max-w-md shadow-2xl border border-black/5`}
          >
            <div className="flex flex-col items-center text-center gap-4">
              <div className={colors[type]}>{icons[type]}</div>
              <h3 className="text-xl font-black text-gray-900">{title}</h3>
              {message && <p className="text-sm text-gray-600">{message}</p>}
              
              {isDismissible && (
                <button
                  onClick={onDismiss}
                  className="mt-4 w-full px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-900 font-black rounded-lg transition-colors"
                >
                  Dismiss
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface LoadingSkeletonProps {
  count?: number;
  height?: string;
  width?: string;
  circle?: boolean;
}

export function LoadingSkeleton({
  count = 3,
  height = 'h-16',
  width = 'w-full',
  circle = false,
}: LoadingSkeletonProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className={`${width} ${height} ${circle ? 'rounded-full' : 'rounded-xl'} bg-gray-200`}
        />
      ))}
    </div>
  );
}

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  variant?: 'primary' | 'success' | 'warning' | 'danger';
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showPercentage = true,
  variant = 'primary',
}: ProgressBarProps) {
  const percentage = (value / max) * 100;
  
  const colors = {
    primary: 'bg-[#A8D5BA]',
    success: 'bg-green-500',
    warning: 'bg-orange-500',
    danger: 'bg-red-500',
  };

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-black text-gray-700">{label}</p>}
      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`h-full ${colors[variant]} rounded-full`}
        />
      </div>
      {showPercentage && (
        <p className="text-xs text-gray-500 text-right">{Math.round(percentage)}%</p>
      )}
    </div>
  );
}

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function Toast({
  message,
  type = 'info',
  icon,
  action,
}: ToastProps) {
  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200',
    warning: 'bg-orange-50 border-orange-200',
  };

  const textColors = {
    success: 'text-green-900',
    error: 'text-red-900',
    info: 'text-blue-900',
    warning: 'text-orange-900',
  };

  const icons = {
    success: <CheckCircle2 size={20} />,
    error: <AlertCircle size={20} />,
    info: <Info size={20} />,
    warning: <AlertCircle size={20} />,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`${bgColors[type]} border rounded-lg p-4 flex items-center gap-3 font-semibold ${textColors[type]}`}
    >
      {icon || icons[type]}
      <span className="flex-1 text-sm">{message}</span>
      {action && (
        <button
          onClick={action.onClick}
          className="text-xs font-black underline hover:opacity-75 transition-opacity"
        >
          {action.label}
        </button>
      )}
    </motion.div>
  );
}

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

export function Spinner({ size = 'md', color = '#A8D5BA' }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  };

  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      className={`${sizeClasses[size]} border-3 border-gray-200 rounded-full`}
      style={{ borderTopColor: color, borderRightColor: color }}
    />
  );
}
