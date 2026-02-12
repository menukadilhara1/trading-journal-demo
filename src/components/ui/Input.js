import React, { forwardRef } from 'react';

const Input = forwardRef(({
    label,
    error,
    icon: Icon,
    className = '',
    containerClassName = '',
    ...props
}, ref) => {
    return (
        <div className={`space-y-1.5 ${containerClassName}`}>
            {label && (
                <label className="block text-sm font-semibold text-[#64748B] ml-1">
                    {label}
                </label>
            )}

            <div className="relative">
                {Icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]">
                        <Icon className="w-4 h-4" />
                    </div>
                )}

                <input
                    ref={ref}
                    className={`
            w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-[#171717] placeholder:text-[#94A3B8]
            transition-all duration-200
            focus:border-[#2563EB] focus:outline-none focus:ring-4 focus:ring-blue-500/10
            disabled:cursor-not-allowed disabled:bg-[#F1F5F9] disabled:text-[#94A3B8]
            ${Icon ? 'pl-10' : ''}
            ${error ? 'border-[#EF4444] focus:border-[#EF4444] focus:ring-red-500/10' : 'border-[#E2E8F0]'}
            ${className}
          `}
                    {...props}
                />
            </div>

            {error && (
                <p className="text-xs text-[#EF4444] font-medium ml-1">
                    {error}
                </p>
            )}
        </div>
    );
});

Input.displayName = 'Input';

export default Input;
