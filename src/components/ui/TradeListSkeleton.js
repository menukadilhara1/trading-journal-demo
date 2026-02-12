import React from 'react';
import Skeleton from './Skeleton';

export default function TradeListSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-stretch">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div
                    key={i}
                    className="bg-white rounded-2xl p-6 shadow-sm flex flex-col h-full"
                >
                    {/* Header image placeholder */}
                    <Skeleton className="w-full h-32 rounded-xl mb-4" />

                    {/* Ticker placeholder */}
                    <div className="flex justify-center mb-4">
                        <Skeleton className="h-8 w-24 rounded-lg" />
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-3 gap-4 mt-auto">
                        <div className="flex flex-col items-center gap-2">
                            <Skeleton className="h-3 w-12" />
                            <Skeleton className="h-4 w-16" />
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <Skeleton className="h-3 w-12" />
                            <Skeleton className="h-4 w-16" />
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <Skeleton className="h-3 w-12" />
                            <Skeleton className="h-4 w-16" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
