import React from 'react';
import { motion } from 'motion/react';
import { Check } from 'lucide-react';

interface TextInputProps {
  hasError?: boolean;
  mainColor: string;
  className?: string;
  type?: string;
  placeholder?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function TextInput({ hasError, mainColor, className = '', ...props }: TextInputProps) {
  const ringClass = hasError ? 'ring-2 ring-red-500 bg-red-50/50' : 'focus:ring-2 bg-black/5 hover:bg-black/10';
  
  return (
    <input
      className={`w-full min-h-[48px] px-5 py-3.5 rounded-3xl text-base text-slate-800 outline-none transition-all duration-300 border-transparent focus:ring-offset-2 focus:ring-offset-transparent focus:outline-none touch-manipulation ${ringClass} ${className}`}
      style={!hasError ? { '--tw-ring-color': mainColor } as React.CSSProperties : {}}
      {...props}
    />
  );
}

interface SelectionCardProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  mainColor: string;
  hasError?: boolean;
  type: 'radio' | 'checkbox';
  badgeNumber?: number | string;
}

function SelectionCard({ label, selected, onClick, mainColor, hasError, type, badgeNumber }: SelectionCardProps) {
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      className={`relative cursor-pointer overflow-hidden rounded-3xl min-h-[52px] px-5 py-4 transition-all duration-300 border-2 group select-none touch-manipulation transform-gpu will-change-transform ${
        selected 
          ? 'border-transparent shadow-lg shadow-black/5' 
          : hasError 
            ? 'border-red-300 bg-red-50/50' 
            : 'border-white/60 bg-white/50 hover:bg-white/80 backdrop-blur-sm support-[not-(backdrop-filter)]:bg-white/95 shadow-xs'
      }`}
      style={selected ? { borderColor: mainColor, backgroundColor: `${mainColor}12` } : {}}
    >
      <div className="flex items-center justify-between gap-4 min-h-[28px]">
        <div className="flex items-center gap-4">
          <div 
            className={`flex-shrink-0 w-6 h-6 flex items-center justify-center border-2 transition-colors duration-300 ${type === 'radio' ? 'rounded-full' : 'rounded-md'} ${
              selected ? 'border-transparent' : hasError ? 'border-red-400' : 'border-slate-300 group-hover:border-slate-400'
            }`}
            style={selected ? { backgroundColor: mainColor, borderColor: mainColor } : {}}
          >
            {selected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                <Check className="w-4 h-4 text-white" strokeWidth={3} />
              </motion.div>
            )}
          </div>
          <span className={`font-semibold text-base sm:text-lg transition-colors duration-300 ${selected ? 'text-slate-900' : 'text-slate-700'}`}>
            {label}
          </span>
        </div>

        {badgeNumber !== undefined && (
          <span className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold border transition-colors shrink-0 ${
            selected
              ? 'bg-white text-slate-800 border-slate-200 shadow-xs'
              : 'bg-slate-100/80 text-slate-400 border-slate-200/60 group-hover:bg-white group-hover:text-slate-600'
          }`}>
            {badgeNumber}
          </span>
        )}
      </div>
    </motion.div>
  );
}

export const RadioCard = React.forwardRef<HTMLDivElement, Omit<SelectionCardProps, 'type'>>((props, ref) => {
  return <SelectionCard type="radio" {...props} />;
});

export const CheckboxCard = React.forwardRef<HTMLDivElement, Omit<SelectionCardProps, 'type'>>((props, ref) => {
  return <SelectionCard type="checkbox" {...props} />;
});
