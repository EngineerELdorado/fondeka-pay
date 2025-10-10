// app/p/[code]/payform.js
'use client';

import React, {
    memo, forwardRef, useEffect, useMemo, useRef, useState,
} from 'react';
import { API_BASE, http, idem } from '../../../lib/api';

const GROUP_ORDER = ['MOBILE_MONEY', 'CRYPTO', 'CARD', 'BANK_TRANSFER', 'WALLET', 'OTHER'];

export default function PayForm({ data = {}, detectedCountry = 'CD', publicCode, canPay = true, disabledReason = null }) {
    const disabled = !canPay;

    /* ---------- Immutable server props ---------- */
    const type       = data.type || 'QUICK_CHARGE';
    const currency   = data.currency || 'USD';
    const isDonation = type === 'DONATION';

    // keep a live token (refreshed on error)
    const [checkoutToken, setCheckoutToken] = useState(data.checkoutToken || '');

    const defaultDonationAmount = Array.isArray(data.presets) && data.presets.length
        ? String(data.presets[1] ?? data.presets[0])
        : (data.minAmount != null ? String(data.minAmount) : '0');

    /* ---------- Country / calling code ---------- */
    const [countryCode] = useState((detectedCountry || 'CD').toUpperCase());
    const callingCode = useMemo(() => mapIsoToCallingCode(countryCode) || '243', [countryCode]);

    /* ---------- Methods & selection ---------- */
    const [methods, setMethods] = useState([]);
    const [grouped, setGrouped] = useState({});
    const [methodId, setMethodId] = useState(null);
    const selectedMethod = methods.find(m => m.id === methodId) || null;
    const isCrypto = selectedMethod?.type === 'CRYPTO';
    const isMobile = selectedMethod?.type === 'MOBILE_MONEY';

    /* ---------- Crypto networks ---------- */
    const [networks, setNetworks] = useState([]);
    const [networkId, setNetworkId] = useState(null);

    /* ---------- Uncontrolled inputs (refs) ---------- */
    const amountRef = useRef(null);
    const phoneRef  = useRef(null);
    const nameRef   = useRef(null);
    const emailRef  = useRef(null);

    /* ---------- UX ---------- */
    const [busy, setBusy] = useState(false);
    const [err,  setErr]  = useState(null);
    const [status, setStatus] = useState('idle');

    // Result data after submit
    const [result, setResult] = useState(null);       // { rail:'MM'|'CRYPTO', ... }
    const [showQr, setShowQr] = useState(false);      // crypto modal
    const [showMM, setShowMM] = useState(false);      // mobile money modal
    const [canRefresh, setCanRefresh] = useState(false);

    /* ---------- Fetch methods ---------- */
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

                setMethodId((ordered[GROUP_ORDER[0]]?.[0] || arr[0] || {}).id ?? null);
            } catch (e) {
                setErr(e?.message || 'Impossible de charger les méthodes de paiement.');
            }
        })();
    }, [countryCode]);

    /* ---------- Fetch networks when crypto picked ---------- */
    useEffect(() => {
        if (!isCrypto || !methodId) { setNetworks([]); setNetworkId(null); return; }
        (async () => {
            try {
                const res = await fetch(`${API_BASE}/public/payment-requests/payment-methods/${methodId}/networks`, { cache: 'no-store' });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const nets = await res.json();
                const arr = Array.isArray(nets) ? nets : [];
                setNetworks(arr);
                setNetworkId(arr[0]?.id ?? null);
            } catch (e) { setErr(e?.message || 'Impossible de charger les réseaux crypto.'); }
        })();
    }, [isCrypto, methodId]);

    /* ---------- Accordions (fixed default; no resync) ---------- */
    const [expanded, setExpanded] = useState(() => {
        const init = {}; GROUP_ORDER.forEach(t => init[t] = (t === 'MOBILE_MONEY')); return init;
    });

    /* ---------- Helpers ---------- */
    const money = (n, curr) =>
        n == null ? '' : new Intl.NumberFormat(undefined, { style: 'currency', currency: curr || 'USD', maximumFractionDigits: 2 }).format(n || 0);

    const getDonationAmountNumber = () => {
        if (!isDonation) return data.amount ?? 0;
        const raw = amountRef.current?.value ?? '';
        const n = Number(String(raw).replace(',', '.'));
        return Number.isFinite(n) ? n : 0;
    };

    const getAccountNumber = () => {
        if (!isMobile) return undefined;
        const raw = phoneRef.current?.value ?? '';
        const digits = String(raw).replace(/\D+/g, '');
        if (!callingCode || !digits) return undefined;
        return `+${callingCode}${digits}`;
    };

    const getPayerEmail = () => (emailRef.current?.value || '').trim() || undefined;
    const getPayerName  = () => (nameRef.current?.value  || '').trim() || undefined;

    const validate = () => {
        if (!methodId) return 'Veuillez choisir une méthode de paiement.';

        if (isDonation) {
            const n = getDonationAmountNumber();
            const hasMin = data.minAmount != null && Number(data.minAmount) > 0;
            const hasMax = data.maxAmount != null && Number(data.maxAmount) > 0;  // enforce only if > 0
            if (n <= 0) return 'Veuillez entrer un montant.';
            if (hasMin && n < Number(data.minAmount)) return `Minimum: ${money(data.minAmount, currency)}`;
            if (hasMax && n > Number(data.maxAmount)) return `Maximum: ${money(data.maxAmount, currency)}`;
        }

        if (isMobile) {
            const acc = getAccountNumber();
            if (!acc) return 'Veuillez indiquer le numéro Mobile Money.';
            if (!/^\+\d{6,15}$/.test(acc)) return 'Numéro invalide. Exemple: +243970000000';
        }

        if (isCrypto && !networkId) return 'Veuillez choisir un réseau (blockchain).';
        return null;
    };

    const isActionableStatus = (s) =>
        ['PENDING', 'REQUIRES_ACTION', 'INITIATED', 'NEW'].includes(String(s || '').toUpperCase());

    const shouldRefreshOnError = (message = '') => {
        const m = String(message || '').toLowerCase();
        return (
            m.includes('expired') ||
            m.includes('token') ||
            m.includes('idempotency') ||
            m.includes('idempotent') ||
            m.includes('already exists') ||
            m.includes('401') || m.includes('403')
        );
    };

    const prettyError = (m = '') => {
        const s = String(m || '').toLowerCase();
        if (s.includes('expired') || s.includes('token')) return 'Session expirée — rafraîchissons la page de paiement.';
        if (s.includes('idempot')) return 'Conflit de requête — nouvelle tentative…';
        return m || 'Une erreur est survenue.';
    };

    /* ---------- Token refresh helper ---------- */
    const refreshCheckoutToken = async () => {
        if (!publicCode) throw new Error('Code public manquant');
        const res = await fetch(`${API_BASE}/public/payment-requests/${encodeURIComponent(publicCode)}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const link = await res.json();
        if (!link.checkoutToken) throw new Error('Token indisponible');
        setCheckoutToken(link.checkoutToken);
        return link.checkoutToken;
    };

    /* ---------- Submit with auto refresh & retry ---------- */
    const onPay = async () => {
        if (disabled) return;
        const v = validate();
        if (v) { setErr(v); setCanRefresh(true); return; }

        // Reset dialogs/results before a new submit
        setShowMM(false); setShowQr(false); setResult(null);
        setCanRefresh(false); setErr(null); setBusy(true); setStatus('pending');

        const attemptOnce = async (token, idemKey) => {
            const amountToSend = isDonation ? getDonationAmountNumber() : data.amount;
            const body = {
                checkoutToken: token || '',
                paymentMethodId: methodId,
                accountNumber: isMobile ? getAccountNumber() : undefined,
                networkId: isCrypto ? networkId : null,
                amount: amountToSend,
                payerReference: getPayerEmail(),
                payerDisplayName: getPayerName(),
                payerAnonymous: false,
                idempotencyKey: idemKey,
            };
            return http(`${API_BASE}/public/payment-requests/pay`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
            });
        };

        const idem1 = idem();
        try {
            const res = await attemptOnce(checkoutToken, idem1);
            handleSuccess(res);
        } catch (e) {
            if (shouldRefreshOnError(e?.message)) {
                try {
                    const fresh = await refreshCheckoutToken();
                    const res2 = await attemptOnce(fresh, idem());
                    handleSuccess(res2);
                } catch (e2) {
                    setErr(prettyError(e2?.message));
                    setCanRefresh(true);
                    setStatus('failed');
                }
            } else {
                setErr(prettyError(e?.message));
                setCanRefresh(true);
                setStatus('failed');
            }
        } finally {
            setBusy(false);
        }
    };

    const handleSuccess = (res) => {
        const canOpen = res?.nextAction && isActionableStatus(res?.status);

        if (isMobile) {
            setResult({
                rail: 'MM',
                number: getAccountNumber(),
                hint: res?.nextAction?.urlOrHint || '',
            });
            if (canOpen) setShowMM(true);
        } else if (isCrypto) {
            const address  = res?.nextAction?.urlOrHint || '';
            const typeText = res?.nextAction?.type || '';
            const parsed   = parseCryptoHint(typeText);

            setResult({
                rail: 'CRYPTO',
                address,
                amount: isDonation ? getDonationAmountNumber() : data.amount,
                networkName:
                    parsed.network ||
                    (networks.find(n => n.id === networkId)?.displayName || networks.find(n => n.id === networkId)?.name) ||
                    '—',
                hint: typeText,
            });
            if (canOpen) setShowQr(true);
        }

        if (String(res?.status).toUpperCase() === 'FAILED') {
            setStatus('failed');
            setErr('Échec du paiement.');
            return;
        }
        setStatus('pending'); // provider waiting for confirmation
    };

    const onRefreshAndRetry = async () => {
        // Clear any visible success UI before retrying
        setShowMM(false); setShowQr(false); setResult(null);
        setCanRefresh(false); setErr(null); setBusy(true);

        try {
            const fresh = await refreshCheckoutToken();
            const res = await http(`${API_BASE}/public/payment-requests/pay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    checkoutToken: fresh,
                    paymentMethodId: methodId,
                    accountNumber: isMobile ? getAccountNumber() : undefined,
                    networkId: isCrypto ? networkId : null,
                    amount: isDonation ? getDonationAmountNumber() : data.amount,
                    payerReference: getPayerEmail(),
                    payerDisplayName: getPayerName(),
                    payerAnonymous: false,
                    idempotencyKey: idem(),
                })
            });
            handleSuccess(res);
        } catch (e) {
            setErr(prettyError(e?.message));
            setCanRefresh(true);
        } finally {
            setBusy(false);
        }
    };

    /* ---------- UI helpers (fit & stable) ---------- */

    const Accordion = ({ title, typeKey, children }) => {
        const open = !!expanded[typeKey];
        return (
            <section className="card card--plain" style={{ background: '#fff' }}>
                <button
                    type="button"
                    onClick={() => setExpanded(prev => ({ ...prev, [typeKey]: !prev[typeKey] }))}
                    style={accordionHeaderStyle(open)}
                    aria-expanded={open}
                    disabled={disabled}
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
            disabled={disabled}
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
                opacity: disabled ? 0.6 : 1,
                pointerEvents: disabled ? 'none' : 'auto',
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

    /* ---------- Networks (checkbox pills) ---------- */
    const NetworkPills = ({ items, selectedId, onSelect }) => {
        if (!items?.length) return null;
        const dim = disabled ? { opacity: 0.6, pointerEvents: 'none' } : undefined;
        return (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, ...dim }}>
                {items.map((n) => {
                    const active = n.id === selectedId;
                    return (
                        <button
                            key={n.id}
                            type="button"
                            onClick={() => onSelect(n.id)}
                            disabled={disabled}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 8,
                                border: `1px solid ${active ? 'var(--brand-primary)' : 'var(--brand-border)'}`,
                                background: active ? 'var(--brand-primary-soft)' : '#fff',
                                color: active ? 'var(--brand-primary)' : '#0f172a',
                                padding: '10px 12px',
                                borderRadius: 999,
                                fontWeight: 700,
                                fontSize: 13,
                            }}
                        >
              <span
                  aria-hidden
                  style={{
                      width: 16, height: 16, borderRadius: 4,
                      border: `2px solid ${active ? 'var(--brand-primary)' : '#CBD5E1'}`,
                      background: active ? 'var(--brand-primary)' : '#fff',
                  }}
              />
                            {n.displayName || n.name}
                        </button>
                    );
                })}
            </div>
        );
    };

    /* ---------- Render ---------- */
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, ...(disabled ? { opacity: 0.95 } : null) }}>
            {/* Amount */}
            {isDonation ? (
                <section className="card" style={disabled ? { opacity: 0.6, pointerEvents: 'none' } : undefined}>
                    <label className="label">Montant</label>
                    {!!(Array.isArray(data.presets) && data.presets.length) && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                            {data.presets.map((p, i) => (
                                <button key={`${p}-${i}`} onClick={() => { if (amountRef.current) amountRef.current.value = String(p); }} className="chip">
                                    {money(p, currency)}
                                </button>
                            ))}
                        </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, minWidth: 0 }}>
                        <input
                            ref={amountRef}
                            inputMode="decimal"
                            type="tel"
                            className="input"
                            defaultValue={defaultDonationAmount}
                            placeholder={`Ex: ${data.minAmount ?? 0}`}
                            style={{ flex: 1, minWidth: 0, fontSize: 16 }}
                            disabled={disabled}
                        />
                        <span style={{ fontSize: 14, color: 'var(--brand-muted)', whiteSpace: 'nowrap' }}>{currency}</span>
                    </div>
                </section>
            ) : (
                <section className="card" style={disabled ? { opacity: 0.6, pointerEvents: 'none' } : undefined}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: 0 }}>
                        <span className="label">{type === 'INVOICE' ? 'Total à payer' : 'Montant'}</span>
                        <strong style={{ fontSize: 16, whiteSpace: 'nowrap' }}>{money(data.amount, currency)}</strong>
                    </div>
                </section>
            )}

            {/* Caption above methods */}
            <div className="label" style={{ marginTop: 2 }}>
                How do you want to pay?
                {disabledReason && (
                    <span style={{ display:'block', color:'#64748B', fontSize:12, marginTop:4 }}>
            {disabledReason}
          </span>
                )}
            </div>

            {/* Accordions per group (wrapped to disable all interactions when blocked) */}
            <div style={disabled ? { opacity: 0.6, pointerEvents: 'none' } : undefined}>
                {GROUP_ORDER.map((t) => {
                    const list = grouped[t];
                    if (!list?.length) return null;
                    const logoSize = 36;

                    return (
                        <Accordion key={t} title={labelForType(t)} typeKey={t}>
                            {renderGroupTiles(list, logoSize)}

                            {/* Mobile phone input directly under MM */}
                            {t === 'MOBILE_MONEY' && isMobile && (
                                <MobilePhoneField callingCode={callingCode} ref={phoneRef} />
                            )}

                            {/* Crypto networks directly under Crypto, styled as checkbox pills */}
                            {t === 'CRYPTO' && isCrypto && (
                                <div style={{ marginTop: 10 }}>
                                    <label className="label" style={{ marginBottom: 6 }}>Réseau</label>
                                    <NetworkPills items={networks} selectedId={networkId} onSelect={setNetworkId} />
                                </div>
                            )}
                        </Accordion>
                    );
                })}
            </div>

            {/* Optional contact details */}
            <section className="card card--plain" style={{ background: '#fff', ...(disabled ? { opacity: 0.6, pointerEvents: 'none' } : null) }}>
                <div style={{ display: 'flex', gap: 8, minWidth: 0 }}>
                    <input ref={nameRef}  className="input" placeholder="Nom (optionnel)"   style={{ flex: 1, minWidth: 0 }} disabled={disabled} />
                    <input ref={emailRef} className="input" placeholder="Email (optionnel)" style={{ flex: 1, minWidth: 0 }} disabled={disabled} />
                </div>
            </section>

            {/* Result cards + modals */}
            {result && result.rail === 'MM' && (
                <>
                    <ResultCardMobile number={result.number} hint={result.hint} />
                    <MobileMoneyModal
                        open={showMM}
                        onClose={() => setShowMM(false)}
                        number={result.number}
                        hint={result.hint}
                        onRefresh={onRefreshAndRetry}
                    />
                </>
            )}
            {result && result.rail === 'CRYPTO' && (
                <>
                    <ResultCardCrypto
                        address={result.address}
                        amount={result.amount}
                        networkName={result.networkName}
                        hint={result.hint}
                        onOpenQr={() => setShowQr(true)}
                    />
                    <CryptoQrModal
                        open={showQr}
                        onClose={() => setShowQr(false)}
                        address={result.address}
                        amount={result.amount}
                        networkName={result.networkName}
                        hint={result.hint}   // provider instruction at the top
                    />
                </>
            )}

            {/* Errors */}
            {err && (
                <section className="card card--plain" style={{ borderColor: '#FECACA', background: '#FEF2F2' }}>
                    <h3 className="card-title" style={{ marginBottom: 6 }}>Oups…</h3>
                    <p className="p-muted" style={{ color: '#991B1B' }}>{err}</p>
                    {canRefresh && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                            <button className="tile" onClick={onRefreshAndRetry} style={{ padding: '8px 10px' }}>
                                Rafraîchir & réessayer
                            </button>
                        </div>
                    )}
                </section>
            )}

            {/* CTA */}
            <button
                className="btn btn--primary"
                onClick={onPay}
                disabled={busy || disabled}
                style={{ opacity: (busy || disabled) ? .6 : 1 }}
            >
                {busy ? 'Traitement…' : 'Payer maintenant'}
            </button>

            {/* Status */}
            {status === 'pending'   && <p className="note">Confirmation en cours…</p>}
            {status === 'succeeded' && <p className="note" style={{ color:'#16a34a' }}>Paiement reçu. Merci !</p>}
            {status === 'failed'    && <p className="note" style={{ color:'#dc2626' }}>Paiement échoué. Essayez une autre méthode.</p>}
        </div>
    );
}

