import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

export default function Modal({ open, onClose, title, description, children, footer, size = 'md' }) {
    // Close on Escape
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (open) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [open, onClose]);

    // Prevent body scroll when open
    useEffect(() => {
        if (open) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [open]);

    if (!open) return null;

    const sizes = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        full: 'max-w-full m-4',
    };

    return createPortal(
        <div className="fixed inset-0 z-[999] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Backdrop click to close */}
            <div className="absolute inset-0" onClick={onClose} />

            <div
                className={`
                    bg-white w-full ${sizes[size]} rounded-3xl border border-[#E2E8F0] shadow-2xl relative z-10 
                    animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]
                `}
            >
                {/* Header */}
                <div className="p-6 border-b border-[#E2E8F0] flex items-center justify-between shrink-0">
                    <div>
                        {title && <div className="text-lg font-bold text-[#171717]">{title}</div>}
                        {description && <div className="text-sm text-[#64748B]">{description}</div>}
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#171717] transition"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content - Scrollable if needed */}
                <div className="p-6 overflow-y-auto">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="p-6 border-t border-[#E2E8F0] bg-[#F8FAFC] rounded-b-3xl shrink-0 flex gap-3 justify-end">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
