import React, { useState } from 'react';

export default function CalendarPopover({ value, onChange, onClose }) {
    const [month, setMonth] = useState(() => {
        const base = value.start ? new Date(value.start + "T00:00:00") : new Date();
        return new Date(base.getFullYear(), base.getMonth(), 1);
    });

    const start = value.start ? new Date(value.start + "T00:00:00") : null;
    const end = value.end ? new Date(value.end + "T00:00:00") : null;

    const monthLabel = month.toLocaleDateString("en-US", { month: "long", year: "numeric" });

    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
    const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);

    const startOffset = firstDay.getDay(); // Sun start
    const daysInMonth = lastDay.getDate();

    const cells = [];
    for (let i = 0; i < 42; i++) {
        const dayNum = i - startOffset + 1;
        cells.push(dayNum < 1 || dayNum > daysInMonth
            ? null
            : new Date(month.getFullYear(), month.getMonth(), dayNum)
        );
    }

    const toStr = (d) => {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    };

    const isSameDay = (a, b) =>
        a && b &&
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();

    const isBetween = (d) => {
        if (!start || !end) return false;
        return d >= start && d <= end;
    };

    const pick = (d) => {
        if (!start || (start && end)) {
            onChange({ start: toStr(d), end: "" });
            return;
        }
        if (d < start) onChange({ start: toStr(d), end: toStr(start) });
        else onChange({ start: toStr(start), end: toStr(d) });
    };

    return (
        <div
            className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl shadow-lg p-4 z-50 transition-colors"
            onClick={(e) => e.stopPropagation()}
        >

            <div className="flex items-center justify-between mb-3">
                <button
                    onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                    className="p-2 hover:bg-[#F8FAFC] dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-600 dark:text-slate-400"
                >
                    ‹
                </button>

                <div className="font-semibold text-[#171717] dark:text-slate-100">{monthLabel}</div>

                <button
                    onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                    className="p-2 hover:bg-[#F8FAFC] dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-600 dark:text-slate-400"
                >
                    ›
                </button>
            </div>

            <div className="grid grid-cols-7 text-xs text-[#64748B] dark:text-slate-400 mb-2">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
                    <div key={d} className="text-center py-1">{d}</div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
                {cells.map((d, i) => {
                    if (!d) return <div key={i} />;
                    const isS = isSameDay(d, start);
                    const isE = isSameDay(d, end);
                    const inRange = isBetween(d);

                    let bg = "hover:bg-slate-50 dark:hover:bg-slate-800 text-[#171717] dark:text-slate-200";
                    if (isS || isE) bg = "bg-[#2563EB] text-white";
                    else if (inRange) bg = "bg-[#EFF6FF] dark:bg-blue-900/30 text-[#2563EB] dark:text-blue-400";

                    return (
                        <button
                            key={i}
                            onClick={() => pick(d)}
                            className={`h-9 w-9 rounded-xl text-sm transition-all ${bg}`}
                        >
                            {d.getDate()}
                        </button>
                    );
                })}
            </div>

            <div className="mt-4 pt-3 border-t border-[#E2E8F0] dark:border-slate-800 flex justify-end gap-2 transition-colors">
                <button
                    onClick={() => { onChange({ start: "", end: "" }); onClose(); }}
                    className="text-xs font-semibold text-[#EF4444] px-3 py-1.5 hover:bg-[#FEF2F2] dark:hover:bg-red-950/30 rounded-lg transition-colors"
                >
                    Clear
                </button>
                <button
                    onClick={onClose}
                    className="text-xs font-semibold text-[#2563EB] px-3 py-1.5 hover:bg-[#EFF6FF] dark:hover:bg-blue-950/30 rounded-lg transition-colors"
                >
                    Done
                </button>
            </div>
        </div>
    );
}
