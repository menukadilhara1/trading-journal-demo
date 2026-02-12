import React from 'react';
import Skeleton from './Skeleton';

export default function TradeTableSkeleton() {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left table-fixed">
                    <thead className="bg-[#FAFAFA] border-b border-[#E2E8F0]">
                        <tr>
                            <th className="px-4 py-3 text-xs font-semibold text-[#64748B]">Date</th>
                            <th className="px-4 py-3 text-xs font-semibold text-[#64748B]">Time</th>
                            <th className="px-4 py-3 text-xs font-semibold text-[#64748B]">Ticker</th>
                            <th className="px-4 py-3 text-xs font-semibold text-[#64748B]">Qty</th>
                            <th className="px-4 py-3 text-xs font-semibold text-[#64748B]">Entry</th>
                            <th className="px-4 py-3 text-xs font-semibold text-[#64748B]">Exit</th>
                            <th className="px-4 py-3 text-xs font-semibold text-[#64748B]">Dir</th>
                            <th className="px-4 py-3 text-xs font-semibold text-[#64748B]">Session</th>
                            <th className="px-4 py-3 text-xs font-semibold text-[#64748B]">Mood</th>
                            <th className="px-4 py-3 text-xs font-semibold text-[#64748B] text-right">P&L</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                            <tr key={i} className="border-b border-[#E2E8F0] last:border-none">
                                <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                                <td className="px-4 py-3"><Skeleton className="h-4 w-12" /></td>
                                <td className="px-4 py-3"><Skeleton className="h-4 w-14" /></td>
                                <td className="px-4 py-3"><Skeleton className="h-4 w-8" /></td>
                                <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                                <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                                <td className="px-4 py-3"><Skeleton className="h-5 w-12 rounded-lg" /></td>
                                <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                                <td className="px-4 py-3"><Skeleton className="h-6 w-6 rounded-full" /></td>
                                <td className="px-4 py-3 text-right"><Skeleton className="h-5 w-16 rounded-lg ml-auto" /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
