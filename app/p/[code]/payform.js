'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { API_BASE, http, idem } from '../../../lib/api';
import {
    GROUP_ORDER,
    labelForType,
    mapIsoToCallingCode,
    money,
    parseCryptoHint,
    prettyError,
    shouldRefreshOnError,
} from './utils/payform-helpers';

import Accordion from './components/Accordion';
import MobilePhoneField from './components/MobilePhoneField';
import NetworkPills from './components/NetworkPills';
import SquareGrid, { SquareTile } from './components/SquareGrid';
import CryptoQrModal from './components/CryptoQrModal';
import MobileMoneyModal from './components/MobileMoneyModal';

import usePaymentMethods from './hooks/usePaymentMethods';
import useCryptoNetworks from './hooks/useCryptoNetworks';

export default function PayForm({
                                    data = {},
                                    detectedCountry = 'CD',
                                    publicCode,
                                    canPay = true,
                                    disabledReason = null,
                                }) {
    const disabled = !canPay;

    const type       = data.type || 'QUICK_CHARGE';
    const currency   = data.currency || 'USD';
    const isDonation = type === 'DONATION';

    const [checkoutToken, setCheckoutToken] = useState(data.checkoutToken || '');

    const [countryCode] = useState((detectedCountry || 'CD').toUpperCase());
    const callingCode = useMemo(() => mapIsoToCallingCode(countryCode) || '243', [countryCode]);

    // Hooks now DO NOT auto-select a method; methodId starts as null
    const { methods, grouped, methodId, setMethodId, error: methodsError } = usePaymentMethods(countryCode);
    const selectedMethod = methods.find(m => m.id === methodId) || null;
    const isCrypto = selectedMethod?.type === 'CRYPTO';
    const isMobile = selectedMethod?.type === 'MOBILE_MONEY';

    const { networks, networkId, setNetworkId, error: networksError } = useCryptoNetworks(isCrypto, methodId);

    const amountRef = useRef(null);
    const phoneRef  = useRef(null);
    const nameRef   = useRef(null);
    const emailRef  = useRef(null);

    const [busy, setBusy] = useState(false);
    const [err,  setErr]  = useState(null);
    const [status, setStatus] = useState('idle');

    const [result, setResult] = useState(null);
    const [showQr, setShowQr] = useState(false);
    const [showMM, setShowMM] = useState(false);
    const [canRefresh, setCanRefresh] = useState(false);

    // validity + controlled phone
    const [amountValid, setAmountValid] = useState(() => !isDonation ? Number(data.amount) > 0 : false);
    const [phoneValid, setPhoneValid]   = useState(false);
    const [phoneDigits, setPhoneDigits] = useState(''); // controlled digits (without +country)

    // ACCORDIONS: all collapsed by default; ONLY user clicks toggle them
    const [expanded, setExpanded] = useState(() => {
        const init = {}; GROUP_ORDER.forEach(t => { init[t] = false; }); return init;
    });
    const onToggleAccordion = useCallback((typeKey) => {
        setExpanded(prev => ({ ...prev, [typeKey]: !prev[typeKey] }));
    }, []);

    // NOTE: we no longer auto-open accordions when a method is selected.
    // We also don't pre-select any method.

    /* ---------- utils ---------- */
    const getDonationAmountNumber = () => {
        const raw = amountRef.current?.value ?? '';
        const n = Number(String(raw).replace(',', '.'));
        return Number.isFinite(n) ? n : 0;
    };

    const buildE164 = (rawDigits) => {
        const digits = String(rawDigits || '').replace(/\D+/g, '');
        const cc = callingCode || '243';
        if (!digits) return '';
        return `+${cc}${digits}`;
    };

    const getAccountNumber = () => (isMobile ? buildE164(phoneDigits) : undefined);

    const validate = () => {
        if (!methodId) return 'Veuillez choisir une méthode de paiement.';
        if (isDonation) {
            const n = getDonationAmountNumber();
            const hasMin = data.minAmount != null && Number(data.minAmount) > 0;
            const hasMax = data.maxAmount != null && Number(data.maxAmount) > 0;
            if (n <= 0) return 'Veuillez entrer un montant.';
            if (hasMin && n < Number(data.minAmount)) return `Minimum: ${money(data.minAmount, currency)}`;
            if (hasMax && n > Number(data.maxAmount)) return `Maximum: ${money(data.maxAmount, currency)}`;
        } else {
            if (!(Number(data.amount) > 0)) return 'Montant manquant.';
        }
        if (isMobile && !phoneValid) return 'Numéro Mobile Money invalide.';
        if (isCrypto && !networkId) return 'Veuillez choisir un réseau (blockchain).';
        return null;
    };

    const amountReady = () => (isDonation ? amountValid : Number(data.amount) > 0);

    const showContact = () => {
        if (disabled) return false;
        if (!methodId) return false;
        if (isCrypto && !networkId) return false;
        if (!amountReady()) return false;
        return true;
    };

    /* ---------- token refresh ---------- */
    const refreshCheckoutToken = async () => {
        if (!publicCode) throw new Error('Code public manquant');
        const res = await fetch(`${API_BASE}/public/payment-requests/${encodeURIComponent(publicCode)}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const link = await res.json();
        if (!link.checkoutToken) throw new Error('Token indisponible');
        setCheckoutToken(link.checkoutToken);
        return link.checkoutToken;
    };

    /* ---------- result handling ---------- */
    const handleSuccess = (res) => {
        const isActionableStatus = (s) =>
            ['PENDING', 'REQUIRES_ACTION', 'INITIATED', 'NEW'].includes(String(s || '').toUpperCase());
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
            setStatus('failed'); setErr('Échec du paiement.'); return;
        }
        setStatus('pending');
    };

    /* ---------- submit ---------- */
    const onPay = async () => {
        if (disabled) return;
        const v = validate(); if (v) { setErr(v); setCanRefresh(true); return; }

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
                payerReference: (emailRef.current?.value || '').trim() || undefined,
                payerDisplayName: (nameRef.current?.value || '').trim() || undefined,
                payerAnonymous: false,
                idempotencyKey: idemKey,
            };
            return http(`${API_BASE}/public/payment-requests/pay`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
            });
        };

        try {
            const res = await attemptOnce(checkoutToken, idem());
            handleSuccess(res);
        } catch (e) {
            if (shouldRefreshOnError(e?.message)) {
                try {
                    const fresh = await refreshCheckoutToken();
                    const res2 = await attemptOnce(fresh, idem());
                    handleSuccess(res2);
                } catch (e2) {
                    setErr(prettyError(e2?.message)); setCanRefresh(true); setStatus('failed');
                }
            } else {
                setErr(prettyError(e?.message)); setCanRefresh(true); setStatus('failed');
            }
        } finally { setBusy(false); }
    };

    const onRefreshAndRetry = async () => {
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
                    payerReference: (emailRef.current?.value || '').trim() || undefined,
                    payerDisplayName: (nameRef.current?.value || '').trim() || undefined,
                    payerAnonymous: false,
                    idempotencyKey: idem(),
                })
            });
            handleSuccess(res);
        } catch (e) {
            setErr(prettyError(e?.message)); setCanRefresh(true);
        } finally { setBusy(false); }
    };

    // show API errors (if any)
    useEffect(() => {
        if (methodsError) setErr(methodsError);
        if (networksError) setErr(networksError);
    }, [methodsError, networksError]);

    /* ---------- render helpers ---------- */
    const renderGroupTiles = (typeKey, list, logoSize) => (
        <SquareGrid>
            {list.map((m) => {
                const t = String(m.type || '').toUpperCase();
                return (
                    <SquareTile
                        key={m.id}
                        active={methodId === m.id}
                        onClick={() => {
                            setMethodId(m.id);
                            // DO NOT auto-toggle accordions.
                            // If the user is in Mobile Money and clicks a tile, we can gently focus the phone field.
                            if (typeKey === 'MOBILE_MONEY') setTimeout(() => phoneRef.current?.focus?.(), 0);
                        }}
                        logoUrl={m.logoUrl}
                        name={m.name}
                        logoSize={logoSize}
                        disabled={disabled}
                    />
                );
            })}
        </SquareGrid>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, ...(disabled ? { opacity: 0.95 } : null) }}>
            {/* Amount */}
            {isDonation ? (
                <section className="card" style={disabled ? { opacity: 0.6, pointerEvents: 'none' } : undefined}>
                    <label className="label">How much do you want to send</label>

                    {!!(Array.isArray(data.presets) && data.presets.length) && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                            {data.presets.map((p, i) => (
                                <button
                                    key={`${p}-${i}`}
                                    onClick={() => {
                                        if (amountRef.current) amountRef.current.value = String(p);
                                        setAmountValid(Number(p) > 0);
                                    }}
                                    className="chip"
                                >
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
                            placeholder="0"
                            style={{ flex: 1, minWidth: 0, fontSize: 16 }}
                            onInput={(e) => {
                                const n = Number(String(e.currentTarget.value || '').replace(',', '.'));
                                setAmountValid(Number.isFinite(n) && n > 0);
                            }}
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

            {/* Methods header */}
            <div className="label" style={{ marginTop: 2 }}>
                How do you want to pay?
                {disabledReason && (
                    <span style={{ display: 'block', color: '#64748B', fontSize: 12, marginTop: 4 }}>
            {disabledReason}
          </span>
                )}
            </div>

            {/* Accordions — all collapsed by default; only user click toggles them */}
            <div style={disabled ? { opacity: 0.6, pointerEvents: 'none' } : undefined}>
                {GROUP_ORDER.map((t) => {
                    const list = grouped[t];
                    if (!list?.length) return null;
                    const logoSize = 36;

                    return (
                        <Accordion
                            key={t}
                            title={labelForType(t)}
                            typeKey={t}
                            open={!!expanded[t]}
                            onToggle={onToggleAccordion}
                            disabled={disabled}
                        >
                            {renderGroupTiles(t, list, logoSize)}

                            {/* Mobile phone field stays mounted only inside MOBILE_MONEY section */}
                            {t === 'MOBILE_MONEY' && isMobile && (
                              <div style={{ marginTop: 8 }}>
                                   <MobilePhoneField
                                     callingCode={callingCode}
                                     ref={phoneRef}
                                       value={phoneDigits}
                                     onChangeDigits={(digits) => {
                                       const only = String(digits || '').replace(/\D+/g, '').slice(0, 9);
                                       setPhoneDigits(only);
                                       setPhoneValid(only.length >= 7 && only.length <= 9);
                                     }}
                                    />
                                  </div>
                             )}

                            {/* Crypto networks */}
                            {t === 'CRYPTO' && isCrypto && (
                                <div style={{ marginTop: 10 }}>
                                    <label className="label" style={{ marginBottom: 6 }}>Réseau</label>
                                    <NetworkPills items={networks} selectedId={networkId} onSelect={setNetworkId} disabled={disabled} />
                                </div>
                            )}
                        </Accordion>
                    );
                })}
            </div>

            {/* Contact details */}
            {showContact() && (
                <section className="card card--plain" style={{ background: '#fff' }}>
                    <div style={{ display: 'flex', gap: 8, minWidth: 0 }}>
                        <input ref={nameRef}  className="input" placeholder="Nom (optionnel)"   style={{ flex: 1, minWidth: 0 }} />
                        <input ref={emailRef} className="input" placeholder="Email (optionnel)" style={{ flex: 1, minWidth: 0 }} />
                    </div>
                </section>
            )}

            {/* Modals */}
            {result?.rail === 'MM' && (
                <MobileMoneyModal
                    open={showMM}
                    onClose={() => setShowMM(false)}
                    number={result.number}
                    hint={result.hint}
                    onRefresh={onRefreshAndRetry}
                />
            )}
            {result?.rail === 'CRYPTO' && (
                <CryptoQrModal
                    open={showQr}
                    onClose={() => setShowQr(false)}
                    address={result.address}
                    amount={result.amount}
                    networkName={result.networkName}
                    hint={result.hint}
                />
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
                disabled={
                    busy || disabled ||
                    !methodId ||
                    (isCrypto && !networkId) ||
                    !amountReady() ||
                    (isMobile && !phoneValid)
                }
                style={{ opacity: (busy || disabled || !methodId || (isCrypto && !networkId) || !amountReady() || (isMobile && !phoneValid)) ? .6 : 1 }}
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
