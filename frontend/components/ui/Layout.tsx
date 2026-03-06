'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'outlined' | 'filled';
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  rounded?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
  role?: string;
}

const PADDING_STYLES = {
  none: '',
  sm: 'p-3',
  md: 'p-6',
  lg: 'p-8',
};

const ROUNDED_STYLES = {
  sm: 'rounded-lg',
  md: 'rounded-[16px]',
  lg: 'rounded-[24px]',
  xl: 'rounded-[32px]',
};

const VARIANT_STYLES = {
  elevated: 'bg-white border border-black/5 shadow-md hover:shadow-lg',
  outlined: 'bg-white border-2 border-gray-200 hover:border-gray-300',
  filled: 'bg-gray-50 border border-gray-200',
};

export function Card({
  children,
  variant = 'elevated',
  hover = false,
  padding = 'md',
  rounded = 'lg',
  className = '',
  onClick,
  role,
}: CardProps) {
  return (
    <motion.div
      whileHover={hover ? { y: -2 } : {}}
      className={`
        ${VARIANT_STYLES[variant]}
        ${PADDING_STYLES[padding]}
        ${ROUNDED_STYLES[rounded]}
        ${hover ? 'cursor-pointer transition-all' : 'transition-shadow'}
        ${className}
      `}
      onClick={onClick}
      role={role}
    >
      {children}
    </motion.div>
  );
}

interface ContainerProps {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
  centered?: boolean;
}

const SIZE_STYLES = {
  sm: 'max-w-sm',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
  full: 'max-w-full',
};

export function Container({
  children,
  size = 'lg',
  className = '',
  centered = true,
}: ContainerProps) {
  return (
    <div
      className={`
        w-full px-4 sm:px-6 lg:px-8
        ${SIZE_STYLES[size]}
        ${centered ? 'mx-auto' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

interface PanelProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  variant?: 'default' | 'primary' | 'secondary';
  className?: string;
}

export function Panel({
  children,
  title,
  description,
  action,
  variant = 'default',
  className = '',
}: PanelProps) {
  const bgColors = {
    default: 'bg-white',
    primary: 'bg-[#F0F7F4]',
    secondary: 'bg-gray-50',
  };

  return (
    <Card variant="outlined" padding="lg" className={`${bgColors[variant]} ${className}`}>
      {(title || description) && (
        <div className="mb-6 flex items-start justify-between">
          <div>
            {title && <h2 className="text-xl font-black text-gray-900 mb-1">{title}</h2>}
            {description && <p className="text-sm text-gray-500">{description}</p>}
          </div>
          {action && <div className="ml-4">{action}</div>}
        </div>
      )}
      {children}
    </Card>
  );
}

interface GridProps {
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4;
  gap?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const COLS_STYLES = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};

const GAP_STYLES = {
  xs: 'gap-2',
  sm: 'gap-4',
  md: 'gap-6',
  lg: 'gap-8',
};

export function Grid({
  children,
  cols = 3,
  gap = 'md',
  className = '',
}: GridProps) {
  return (
    <div className={`grid ${COLS_STYLES[cols]} ${GAP_STYLES[gap]} ${className}`}>
      {children}
    </div>
  );
}

interface DividerProps {
  direction?: 'horizontal' | 'vertical';
  label?: string;
  className?: string;
}

export function Divider({
  direction = 'horizontal',
  label,
  className = '',
}: DividerProps) {
  if (direction === 'vertical') {
    return <div className={`w-px h-full bg-gray-200 ${className}`} />;
  }

  return (
    <div className={`w-full flex items-center gap-4 my-6 ${className}`}>
      <div className="flex-1 h-px bg-gray-200" />
      {label && <span className="text-xs font-black text-gray-500 uppercase tracking-widest">{label}</span>}
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
}

interface StackProps {
  children: React.ReactNode;
  direction?: 'row' | 'column';
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  wrap?: boolean;
  className?: string;
}

const GAP_SIZES = {
  xs: 'gap-2',
  sm: 'gap-3',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
};

const ALIGN_STYLES = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
};

const JUSTIFY_STYLES = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
};

export function Stack({
  children,
  direction = 'column',
  gap = 'md',
  align = 'start',
  justify = 'start',
  wrap = false,
  className = '',
}: StackProps) {
  const flexDir = direction === 'row' ? 'flex-row' : 'flex-col';

  return (
    <div
      className={`
        flex ${flexDir} ${GAP_SIZES[gap]} ${ALIGN_STYLES[align]} ${JUSTIFY_STYLES[justify]}
        ${wrap ? 'flex-wrap' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

interface AspectRatioProps {
  children: React.ReactNode;
  ratio?: number; // e.g., 16 / 9
  className?: string;
}

export function AspectRatio({
  children,
  ratio = 16 / 9,
  className = '',
}: AspectRatioProps) {
  return (
    <div
      className={`relative w-full overflow-hidden bg-gray-200 rounded-lg ${className}`}
      style={{ paddingBottom: `${(1 / ratio) * 100}%` }}
    >
      <div className="absolute inset-0">{children}</div>
    </div>
  );
}
