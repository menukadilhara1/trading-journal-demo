import React from 'react';
import { Plus } from 'lucide-react';

export default function EmptyState({
    icon: Icon,
    title,
    description,
    actionLabel,
    onAction,
    className = ''
}) {
    return (
        <div className={`flex flex-col items-center justify-center p-8 text-center bg-white rounded-3xl border border-dashed border-gray-300 ${className}`}>
            {Icon && (
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <Icon className="w-8 h-8 text-gray-400" />
                </div>
            )}
            <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-xs">{description}</p>

            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-sm hover:shadow-md"
                >
                    <Plus className="w-5 h-5" />
                    {actionLabel}
                </button>
            )}
        </div>
    );
}
