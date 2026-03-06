'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  return (
    <nav
      className={`flex items-center gap-1 text-[11px] font-black uppercase tracking-widest mb-4 ${className}`}
      aria-label="Breadcrumb"
    >
      <Link
        href="/"
        className="flex items-center gap-1.5 text-gray-400 hover:text-[#A8D5BA] transition-colors"
      >
        <Home size={14} />
      </Link>

      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          <ChevronRight size={14} className="text-gray-300" />
          {item.href ? (
            <Link
              href={item.href}
              className="flex items-center gap-1.5 text-gray-400 hover:text-[#A8D5BA] transition-colors"
            >
              {item.icon && <span>{item.icon}</span>}
              {item.label}
            </Link>
          ) : (
            <span className="flex items-center gap-1.5 text-gray-700">
              {item.icon && <span>{item.icon}</span>}
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

interface NavTabsProps {
  tabs: Array<{
    label: string;
    value: string;
    icon?: React.ReactNode;
    badge?: number;
  }>;
  activeTab: string;
  onTabChange: (value: string) => void;
  className?: string;
}

export function NavTabs({
  tabs,
  activeTab,
  onTabChange,
  className = '',
}: NavTabsProps) {
  return (
    <div
      className={`flex gap-0.5 border-b border-gray-200 ${className}`}
      role="tablist"
    >
      {tabs.map((tab) => (
        <motion.button
          key={tab.value}
          onClick={() => onTabChange(tab.value)}
          role="tab"
          aria-selected={activeTab === tab.value}
          className={`
            relative px-4 py-3 font-black text-sm uppercase tracking-wide transition-colors
            ${activeTab === tab.value
              ? 'text-[#2E7D52]'
              : 'text-gray-500 hover:text-gray-700'
            }
          `}
        >
          <div className="flex items-center gap-2">
            {tab.icon && <span>{tab.icon}</span>}
            {tab.label}
            {tab.badge && (
              <span className="ml-1 px-2 py-0.5 bg-red-500 text-white text-[10px] rounded-full font-black">
                {tab.badge}
              </span>
            )}
          </div>
          {activeTab === tab.value && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-1 bg-[#A8D5BA]"
            />
          )}
        </motion.button>
      ))}
    </div>
  );
}

interface SegmentedControlProps {
  options: Array<{
    label: string;
    value: string;
    icon?: React.ReactNode;
  }>;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  variant?: 'pill' | 'underline';
}

export function SegmentedControl({
  options,
  value,
  onChange,
  className = '',
  variant = 'pill',
}: SegmentedControlProps) {
  if (variant === 'underline') {
    return <NavTabs tabs={options} activeTab={value} onTabChange={onChange} className={className} />;
  }

  return (
    <div
      className={`inline-flex gap-1 bg-gray-100 p-1.5 rounded-full ${className}`}
      role="group"
    >
      {options.map((option) => (
        <motion.button
          key={option.value}
          onClick={() => onChange(option.value)}
          layout
          className={`
            px-4 py-2 rounded-full font-black text-sm transition-all
            ${value === option.value
              ? 'bg-white text-[#2E7D52] shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
            }
          `}
        >
          <div className="flex items-center gap-1.5">
            {option.icon && <span>{option.icon}</span>}
            {option.label}
          </div>
        </motion.button>
      ))}
    </div>
  );
}

interface StepperProps {
  steps: Array<{
    label: string;
    description?: string;
  }>;
  currentStep: number;
  onStepClick?: (step: number) => void;
  className?: string;
}

export function Stepper({
  steps,
  currentStep,
  onStepClick,
  className = '',
}: StepperProps) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      {steps.map((step, idx) => {
        const isActive = idx === currentStep;
        const isCompleted = idx < currentStep;

        return (
          <React.Fragment key={idx}>
            <motion.button
              onClick={() => onStepClick?.(idx)}
              disabled={!onStepClick}
              className={`
                flex flex-col items-center gap-2 transition-all
                ${!onStepClick ? 'pointer-events-none' : 'cursor-pointer'}
              `}
            >
              <motion.div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-all
                  ${isCompleted
                    ? 'bg-[#A8D5BA] text-white'
                    : isActive
                      ? 'bg-[#A8D5BA] text-white ring-4 ring-[#A8D5BA]/30'
                      : 'bg-gray-200 text-gray-600'
                  }
                `}
              >
                {isCompleted ? '✓' : idx + 1}
              </motion.div>
              <div className="text-center">
                <p className="text-xs font-black uppercase tracking-widest text-gray-700">
                  {step.label}
                </p>
                {step.description && (
                  <p className="text-[10px] text-gray-500 mt-1">{step.description}</p>
                )}
              </div>
            </motion.button>

            {idx < steps.length - 1 && (
              <motion.div
                className={`
                  flex-1 h-1 mx-2 transition-colors
                  ${isCompleted ? 'bg-[#A8D5BA]' : 'bg-gray-200'}
                `}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
