import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';

export default function CreateAccountModal({ open, onClose, onCreate, isLoading }) {
    const [name, setName] = useState('Main');
    const [startingBalance, setStartingBalance] = useState('');
    const [defaultRiskPct, setDefaultRiskPct] = useState('1');

    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return;
        setError('');
        setName('Main');
        setStartingBalance('');
        setDefaultRiskPct('1');
    }, [open]);

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

        onCreate({ name: n, startingBalance: sb, defaultRiskPct: rp });
    };

    const footer = (
        <>
            <Button
                variant="secondary"
                onClick={onClose}
                className="flex-1"
            >
                Cancel
            </Button>
            <Button
                onClick={submit}
                isLoading={isLoading}
                className="flex-1"
            >
                Create
            </Button>
        </>
    );

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Create account"
            description="Required before adding trades"
            footer={footer}
        >
            <div className="space-y-4">
                <Input
                    label="Account name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Main"
                />

                <Input
                    label="Starting balance ($)"
                    type="number"
                    value={startingBalance}
                    onChange={(e) => setStartingBalance(e.target.value)}
                    placeholder="e.g. 4000"
                />

                <Input
                    label="Default risk %"
                    type="number"
                    value={defaultRiskPct}
                    onChange={(e) => setDefaultRiskPct(e.target.value)}
                    placeholder="e.g. 1"
                    step="0.1"
                />

                {error && (
                    <div className="text-sm text-[#EF4444] bg-[#FEF2F2] border border-red-200 rounded-xl px-4 py-3">
                        {error}
                    </div>
                )}
            </div>
        </Modal>
    );
}
