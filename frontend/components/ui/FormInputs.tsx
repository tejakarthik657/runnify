'use client';

import React, { forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: boolean;
  helpText?: string;
  icon?: React.ReactNode;
  variant?: 'standard' | 'filled' | 'outlined';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  success,
  helpText,
  icon,
  variant = 'outlined',
  className = '',
  disabled = false,
  ...props
}, ref) => {
  const variantClasses = {
    standard: 'border-b-2 border-gray-300 focus:border-[#A8D5BA]',
    filled: 'bg-gray-100 focus:bg-gray-50 rounded-lg',
    outlined: 'border-2 border-gray-300 focus:border-[#A8D5BA] rounded-lg',
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-black text-gray-700 mb-2 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          disabled={disabled}
          className={`
            w-full px-4 py-3 font-semibold text-gray-900 transition-all
            ${icon ? 'pl-11' : 'pl-4'}
            ${variantClasses[variant]}
            ${error ? 'border-red-500 focus:border-red-500' : ''}
            ${success && !error ? 'border-green-500 focus:border-green-500' : ''}
            ${disabled ? 'bg-gray-50 cursor-not-allowed opacity-60' : ''}
            focus:outline-none focus:ring-0
            ${className}
          `}
          {...props}
        />
        {success && !error && (
          <CheckCircle className="absolute right-3.5 top-1/2 -translate-y-1/2 text-green-500" size={20} />
        )}
        {error && (
          <AlertCircle className="absolute right-3.5 top-1/2 -translate-y-1/2 text-red-500" size={20} />
        )}
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-2 text-xs text-red-500 font-semibold"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
      {helpText && !error && (
        <p className="mt-2 text-xs text-gray-500">{helpText}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helpText?: string;
  showCharCount?: boolean;
  maxLength?: number;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(({
  label,
  error,
  helpText,
  showCharCount = false,
  maxLength,
  className = '',
  disabled = false,
  ...props
}, ref) => {
  const [charCount, setCharCount] = React.useState(0);

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-black text-gray-700 mb-2 uppercase tracking-wider">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        disabled={disabled}
        maxLength={maxLength}
        onChange={(e) => {
          setCharCount(e.target.value.length);
          props.onChange?.(e);
        }}
        className={`
          w-full px-4 py-3 font-semibold text-gray-900 border-2 border-gray-300
          focus:border-[#A8D5BA] rounded-lg focus:outline-none focus:ring-0
          transition-all resize-vertical min-h-[120px]
          ${error ? 'border-red-500' : ''}
          ${disabled ? 'bg-gray-50 cursor-not-allowed opacity-60' : ''}
          ${className}
        `}
        {...props}
      />
      <div className="flex justify-between items-center mt-2">
        {helpText && !error && (
          <p className="text-xs text-gray-500">{helpText}</p>
        )}
        {error && (
          <p className="text-xs text-red-500 font-semibold">{error}</p>
        )}
        {showCharCount && maxLength && (
          <p className="text-xs text-gray-500 ml-auto">
            {charCount}/{maxLength}
          </p>
        )}
      </div>
    </div>
  );
});

TextArea.displayName = 'TextArea';

interface PasswordInputProps extends Omit<InputProps, 'type'> {}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>((props, ref) => {
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <div className="relative">
      <Input
        ref={ref}
        type={showPassword ? 'text' : 'password'}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label={showPassword ? 'Hide password' : 'Show password'}
      >
        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
});

PasswordInput.displayName = 'PasswordInput';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({
  label,
  description,
  className = '',
  ...props
}, ref) => {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <input
        ref={ref}
        type="checkbox"
        className={`
          w-5 h-5 mt-0.5 border-2 border-gray-300 rounded-md accent-[#A8D5BA]
          cursor-pointer transition-colors hover:border-[#A8D5BA]
          focus:outline-none focus:ring-2 focus:ring-[#A8D5BA]/30
          ${className}
        `}
        {...props}
      />
      {label && (
        <div>
          <span className="text-sm font-black text-gray-900 group-hover:text-gray-700 transition-colors">
            {label}
          </span>
          {description && (
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          )}
        </div>
      )}
    </label>
  );
});

Checkbox.displayName = 'Checkbox';

interface RadioGroupProps {
  options: Array<{
    label: string;
    value: string;
    description?: string;
  }>;
  value: string;
  onChange: (value: string) => void;
  name: string;
}

export function RadioGroup({
  options,
  value,
  onChange,
  name,
}: RadioGroupProps) {
  return (
    <div className="space-y-3">
      {options.map((option) => (
        <label key={option.value} className="flex items-center gap-3 cursor-pointer group">
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={(e) => onChange(e.target.value)}
            className="w-5 h-5 accent-[#A8D5BA] cursor-pointer focus:outline-none"
          />
          <div>
            <span className="text-sm font-black text-gray-900 group-hover:text-gray-700 transition-colors">
              {option.label}
            </span>
            {option.description && (
              <p className="text-xs text-gray-500 mt-1">{option.description}</p>
            )}
          </div>
        </label>
      ))}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helpText?: string;
  options: Array<{
    label: string;
    value: string;
    disabled?: boolean;
  }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  error,
  helpText,
  options,
  className = '',
  disabled = false,
  ...props
}, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-black text-gray-700 mb-2 uppercase tracking-wider">
          {label}
        </label>
      )}
      <select
        ref={ref}
        disabled={disabled}
        className={`
          w-full px-4 py-3 font-semibold text-gray-900 border-2 border-gray-300
          focus:border-[#A8D5BA] rounded-lg focus:outline-none focus:ring-0
          transition-all
          ${error ? 'border-red-500' : ''}
          ${disabled ? 'bg-gray-50 cursor-not-allowed opacity-60' : ''}
          ${className}
        `}
        {...props}
      >
        <option value="">Select an option...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-2 text-xs text-red-500 font-semibold">{error}</p>
      )}
      {helpText && !error && (
        <p className="mt-2 text-xs text-gray-500">{helpText}</p>
      )}
    </div>
  );
});

Select.displayName = 'Select';
