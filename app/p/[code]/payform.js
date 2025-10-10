// app/p/[code]/payform.js
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { API_BASE, http, idem } from '../../../lib/api';

const GROUP_ORDER = ['MOBILE_MONEY', 'CRYPTO', 'CARD', 'BANK_TRANSFER', 'WALLET', 'OTHER'];

export default function PayForm({ data = {}, detectedCountry = 'CD' }) {
    const type       = data.type || 'QUICK_CHARGE';
    const currency   = data.currency || 'USD';
    const isDonation = type === 'DONATION';

    const safePresets = Array.isArray(data.presets) ? data.presets : [];
    const [amount, setAmount] = useState(
        isDonation ? (safePresets?.[1] ?? data.minAmount ?? 0) : (data.amount ?? 0)
    );

    const [countryCode] = useState((detectedCountry || 'CD').toUpperCase());
    const callingCode = useMemo(() => mapIsoToCallingCode(countryCode) || '243', [countryCode]);
    const [phone, setPhone] = useState('');

    const [methods, setMethods] = useState([]);
    const [grouped, setGrouped] = useState({});
    const [methodId, setMethodId] = useState(null);
    const selectedMethod = methods.find(m => m.id === methodId) || null;

    const isCrypto = selectedMethod?.type === 'CRYPTO';
    const isMobile = selectedMethod?.type === 'MOBILE_MONEY';
    const [networks, setNetworks] = useState([]);
    const [networkId, setNetworkId] = useState(null);

    const payerReference = useMemo(() => {
        if (!isMobile) return undefined;
        const digits = String(phone || '').replace(/\D+/g, '');
        if (!callingCode || !digits) return undefined;
        return `+${callingCode}${digits}`;
    }, [isMobile, callingCode, phone]);

    const [busy, setBusy] = useState(false);
    const [err,  setErr]  = useState(null);
    const [status, setStatus] = useState('idle');

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(
                    `${API_BASE}/public/payment-requests/payment-methods?type=COLLECTION&countryCode=${encodeURIComponent(countryCode)}`,
                    { cache: 'no-store' }
                );
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const list = await res.json();
                const arr = Array.isArray(list) ? list : [];
                setMethods(arr);

                const g = arr.reduce((acc, m) => {
                    const t = m.type || 'OTHER';
                    (acc[t] ||= []).push(m);
                    return acc;
                }, {});
                const ordered = {};
                GROUP_ORDER.forEach(t => { if (g[t]?.length) ordered[t] = g[t]; });
                Object.keys(g).forEach(t => { if (!ordered[t]) ordered[t] = g[t]; });
                setGrouped(ordered);

                const first = (ordered[GROUP_ORDER[0]]?.[0]) || arr[0] || null;
                setMethodId(first?.id ?? null);
            } catch (e) {
                setErr(e?.message || 'Impossible de charger les méthodes de paiement.');
            }
        })();
    }, [countryCode]);

    useEffect(() => {
        if (!isCrypto || !methodId) { setNetworks([]); setNetworkId(null); return; }
        (async () => {
            try {
                const res = await fetch(`${API_BASE}/public/payment-requests/payment-methods/${methodId}/networks`, { cache: 'no-store' });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const nets = await res.json();
                setNetworks(Array.isArray(nets) ? nets : []);
                setNetworkId((Array.isArray(nets) && nets[0]?.id) ? nets[0].id : null);
            } catch (e) { setErr(e?.message || 'Impossible de charger les réseaux crypto.'); }
        })();
    }, [isCrypto, methodId]);

    const selectedGroup = selectedMethod?.type || null;
    const [expanded, setExpanded] = useState(() => {
        const init = {}; GROUP_ORDER.forEach(t => init[t] = (t === selectedGroup)); return init;
    });
    useEffect(() => {
        setExpanded(prev => {
            const next = { ...prev }; GROUP_ORDER.forEach(t => next[t] = (t === selectedGroup)); return next;
        });
    }, [selectedGroup]);

    const money = (n, curr) =>
        n == null ? '' : new Intl.NumberFormat(undefined, { style: 'currency', currency: curr || 'USD', maximumFractionDigits: 2 }).format(n || 0);

    const validate = () => {
        if (isDonation) {
            if (amount === '' || Number(amount) <= 0) return 'Veuillez entrer un montant.';
            if (data.minAmount != null && Number(amount) < data.minAmount) return `Minimum: ${money(data.minAmount, currency)}`;
            if (data.maxAmount != null && Number(amount) > data.maxAmount) return `Maximum: ${money(data.maxAmount, currency)}`;
        }
        if (!methodId) return 'Veuillez choisir une méthode de paiement.';
        if (isMobile) {
            if (!payerReference) return 'Veuillez indiquer votre numéro (avec indicatif).';
            if (!/^\+\d{6,15}$/.test(payerReference)) return 'Numéro invalide. Exemple: +243970000000';
        }
        if (isCrypto && !networkId) return 'Veuillez choisir un réseau (blockchain).';
        return null;
    };

    const onPay = async () => {
        const v = validate(); if (v) { setErr(v); return; }
        setErr(null); setBusy(true); setStatus('pending');
        try {
            const body = {
                checkoutToken: data.checkoutToken || '',
                paymentMethodId: methodId,
                networkId: isCrypto ? networkId : undefined,
                amount: isDonation ? Number(amount) : data.amount,
                payerReference: isMobile ? payerReference : undefined,
                idempotencyKey: idem(),
            };
            const res = await http(`${API_BASE}/public/payment-requests/pay`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
            });
            if (res.nextAction?.type === 'REDIRECT' && res.nextAction?.urlOrHint) { window.location.href = res.nextAction.urlOrHint; return; }
            if (res.status === 'SUCCEEDED') setStatus('succeeded'); else if (res.status === 'FAILED') { setStatus('failed'); setErr('Échec du paiement.'); } else setStatus('pending');
        } catch (e) { setErr(e?.message || 'Impossible de procéder au paiement.'); setStatus('failed'); }
        finally { setBusy(false); }
    };

    /* ---------- UI helpers (fit-to-width) ---------- */

    const Accordion = ({ title, typeKey, children }) => {
        const open = !!expanded[typeKey];
        return (
            <section className="card card--plain" style={{ background: '#fff' }}>
                <button
                    type="button"
                    onClick={() => setExpanded(prev => ({ ...prev, [typeKey]: !prev[typeKey] }))}
                    style={accordionHeaderStyle(open)}
                    aria-expanded={open}
                >
                    <span className="label" style={{ fontSize: 13 }}>{title}</span>
                    <span style={{
                        width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: 8, background: open ? 'var(--brand-primary-soft)' : '#EEF2F7',
                        border: `1px solid ${open ? 'var(--brand-primary)' : 'var(--brand-border)'}`,
                        transition: 'transform .18s ease, background .18s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}>
            <ChevronDown size={18} color={open ? 'var(--brand-primary)' : '#475569'} />
          </span>
                </button>
                {open && <div style={{ paddingTop: 8 }}>{children}</div>}
            </section>
        );
    };

    // Fit-to-width grid: tiles wrap automatically on narrow phones
    const SquareGrid = ({ children }) => (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(88px, 1fr))',
                gap: 8,
                width: '100%',
            }}
        >
            {children}
        </div>
    );

    const SquareTile = ({ active, onClick, logoUrl, name, logoSize = 36 }) => (
        <button
            onClick={onClick}
            className="tile"
            style={{
                borderColor: active ? 'var(--brand-primary)' : 'var(--brand-border)',
                background: active ? 'var(--brand-primary-soft)' : '#fff',
                borderRadius: 12,
                width: '100%',
                aspectRatio: '1 / 1',
                padding: 8,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                minWidth: 0,
                overflow: 'hidden',
            }}
        >
            {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={name} style={{ width: logoSize, height: logoSize, objectFit: 'contain', borderRadius: 8 }} />
            ) : null}
            <span style={{
                fontSize: 11, lineHeight: '14px', textAlign: 'center', color: '#0f172a', fontWeight: 600,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', width: '100%',
            }}>
        {name}
      </span>
        </button>
    );

    const renderGroupTiles = (list, logoSize) => (
        <SquareGrid>
            {list.map((m) => (
                <SquareTile
                    key={m.id}
                    active={methodId === m.id}
                    onClick={() => setMethodId(m.id)}
                    logoUrl={m.logoUrl}
                    name={m.name}
                    logoSize={logoSize}
                />
            ))}
        </SquareGrid>
    );

    const presets = useMemo(() => safePresets, [safePresets]);

    /* ---------- Render ---------- */
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Amount */}
            {isDonation ? (
                <section className="card">
                    <label className="label">Montant</label>
                    {!!presets.length && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                            {presets.map((p, i) => (
                                <button key={`${p}-${i}`} onClick={() => setAmount(p)} className={`chip ${amount===p ? 'chip--active' : ''}`}>
                                    {money(p, currency)}
                                </button>
                            ))}
                        </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, minWidth: 0 }}>
                        <input
                            inputMode="decimal"
                            className="input"
                            value={amount === '' ? '' : amount}
                            onChange={(e) => setAmount(Number(e.target.value || 0))}
                            placeholder={`Ex: ${data.minAmount ?? 0}`}
                            style={{ flex: 1, minWidth: 0 }}
                        />
                        <span style={{ fontSize: 14, color: 'var(--brand-muted)', whiteSpace: 'nowrap' }}>{currency}</span>
                    </div>
                    {(data.minAmount!=null || data.maxAmount!=null) && (
                        <p className="p-muted" style={{ marginTop: 6, fontSize: 12 }}>
                            Limites: {data.minAmount ?? '—'} – {data.maxAmount ?? '—'} {currency}
                        </p>
                    )}
                </section>
            ) : (
                <section className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: 0 }}>
                        <span className="label">{type === 'INVOICE' ? 'Total à payer' : 'Montant'}</span>
                        <strong style={{ fontSize: 16, whiteSpace: 'nowrap' }}>{money(data.amount, currency)}</strong>
                    </div>
                </section>
            )}

            {/* Caption above methods */}
            <div className="label" style={{ marginTop: 2 }}>How do you want to pay?</div>

            {/* Accordions per group */}
            {GROUP_ORDER.map((t) => {
                const list = grouped[t];
                if (!list?.length) return null;
                const logoSize = 36; // compact to fit small phones

                return (
                    <Accordion key={t} title={labelForType(t)} typeKey={t}>
                        {renderGroupTiles(list, logoSize)}

                        {/* Mobile phone input directly under MM */}
                        {t === 'MOBILE_MONEY' && isMobile && (
                            <div style={{ marginTop: 10 }}>
                                <label className="label" style={{ marginBottom: 8 }}>Téléphone Mobile Money</label>
                                <div style={{ display: 'flex', gap: 8, minWidth: 0 }}>
                                    <input className="input" style={{ width: 110, flex: '0 0 auto', color: '#0f172a', background: '#F8FAFC' }} value={`+${callingCode}`} readOnly aria-label="Indicatif pays" />
                                    <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" placeholder="Numéro (ex: 970000000)" style={{ flex: 1, minWidth: 0 }} />
                                </div>
                                <p className="p-muted" style={{ marginTop: 6, fontSize: 12 }}>
                                    Format attendu: +{callingCode}{phone || '970000000'}
                                </p>
                            </div>
                        )}

                        {/* Crypto networks directly under Crypto */}
                        {t === 'CRYPTO' && isCrypto && (
                            <div style={{ marginTop: 10 }}>
                                <label className="label" style={{ marginBottom: 8 }}>Réseau</label>
                                <SquareGrid>
                                    {networks.map(net => (
                                        <SquareTile
                                            key={net.id}
                                            active={networkId === net.id}
                                            onClick={() => setNetworkId(net.id)}
                                            logoUrl={null}
                                            name={net.displayName || net.name}
                                            logoSize={0}
                                        />
                                    ))}
                                </SquareGrid>
                            </div>
                        )}
                    </Accordion>
                );
            })}

            {/* Errors */}
            {err && <p className="err">{err}</p>}

            {/* CTA */}
            <button className="btn btn--primary" onClick={onPay} disabled={busy} style={{ opacity: busy ? .6 : 1 }}>
                {busy ? 'Traitement…' : 'Payer maintenant'}
            </button>

            {/* Status */}
            {status === 'pending'   && <p className="note">Confirmation en cours…</p>}
            {status === 'succeeded' && <p className="note" style={{ color:'#16a34a' }}>Paiement reçu. Merci !</p>}
            {status === 'failed'    && <p className="note" style={{ color:'#dc2626' }}>Paiement échoué. Essayez une autre méthode.</p>}
        </div>
    );
}

/* ------- helpers & icons ------- */

const accordionHeaderStyle = (open) => ({
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    border: '1px solid var(--brand-border)',
    borderRadius: 12,
    background: open ? 'var(--brand-primary-soft)' : 'var(--brand-primary-soft-2)',
    cursor: 'pointer',
    transition: 'background .18s',
    outline: 'none',
});

function labelForType(t) {
    switch (t) {
        case 'MOBILE_MONEY': return 'Mobile Money';
        case 'CRYPTO':       return 'Crypto';
        case 'CARD':         return 'Carte';
        case 'BANK_TRANSFER':return 'Virement';
        case 'WALLET':       return 'Portefeuille';
        default:             return 'Autres';
    }
}

function mapIsoToCallingCode(iso2) {
    const map = { CD:'243', CG:'242', CM:'237', RW:'250', BI:'257', KE:'254', TZ:'255', UG:'256', ZM:'260', ZW:'263', GA:'241', AO:'244' };
    return map[(iso2 || '').toUpperCase()];
}

function ChevronDown({ size = 18, color = '#475569' }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 9l6 6 6-6" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
