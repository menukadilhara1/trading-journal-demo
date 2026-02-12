import React, { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';

export default function EditAccountModal({ open, onClose, onSave, onDelete, account, isLastAccount }) {

    const [name, setName] = useState('');
    const [startingBalance, setStartingBalance] = useState('');
    const [defaultRiskPct, setDefaultRiskPct] = useState('');

    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return;
        setError('');

        setName(account?.name ?? '');
        setStartingBalance(account?.startingBalance == null ? '' : String(account.startingBalance));
        setDefaultRiskPct(account?.defaultRiskPct == null ? '' : String(account.defaultRiskPct));
    }, [open, account]);

    if (!open) return null;

    const submit = () => {
        const n = String(name || '').trim();
        const sbRaw = String(startingBalance || '').trim();
        const rpRaw = String(defaultRiskPct || '').trim();

        if (!n) return setError('Account name is required.');
        if (sbRaw === '') return setError('Starting balance is required.');
        if (rpRaw === '') return setError('Default risk % is required.');

        const sb = Number(sbRaw);
        const rp = Number(rpRaw);

        if (!Number.isFinite(sb) || sb < 0) return setError('Starting balance must be a valid number (0 or more).');
        if (!Number.isFinite(rp) || rp <= 0) return setError('Default risk % must be a valid number (> 0).');

        onSave({ name: n, startingBalance: sb, defaultRiskPct: rp });
    };

    return (
        <div className="fixed inset-0 z-[2000] bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-3xl border border-[#E2E8F0] shadow-xl">
                <div className="p-6 border-b border-[#E2E8F0] flex items-center justify-between">
                    <div>
                        <div className="text-lg font-bold text-[#171717]">Edit account</div>
                        <div className="text-xs text-[#64748B]">Update balance and default risk</div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-[#F8FAFC]"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="text-sm text-[#64748B] mb-2 block font-semibold">Account name</label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Main"
                            className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] focus:border-[#2563EB] focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="text-sm text-[#64748B] mb-2 block font-semibold">Starting balance ($)</label>
                        <input
                            type="number"
                            value={startingBalance}
                            onChange={(e) => setStartingBalance(e.target.value)}
                            placeholder="e.g. 4000"
                            className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] focus:border-[#2563EB] focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="text-sm text-[#64748B] mb-2 block font-semibold">Default risk %</label>
                        <input
                            type="number"
                            value={defaultRiskPct}
                            onChange={(e) => setDefaultRiskPct(e.target.value)}
                            placeholder="e.g. 1"
                            step="0.1"
                            className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] focus:border-[#2563EB] focus:outline-none"
                        />
                    </div>

                    {error && (
                        <div className="text-sm text-[#EF4444] bg-[#FEF2F2] border border-red-200 rounded-xl px-4 py-3">
                            {error}
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-[#E2E8F0] flex gap-2 flex-col">
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl bg-[#F8FAFC] text-[#64748B] font-semibold hover:bg-gray-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={submit}
                            className="flex-1 py-3 rounded-xl bg-[#2563EB] text-white font-semibold hover:bg-[#2563EB]"
                        >
                            Save Changes
                        </button>
                    </div>

                    {!isLastAccount && (
                        <button
                            type="button"
                            onClick={() => {
                                if (window.confirm("Are you sure? All trades in this account will be deleted.")) {
                                    onDelete();
                                }
                            }}
                            className="w-full mt-2 py-3 rounded-xl border border-red-100 text-[#EF4444] font-semibold hover:bg-[#FEF2F2] flex items-center justify-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete Account
                        </button>
                    )}
                    {isLastAccount && (
                        <div className="mt-2 text-center text-xs text-gray-400">
                            Cannot delete the last account
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
