import React from 'react';
import { Loader2 } from 'lucide-react';

export default function PageLoader({ text = "Loading..." }) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col items-center justify-center p-4">
            <Loader2 className="w-12 h-12 text-[#2563EB] animate-spin mb-4" strokeWidth={2} />
            <div className="text-xl font-medium text-[#64748B] animate-pulse">
                {text}
            </div>
        </div>
    );
}
