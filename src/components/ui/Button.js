import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    disabled,
    className = '',
    icon: Icon,
    ...props
}) {
    const baseStyles = "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500/20";

    const variants = {
        primary: "bg-[#2563EB] text-white hover:bg-[#1D4ED8] shadow-sm hover:shadow-md hover:-translate-y-0.5",
        secondary: "bg-white border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#171717] hover:border-[#CBD5E1] shadow-sm hover:shadow-sm",
        danger: "bg-white border border-[#E2E8F0] text-[#EF4444] hover:bg-[#FEF2F2] hover:border-red-200 shadow-sm",
        ghost: "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#171717]",
        link: "text-[#2563EB] hover:underline p-0 h-auto font-normal",
    };

    const sizes = {
        xs: "px-2 py-1 text-xs",
        sm: "px-3 py-1.5 text-xs",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base",
        xl: "px-8 py-4 text-lg",
        icon: "p-2",
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={isLoading || disabled}
            {...props}
        >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {!isLoading && Icon && <Icon className={`w-4 h-4 ${children ? 'mr-2' : ''}`} strokeWidth={2.5} />}
            {children}
        </button>
    );
}
