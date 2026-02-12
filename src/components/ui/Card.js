import React from 'react';

export function Card({ children, className = '', ...props }) {
    return (
        <div
            className={`bg-white rounded-2xl border border-[#E2E8F0] shadow-sm ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}

export function CardHeader({ children, className = '', ...props }) {
    return (
        <div
            className={`p-6 border-b border-[#E2E8F0] ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}

export function CardTitle({ children, className = '', ...props }) {
    return (
        <h3
            className={`text-lg font-bold text-[#171717] ${className}`}
            {...props}
        >
            {children}
        </h3>
    );
}

export function CardDescription({ children, className = '', ...props }) {
    return (
        <p
            className={`text-sm text-[#64748B] mt-1 ${className}`}
            {...props}
        >
            {children}
        </p>
    );
}

export function CardContent({ children, className = '', ...props }) {
    return (
        <div
            className={`p-6 ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}

export function CardFooter({ children, className = '', ...props }) {
    return (
        <div
            className={`p-6 border-t border-[#E2E8F0] bg-[#F8FAFC] rounded-b-2xl ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}
