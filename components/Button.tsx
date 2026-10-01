import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  loading,
  className = '',
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-indigo-600 text-white shadow-[0_4px_0_rgb(79,70,229)] hover:bg-indigo-500 hover:shadow-[0_4px_0_rgb(99,102,241)] active:shadow-none active:translate-y-[4px]",
    secondary: "bg-emerald-500 text-white shadow-[0_4px_0_rgb(16,185,129)] hover:bg-emerald-400 hover:shadow-[0_4px_0_rgb(52,211,153)] active:shadow-none active:translate-y-[4px]",
    outline: "bg-white text-slate-700 border-2 border-slate-200 shadow-[0_4px_0_rgb(226,232,240)] hover:bg-slate-50 hover:border-slate-300 active:shadow-none active:translate-y-[4px]",
    danger: "bg-rose-500 text-white shadow-[0_4px_0_rgb(225,29,72)] hover:bg-rose-400 active:shadow-none active:translate-y-[4px]",
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
      ) : children}
    </button>
  );
};
