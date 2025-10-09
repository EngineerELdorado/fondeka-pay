'use client';

import React, {useEffect, useMemo, useState} from 'react';
import {API_BASE, http, idem} from '../../../lib/api';

const GROUP_ORDER = ['MOBILE_MONEY', 'CRYPTO', 'CARD', 'BANK_TRANSFER', 'WALLET', 'OTHER'];

export default function PayForm({data = {}, detectedCountry = 'CD'}) {
    const type = data.type || 'QUICK_CHARGE';
    const currency = data.currency || 'USD';
    const isDonation = type === 'DONATION';

    const safePresets = Array.isArray(data.presets) ? data.presets : [];
    const [amount, setAmount] = useState(
        isDonation ? (safePresets?.[1] ?? data.minAmount ?? 0) : (data.amount ?? 0)
    );

    // Country ISO used to fetch methods & format mobile numbers (user-editable)
    const [countryCode, setCountryCode] = useState((detectedCountry || 'CD').toUpperCase());

    // Methods & selection
    const [methods, setMethods] = useState([]);
    const [grouped, setGrouped] = useState({});
    const [methodId, setMethodId] = useState(null);
    const selectedMethod = methods.find(m => m.id === methodId) || null;

    // Crypto networks
    const isCrypto = selectedMethod?.type === 'CRYPTO';
    const isMobile = selectedMethod?.type === 'MOBILE_MONEY';
    const [networks, setNetworks] = useState([]);
    const [networkId, setNetworkId] = useState(null);

    // Mobile number
    const [phone, setPhone] = useState('');
    const payerReference = useMemo(() => {
        if (!isMobile) return undefined;
        const digits = String(phone || '').replace(/\D+/g, '');
        const cc = mapIsoToCallingCode(countryCode);
        if (!cc || !digits) return undefined;
        return `+${cc}${digits}`;
    }, [isMobile, countryCode, phone]);
    const callingCode = useMemo(() => mapIsoToCallingCode(countryCode) || '243', [countryCode]);

    // UX
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState(null);
    const [status, setStatus] = useState('idle');

    // Fetch methods for the country
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(
                    `${API_BASE}/public/payment-requests/payment-methods?type=COLLECTION&countryCode=${encodeURIComponent(countryCode || 'CD')}`,
                    {cache: 'no-store'}
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
                const sorted = {};
                GROUP_ORDER.forEach(t => {
                    if (g[t]?.length) sorted[t] = g[t];
                });
                Object.keys(g).forEach(t => {
                    if (!sorted[t]) sorted[t] = g[t];
                });
                setGrouped(sorted);

                const first = (sorted[GROUP_ORDER[0]]?.[0]) || arr[0] || null;
                setMethodId(first?.id ?? null);
            } catch (e) {
                setErr(e?.message || 'Impossible de charger les méthodes de paiement.');
            }
        })();
    }, [countryCode]);

    // Fetch networks for crypto selection
    useEffect(() => {
        if (!isCrypto || !methodId) {
            setNetworks([]);
            setNetworkId(null);
            return;
        }
        (async () => {
            try {
                const res = await fetch(`${API_BASE}/public/payment-requests/payment-methods/${methodId}/networks`, {cache: 'no-store'});
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const nets = await res.json();
                setNetworks(Array.isArray(nets) ? nets : []);
                setNetworkId((Array.isArray(nets) && nets[0]?.id) ? nets[0].id : null);
            } catch (e) {
                setErr(e?.message || 'Impossible de charger les réseaux crypto.');
            }
        })();
    }, [isCrypto, methodId]);

    // Validation
    const money = (n, curr) =>
        n == null ? '' : new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: curr || 'USD',
            maximumFractionDigits: 2
        }).format(n || 0);

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

    // Submit
    const onPay = async () => {
        const v = validate();
        if (v) {
            setErr(v);
            return;
        }
        setErr(null);
        setBusy(true);
        setStatus('pending');

        try {
            const body = {
                checkoutToken: data.checkoutToken || '',
                paymentMethodId: methodId,
                networkId: isCrypto ? networkId : undefined,
                amount: isDonation ? Number(amount) : data.amount,
                payerReference: isMobile ? payerReference : undefined,
                idempotencyKey: idem(),
            };

            const res = await http(`${API_BASE}/public/checkout/attempts`, {
                method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)
            });

            if (res.nextAction?.type === 'REDIRECT' && res.nextAction?.urlOrHint) {
                window.location.href = res.nextAction.urlOrHint;
                return;
            }
            if (res.status === 'SUCCEEDED') setStatus('succeeded');
            else if (res.status === 'FAILED') {
                setStatus('failed');
                setErr('Échec du paiement.');
            } else setStatus('pending');
        } catch (e) {
            setErr(e?.message || 'Impossible de procéder au paiement.');
            setStatus('failed');
        } finally {
            setBusy(false);
        }
    };

    const renderGroup = (label, list) => {
        if (!list?.length) return null;
        return (
            <div className="card card--plain" style={{background: '#fff'}} key={label}>
                <div className="label" style={{marginBottom: 8}}>{label}</div>
                <div className="grid-2">
                    {list.map((m) => (
                        <button
                            key={m.id}
                            onClick={() => {
                                setMethodId(m.id);
                            }}
                            className={`tile ${methodId === m.id ? 'tile--active' : ''}`}
                            style={{display: 'flex', alignItems: 'center', gap: 8}}
                        >
                            {m.logoUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={m.logoUrl} alt={m.name}
                                     style={{width: 20, height: 20, borderRadius: 4, objectFit: 'cover'}}/>
                            )}
                            <span>{m.name}</span>
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    const presets = useMemo(() => safePresets, [safePresets]);

    return (
        <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
            {/* Amount */}
            {isDonation ? (
                <section className="card">
                    <label className="label">Montant</label>
                    {!!presets.length && (
                        <div style={{display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8}}>
                            {presets.map((p, i) => (
                                <button key={`${p}-${i}`} onClick={() => setAmount(p)}
                                        className={`chip ${amount === p ? 'chip--active' : ''}`}>
                                    {money(p, currency)}
                                </button>
                            ))}
                        </div>
                    )}
                    <div style={{display: 'flex', alignItems: 'center', gap: 8, marginTop: 10}}>
                        <input
                            inputMode="decimal"
                            className="input"
                            value={amount === '' ? '' : amount}
                            onChange={(e) => setAmount(Number(e.target.value || 0))}
                            placeholder={`Ex: ${data.minAmount ?? 0}`}
                        />
                        <span style={{fontSize: 14, color: 'var(--brand-muted)'}}>{currency}</span>
                    </div>
                    {(data.minAmount != null || data.maxAmount != null) && (
                        <p style={{margin: '6px 0 0', fontSize: 12, color: 'var(--brand-muted)'}}>
                            Limites: {data.minAmount ?? '—'} – {data.maxAmount ?? '—'} {currency}
                        </p>
                    )}
                </section>
            ) : (
                <section className="card">
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <span className="label">{type === 'INVOICE' ? 'Total à payer' : 'Montant'}</span>
                        <strong style={{fontSize: 16}}>{money(data.amount, currency)}</strong>
                    </div>
                </section>
            )}

            {/* Grouped payment methods */}
            {GROUP_ORDER.map((t) => renderGroup(labelForType(t), grouped[t]))}

            {/* Mobile money extra field */}
            {isMobile && (
                <section className="card card--plain">
                    <label className="label" style={{marginBottom: 8}}>Téléphone Mobile Money</label>
                    <div style={{display: 'flex', gap: 8}}>
                        <input
                            className="input"
                            style={{maxWidth: 110, color: '#0f172a', background: '#F8FAFC'}}
                            value={`+${callingCode}`}
                            readOnly
                            aria-label="Indicatif pays"
                        />
                        <input
                            className="input"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            inputMode="numeric"
                            placeholder="Numéro (ex: 970000000)"
                        />
                    </div>
                    {/*<p className="p-muted" style={{marginTop: 6, fontSize: 12}}>*/}
                    {/*    Format attendu: +{mapIsoToCallingCode(countryCode) || '243'}{phone || '970000000'}*/}
                    {/*</p>*/}
                </section>
            )}

            {/* Crypto networks */}
            {isCrypto && (
                <section className="card card--plain">
                    <label className="label" style={{marginBottom: 8}}>Réseau</label>
                    <div className="grid-2">
                        {networks.map(net => (
                            <button
                                key={net.id}
                                onClick={() => setNetworkId(net.id)}
                                className={`tile ${networkId === net.id ? 'tile--active' : ''}`}
                            >
                                {net.displayName || net.name}
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {/* Errors */}
            {err && <p className="err">{err}</p>}

            {/* CTA */}
            <button className="btn btn--primary" onClick={onPay} disabled={busy} style={{opacity: busy ? .6 : 1}}>
                {busy ? 'Traitement…' : 'Payer maintenant'}
            </button>

            {/* Status */}
            {status === 'pending' && <p className="note">Confirmation en cours…</p>}
            {status === 'succeeded' && <p className="note" style={{color: '#16a34a'}}>Paiement reçu. Merci !</p>}
            {status === 'failed' &&
                <p className="note" style={{color: '#dc2626'}}>Paiement échoué. Essayez une autre méthode.</p>}
        </div>
    );
}

/* ------- helpers ------- */

function labelForType(t) {
    switch (t) {
        case 'MOBILE_MONEY':
            return 'Mobile Money';
        case 'CRYPTO':
            return 'Crypto';
        case 'CARD':
            return 'Carte';
        case 'BANK_TRANSFER':
            return 'Virement';
        case 'WALLET':
            return 'Portefeuille';
        default:
            return 'Autres';
    }
}

// Minimal ISO→calling code map (extend as needed)
function mapIsoToCallingCode(iso2) {
    const map = {
        CD: '243', CG: '242', CM: '237', RW: '250', BI: '257',
        KE: '254', TZ: '255', UG: '256', ZM: '260', ZW: '263',
        GA: '241', AO: '244',
    };
    return map[(iso2 || '').toUpperCase()];
}
