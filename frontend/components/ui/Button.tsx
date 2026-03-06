'use client';

import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 
  | 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'outline'
  | 'sage' | 'rose' | 'lavender' | 'blue' | 'orange';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  label?: string;
  subLabel?: string;
  fullWidth?: boolean;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
  disabled?: boolean;
  tooltip?: string;
}

const VARIANT_STYLES = {
  primary: {
    base: 'bg-[#A8D5BA] hover:bg-[#6CC89A] text-white font-black shadow-[0_8px_24px_rgba(168,213,186,0.3)] hover:shadow-[0_12px_32px_rgba(168,213,186,0.4)]',
    disabled: 'opacity-50 cursor-not-allowed hover:bg-[#A8D5BA]',
  },
  secondary: {
    base: 'bg-[#C3B1E1] hover:bg-[#A594D3] text-white font-black shadow-[0_8px_24px_rgba(195,177,225,0.2)]',
    disabled: 'opacity-50 cursor-not-allowed hover:bg-[#C3B1E1]',
  },
  danger: {
    base: 'bg-[#E89BA5] hover:bg-[#E74C3C] text-white font-black shadow-[0_8px_24px_rgba(232,155,165,0.3)] hover:shadow-[0_12px_32px_rgba(232,155,165,0.4)]',
    disabled: 'opacity-50 cursor-not-allowed hover:bg-[#E89BA5]',
  },
  success: {
    base: 'bg-[#2E7D52] hover:bg-[#1f5233] text-white font-black shadow-[0_8px_24px_rgba(46,125,82,0.2)]',
    disabled: 'opacity-50 cursor-not-allowed hover:bg-[#2E7D52]',
  },
  sage: {
    base: 'bg-[#A8D5BA]/10 hover:bg-[#A8D5BA]/20 text-[#2E7D52] font-black border border-[#A8D5BA]/30 hover:border-[#A8D5BA]/50',
    disabled: 'opacity-50 cursor-not-allowed hover:bg-[#A8D5BA]/10',
  },
  rose: {
    base: 'bg-[#F4B8C1]/10 hover:bg-[#F4B8C1]/20 text-[#c0392b] font-black border border-[#F4B8C1]/30 hover:border-[#F4B8C1]/50',
    disabled: 'opacity-50 cursor-not-allowed hover:bg-[#F4B8C1]/10',
  },
  lavender: {
    base: 'bg-[#C3B1E1]/10 hover:bg-[#C3B1E1]/20 text-[#A594D3] font-black border border-[#C3B1E1]/30 hover:border-[#C3B1E1]/50',
    disabled: 'opacity-50 cursor-not-allowed hover:bg-[#C3B1E1]/10',
  },
  blue: {
    base: 'bg-[#B5D5F5]/10 hover:bg-[#B5D5F5]/20 text-[#2980B9] font-black border border-[#B5D5F5]/30 hover:border-[#B5D5F5]/50',
    disabled: 'opacity-50 cursor-not-allowed hover:bg-[#B5D5F5]/10',
  },
  orange: {
    base: 'bg-[#FFD6A5]/10 hover:bg-[#FFD6A5]/20 text-[#E67E22] font-black border border-[#FFD6A5]/30 hover:border-[#FFD6A5]/50',
    disabled: 'opacity-50 cursor-not-allowed hover:bg-[#FFD6A5]/10',
  },
  ghost: {
    base: 'bg-transparent hover:bg-black/5 text-gray-700 hover:text-gray-900 font-semibold',
    disabled: 'opacity-50 cursor-not-allowed',
  },
  outline: {
    base: 'border-2 border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900 font-semibold',
    disabled: 'opacity-50 cursor-not-allowed',
  },
};

const SIZE_STYLES = {
  xs: 'px-2.5 py-1 text-[10px]',
  sm: 'px-3.5 py-2 text-[11px]',
  md: 'px-6 py-3 text-sm',
  lg: 'px-8 py-4 text-base',
  xl: 'px-10 py-5 text-lg',
};

const ROUNDED_STYLES = {
  sm: 'rounded-md',
  md: 'rounded-[16px]',
  lg: 'rounded-[24px]',
  full: 'rounded-full',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  label,
  subLabel,
  fullWidth = false,
  rounded = 'lg',
  tooltip,
  className = '',
  children,
  ...props
}, ref) => {
  const isDisabled = disabled || isLoading;
  const variantStyle = VARIANT_STYLES[variant];
  const sizeStyle = SIZE_STYLES[size];
  const roundedStyle = ROUNDED_STYLES[rounded];
  
  const content = (
    <motion.button
      ref={ref}
      whileHover={!isDisabled ? { scale: 1.02 } : {}}
      whileTap={!isDisabled ? { scale: 0.98 } : {}}
      disabled={isDisabled}
      className={`
        relative inline-flex items-center justify-center gap-2.5
        transition-all duration-200 ease-out
        ${fullWidth ? 'w-full' : ''}
        ${sizeStyle}
        ${roundedStyle}
        ${variantStyle.base}
        ${isDisabled ? variantStyle.disabled : ''}
        disabled:pointer-events-none
        focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#A8D5BA]
        ${className}
      `}
      onClick={props.onClick}
      type={props.type as any}
      id={props.id}
      title={props.title}
      aria-label={props['aria-label']}
      aria-disabled={isDisabled}
      style={props.style as any}
      data-testid={props['data-testid']}
    >
      {/* Loading spinner */}
      {isLoading && <Loader2 size={size === 'xs' ? 12 : size === 'sm' ? 14 : 18} className="animate-spin" />}
      
      {/* Icon left */}
      {icon && iconPosition === 'left' && !isLoading && <span className="flex-shrink-0">{icon}</span>}
      
      {/* Content */}
      <span className="flex flex-col items-start">
        {label && <span className="leading-tight">{label}</span>}
        {subLabel && <span className="text-[9px] opacity-75 leading-tight hidden sm:block">{subLabel}</span>}
        {children && typeof children === 'string' && <span>{children}</span>}
      </span>
      
      {/* Icon right */}
      {icon && iconPosition === 'right' && !isLoading && <span className="flex-shrink-0">{icon}</span>}
    </motion.button>
  );

  if (tooltip) {
    return (
      <div className="relative group inline-block">
        {content}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-[10px] font-black rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-[1000]">
          {tooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-1 h-1 bg-gray-900" style={{clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)'}} />
        </div>
      </div>
    );
  }

  return content;
});

Button.displayName = 'Button';
export default Button;
