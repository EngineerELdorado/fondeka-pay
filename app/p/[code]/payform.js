'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { API_BASE, http, idem } from '../../../lib/api';

export default function PayForm({ data }) {
    const isVariable = data.type === 'DONATION';

    const [amount, setAmount] = useState(
        isVariable ? (data.presets?.[1] ?? data.minAmount ?? 0) : (data.amount ?? 0)
    );
    const [methods, setMethods] = useState(() => data.allowedMethods ?? []);
    const [methodId, setMethodId] = useState(methods[0]?.id ?? null);
    const [payerRef, setPayerRef] = useState('');
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState(null);
    const [status, setStatus] = useState('idle');

    // Fetch methods if not provided by resolve
    useEffect(() => {
        if (methods.length) return;
        (async () => {
            try {
                // If you scope by code: /public/payment-methods?code=...
                const res = await fetch(`${API_BASE}/public/payment-methods`, { cache: 'no-store' });
                if (res.ok) {
                    const list = await res.json();
                    setMethods(list);
                    setMethodId(list[0]?.id ?? null);
                }
            } catch {}
        })();
    }, [methods.length]);

    const needsRef = useMemo(() => {
        if (!methodId) return false;
        const m = methods.find(x => x.id === methodId)?.name?.toLowerCase() || '';
        return m.includes('mobile') || m.includes('wallet');
    }, [methodId, methods]);

    const money = (n, curr) =>
        n == null ? '' : new Intl.NumberFormat(undefined, { style: 'currency', currency: curr || 'USD', maximumFractionDigits: 2 }).format(n || 0);

    const validate = () => {
        if (isVariable) {
            if (amount === '' || Number(amount) <= 0) return 'Veuillez entrer un montant.';
            if (data.minAmount != null && Number(amount) < data.minAmount) return `Minimum: ${money(data.minAmount, data.currency)}`;
            if (data.maxAmount != null && Number(amount) > data.maxAmount) return `Maximum: ${money(data.maxAmount, data.currency)}`;
        }
        if (!methodId) return 'Veuillez choisir une méthode de paiement.';
        if (needsRef && !payerRef.trim()) return 'Veuillez indiquer votre numéro / email.';
        return null;
    };

    const onPay = async () => {
        const v = validate();
        if (v) { setErr(v); return; }
        setErr(null); setBusy(true); setStatus('pending');

        try {
            const body = {
                checkoutToken: data.checkoutToken,
                paymentMethodId: methodId,
                amount: isVariable ? Number(amount) : data.amount,
                payerReference: payerRef || undefined,
                idempotencyKey: idem(),
            };

            const res = await http(`${API_BASE}/public/checkout/attempts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.nextAction?.type === 'REDIRECT' && res.nextAction?.urlOrHint) {
                window.location.href = res.nextAction.urlOrHint;
                return;
            }

            if (res.status === 'SUCCEEDED') setStatus('succeeded');
            else if (res.status === 'FAILED') { setStatus('failed'); setErr('Échec du paiement.'); }
            else setStatus('pending');
        } catch (e) {
            setErr(e?.message || 'Impossible de procéder au paiement.');
            setStatus('failed');
        } finally {
            setBusy(false);
        }
    };

    const presets = useMemo(() => (data.presets?.length ? data.presets : []), [data.presets]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Amount */}
            {isVariable ? (
                <section className="card">
                    <label className="label">Montant</label>
                    {!!presets.length && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                            {presets.map((p) => (
                                <button key={p} onClick={() => setAmount(p)} className={`chip ${amount===p ? 'chip--active' : ''}`}>
                                    {money(p, data.currency)}
                                </button>
                            ))}
                        </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                        <input
                            inputMode="decimal"
                            className="input"
                            value={amount === '' ? '' : amount}
                            onChange={(e) => setAmount(Number(e.target.value || 0))}
                            placeholder={`Ex: ${data.minAmount ?? 0}`}
                        />
                        <span style={{ fontSize: 14, color: 'var(--brand-muted)' }}>{data.currency}</span>
                    </div>
                    {(data.minAmount!=null || data.maxAmount!=null) && (
                        <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--brand-muted)' }}>
                            Limites: {data.minAmount ?? '—'} – {data.maxAmount ?? '—'} {data.currency}
                        </p>
                    )}
                </section>
            ) : (
                <section className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="label">Montant</span>
                        <strong style={{ fontSize: 16 }}>{money(data.amount, data.currency)}</strong>
                    </div>
                </section>
            )}

            {/* Methods */}
            <section className="card card--plain">
                <label className="label">Méthode de paiement</label>
                <div className="grid-2" style={{ marginTop: 8 }}>
                    {methods.map((m) => (
                        <button
                            key={m.id ?? m.name}
                            onClick={() => setMethodId(m.id)}
                            className={`tile ${methodId === m.id ? 'tile--active' : ''}`}
                        >
                            {m.name}
                        </button>
                    ))}
                </div>

                {needsRef && (
                    <div style={{ marginTop: 12 }}>
                        <label className="label" style={{ fontSize: 12 }}>Téléphone / Email</label>
                        <input
                            className="input"
                            placeholder="Ex: +243…"
                            value={payerRef}
                            onChange={(e) => setPayerRef(e.target.value)}
                        />
                    </div>
                )}
            </section>

            {err && <p className="err">{err}</p>}

            {/* CTA */}
            <button className="btn btn--primary" onClick={onPay} disabled={busy} style={{ opacity: busy ? .6 : 1 }}>
                {busy ? 'Traitement…' : 'Payer maintenant'}
            </button>

            {/* Status */}
            {status === 'pending' && <p className="note">Confirmation en cours…</p>}
            {status === 'succeeded' && <p className="note" style={{ color: '#16a34a' }}>Paiement reçu. Merci !</p>}
            {status === 'failed' && <p className="note" style={{ color: '#dc2626' }}>Paiement échoué. Essayez une autre méthode.</p>}
        </div>
    );
}