/* ------- Result cards & modals ------- */

function ResultCardMobile({ number, hint }) {
    return (
        <section className="card card--plain" style={{ borderColor: 'var(--brand-border)' }}>
            <h3 className="card-title">Confirmez sur votre téléphone</h3>
            <p className="p-muted" style={{ marginTop: 6 }}>
                Une demande de paiement a été envoyée à <strong style={{ color: 'var(--brand-primary)' }}>{number}</strong>.
                Ouvrez l’app Mobile Money et validez.
            </p>
            {hint && <p className="p-muted" style={{ fontSize: 12, marginTop: 6 }}>{hint}</p>}
        </section>
    );
}

function MobileMoneyModal({ open, onClose, number, hint, onRefresh }) {
    if (!open) return null;
    return (
        <div
            role="dialog"
            aria-modal="true"
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(0,0,0,0.75)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 16,
            }}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '100%', maxWidth: 420, borderRadius: 16, background: '#fff',
                    padding: 16, boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 className="card-title" style={{ margin: 0 }}>Confirmez sur votre téléphone</h3>
                    <button onClick={onClose} className="tile" style={{ padding: '6px 10px' }}>Fermer</button>
                </div>

                <div style={{ marginTop: 12 }}>
                    <p className="p-muted">
                        Nous avons envoyé une demande de paiement à&nbsp;
                        <strong style={{ color: 'var(--brand-primary)' }}>{number}</strong>.
                        Ouvrez votre application Mobile Money et validez l’opération.
                    </p>
                    {hint && <p className="p-muted" style={{ fontSize: 12, marginTop: 6 }}>{hint}</p>}

                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <button className="tile" onClick={onRefresh} style={{ padding: '8px 10px' }}>
                            Renvoyer / Rafraîchir
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ResultCardCrypto({ address, amount, networkName, hint, onOpenQr }) {
    return (
        <section className="card card--plain" style={{ borderColor: 'var(--brand-border)' }}>
            <h3 className="card-title">Envoyer la crypto</h3>
            <p className="p-muted" style={{ marginTop: 6 }}>
                Envoyez <strong style={{ color: 'var(--brand-primary)' }}>{amount}</strong> via le réseau <strong style={{ color: 'var(--brand-primary)' }}>{networkName}</strong>.
            </p>
            <div style={{ marginTop: 8 }}>
                <div className="label" style={{ marginBottom: 4 }}>Adresse</div>
                <div
                    style={{
                        border: '1px solid var(--brand-border)', borderRadius: 10, padding: '10px 12px',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}
                    title={address}
                >
                    {address || '—'}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                    <button className="tile" onClick={() => copyToClipboard(address)} style={{ padding: '8px 10px' }}>
                        Copier l’adresse
                    </button>
                    <button className="tile" onClick={onOpenQr} style={{ padding: '8px 10px' }}>
                        Afficher le QR
                    </button>
                </div>
            </div>
            {hint && (
                <div
                    style={{
                        marginTop: 8,
                        border: '1px solid var(--brand-border)',
                        background: 'var(--brand-primary-soft-2)',
                        borderRadius: 10,
                        padding: '8px 10px',
                        color: '#0f172a',
                        fontWeight: 700,
                        fontSize: 13,
                    }}
                >
                    {hint}
                </div>
            )}
        </section>
    );
}

function CryptoQrModal({ open, onClose, address, amount, networkName, hint }) {
    if (!open) return null;
    return (
        <div
            role="dialog"
            aria-modal="true"
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(0,0,0,0.75)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 16,
            }}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '100%', maxWidth: 420, borderRadius: 16, background: '#fff',
                    padding: 16, boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 className="card-title" style={{ margin: 0 }}>Adresse de paiement</h3>
                    <button onClick={onClose} className="tile" style={{ padding: '6px 10px' }}>Fermer</button>
                </div>

                {hint && (
                    <div
                        style={{
                            marginTop: 10,
                            border: '1px solid var(--brand-border)',
                            background: 'var(--brand-primary-soft-2)',
                            borderRadius: 10,
                            padding: '8px 10px',
                            color: '#0f172a',
                            fontWeight: 700,
                            fontSize: 13,
                        }}
                    >
                        {hint}
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', marginTop: 12 }}>
                    <QRCanvas text={address || ''} size={240} />

                    <div style={{ textAlign: 'center', width: '100%' }}>
                        <div className="label" style={{ marginBottom: 6 }}>Réseau</div>
                        <div style={{ fontWeight: 800, marginBottom: 10 }}>{networkName || '—'}</div>

                        <div className="label" style={{ marginBottom: 6 }}>Montant</div>
                        <div style={{ fontWeight: 800, marginBottom: 10 }}>{amount ?? '—'}</div>

                        <div className="label" style={{ marginBottom: 6 }}>Adresse</div>
                        <div
                            style={{
                                border: '1px solid var(--brand-border)', borderRadius: 10, padding: '10px 12px',
                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13,
                                maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis'
                            }}
                            title={address}
                        >
                            {address || '—'}
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'center' }}>
                            <button className="tile" onClick={() => copyToClipboard(address)} style={{ padding: '8px 10px' }}>
                                Copier l’adresse
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

/* ------- memoized subcomponents & helpers ------- */

const MobilePhoneField = memo(forwardRef(function MobilePhoneField({ callingCode }, inputRef) {
    const [localDigits, setLocalDigits] = useState('');
    return (
        <div style={{ marginTop: 10 }}>
            <label className="label" style={{ marginBottom: 8 }}>Téléphone Mobile Money</label>
            <div style={{ display: 'flex', gap: 8, minWidth: 0 }}>
                <input
                    className="input"
                    style={{ width: 110, flex: '0 0 auto', color: '#0f172a', background: '#F8FAFC', fontSize: 16 }}
                    value={`+${callingCode}`}
                    readOnly
                    aria-label="Indicatif pays"
                />
                <input
                    ref={inputRef}
                    className="input"
                    type="tel"
                    inputMode="numeric"
                    defaultValue=""
                    onInput={(e) => setLocalDigits(String(e.currentTarget.value || '').replace(/\D+/g, ''))}
                    placeholder="Numéro (ex: 970000000)"
                    style={{ flex: 1, minWidth: 0, fontSize: 16 }}
                />
            </div>
            <p className="p-muted" style={{ marginTop: 6, fontSize: 12 }}>
                Format attendu: +{callingCode}{localDigits || '970000000'}
            </p>
        </div>
    );
}));

/* --------------------------- Local QR generator --------------------------- */
function QRCanvas({ text = '', size = 240 }) {
    const canvasRef = useRef(null);
    useEffect(() => {
        let mounted = true;
        (async () => {
            if (!canvasRef.current || !text) return;
            const QR = await import('qrcode'); // npm i qrcode
            if (!mounted) return;
            await QR.toCanvas(canvasRef.current, text, {
                errorCorrectionLevel: 'M',
                margin: 2,
                width: size,
                color: { dark: '#000000', light: '#ffffff' },
            });
        })();
        return () => { mounted = false; };
    }, [text, size]);
    return <canvas ref={canvasRef} style={{ width: size, height: size }} />;
}

/* --------------------------- helpers & icons --------------------------- */

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

// Parse helper — e.g. "Send 0.00008200 BTC via network BTC"
function parseCryptoHint(text) {
    try {
        const amtMatch = text.match(/send\s+([\d.]+\s*\w+)/i);
        const netMatch = text.match(/network\s+([\w-]+)/i);
        return { amount: amtMatch?.[1] || null, network: netMatch?.[1] || null };
    } catch { return {}; }
}

async function copyToClipboard(text) {
    try { await navigator.clipboard.writeText(text || ''); } catch {}
}

function ChevronDown({ size = 18, color = '#475569' }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 9l6 6 6-6" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
