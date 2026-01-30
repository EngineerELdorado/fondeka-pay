'use client';

import React, {useEffect, useMemo, useRef, useState, useCallback} from 'react';
import {API_BASE, http, idem} from '../../../lib/api';
import {
    GROUP_ORDER,
    labelForType,
    money,
    parseCryptoHint,
    prettyError,
    shouldRefreshOnError,
} from './utils/payform-helpers';
import COUNTRIES from '../../../src/data/countries';

import Accordion from './components/Accordion';
import MobilePhoneField from './components/MobilePhoneField';
import NetworkPills from './components/NetworkPills';
import SquareGrid, {SquareTile} from './components/SquareGrid';
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

    const type = data.type || 'QUICK_CHARGE';
    const currency = data.currency || 'USD';
    const isDonation = type === 'DONATION';

    const [checkoutToken, setCheckoutToken] = useState(data.checkoutToken || '');

    const [countryCode, setCountryCode] = useState((detectedCountry || 'CD').toUpperCase());
    const [userSelectedCountry, setUserSelectedCountry] = useState(false);
    const countryOptions = useMemo(() => {
        const seen = new Set();
        return COUNTRIES.reduce((acc, country) => {
            if (seen.has(country.cca2)) return acc;
            seen.add(country.cca2);
            acc.push({
                code: country.cca2,
                name: country.name,
                callingCode: country.callingCode,
                flag: country.flag,
            });
            return acc;
        }, []);
    }, []);

    const selectedCountry = useMemo(
        () => COUNTRIES_BY_CODE[countryCode] || {code: countryCode, name: countryCode, callingCode: ''},
        [countryCode]
    );
    const callingCode = useMemo(
        () => selectedCountry.callingCode || '243',
        [selectedCountry.callingCode]
    );

    // Hooks now DO NOT auto-select a method; methodId starts as null
    const {methods, grouped, methodId, setMethodId, error: methodsError} = usePaymentMethods(countryCode);
    const selectedMethod = methods.find(m => m.id === methodId) || null;
    const isCrypto = selectedMethod?.type === 'CRYPTO';
    const isMobile = selectedMethod?.type === 'MOBILE_MONEY';

    const {networks, networkId, setNetworkId, error: networksError} = useCryptoNetworks(isCrypto, methodId);

    const amountRef = useRef(null);
    const phoneRef = useRef(null);
    const nameRef = useRef(null);
    const emailRef = useRef(null);

    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState(null);
    const [status, setStatus] = useState('idle');

    const [result, setResult] = useState(null);
    const [showQr, setShowQr] = useState(false);
    const [showMM, setShowMM] = useState(false);
    const [canRefresh, setCanRefresh] = useState(false);
    const [showReview, setShowReview] = useState(false);
    const [quote, setQuote] = useState(null);
    const [quoteLoading, setQuoteLoading] = useState(false);
    const [quoteError, setQuoteError] = useState(null);

    const [showCountryPicker, setShowCountryPicker] = useState(false);
    const [countryQuery, setCountryQuery] = useState('');

    // validity + controlled phone
    const [amountValid, setAmountValid] = useState(() => !isDonation ? Number(data.amount) > 0 : false);
    const [phoneValid, setPhoneValid] = useState(false);
    const [phoneDigits, setPhoneDigits] = useState(''); // controlled digits (without +country)
    const [anonymous, setAnonymous] = useState(true);

    const makeCollapsedState = useCallback(() => {
        const init = {};
        GROUP_ORDER.forEach(t => { init[t] = false; });
        return init;
    }, []);

    // ACCORDIONS: all collapsed by default; ONLY user clicks toggle them
    const [expanded, setExpanded] = useState(() => makeCollapsedState());
    const onToggleAccordion = useCallback((typeKey) => {
        setExpanded(prev => {
            const next = {};
            GROUP_ORDER.forEach(t => { next[t] = false; });
            next[typeKey] = !prev[typeKey];
            return next;
        });
    }, []);

    const filteredCountries = useMemo(() => {
        const query = countryQuery.trim().toLowerCase();
        if (!query) return countryOptions;
        return countryOptions.filter((country) => (
            country.name.toLowerCase().includes(query) ||
            country.code.toLowerCase().includes(query) ||
            country.callingCode.includes(query)
        ));
    }, [countryOptions, countryQuery]);

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

    const enteredAmount = isDonation ? getDonationAmountNumber() : Number(data.amount) || 0;
    const totalToPay = quote?.totalToPay ?? enteredAmount;
    const fees = quote?.fees ?? null;

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
        const res = await fetch(`${API_BASE}/public/payment-requests/${encodeURIComponent(publicCode)}`, {cache: 'no-store'});
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const link = await res.json();
        if (!link.checkoutToken) throw new Error('Token indisponible');
        setCheckoutToken(link.checkoutToken);
        return link.checkoutToken;
    };

    /* ---------- quote (fees) ---------- */
    const fetchQuote = useCallback(async () => {
        const params = new URLSearchParams();
        params.set('action', 'PAY_REQUEST');
        params.set('amount', String(enteredAmount));
        if (methodId) params.set('paymentMethodId', String(methodId));
        const url = `${API_BASE}/public/fees?${params.toString()}`;

        setQuoteLoading(true);
        setQuoteError(null);
        try {
            const res = await fetch(url, { cache: 'no-store' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const j = await res.json();
            setQuote(j);
            return j;
        } catch (e) {
            const msg = prettyError(e?.message || 'Impossible de calculer les frais.');
            setQuoteError(msg);
            throw e;
        } finally {
            setQuoteLoading(false);
        }
    }, [enteredAmount, methodId]);

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
            const address = res?.nextAction?.urlOrHint || '';
            const typeText = res?.nextAction?.type || '';
            const parsed = parseCryptoHint(typeText);

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
        setStatus('pending');
    };

    /* ---------- review (quote then confirm) ---------- */
    const onReview = async () => {
        if (disabled) return;
        const v = validate();
        if (v) {
            setErr(v);
            setCanRefresh(true);
            return;
        }
        setQuote(null);
        setQuoteError(null);
        try {
            await fetchQuote();
            setShowReview(true);
        } catch {
            // quoteError already set
        }
    };

    const onPay = async () => {
        if (disabled) return;
        const v = validate();
        if (v) {
            setErr(v);
            setCanRefresh(true);
            return;
        }

        setShowReview(false);
        setShowMM(false);
        setShowQr(false);
        setResult(null);
        setCanRefresh(false);
        setErr(null);
        setBusy(true);
        setStatus('pending');

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
                payerAnonymous: anonymous,
                idempotencyKey: idemKey,
            };
            return http(`${API_BASE}/public/payment-requests/pay`, {
                method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)
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

    const onRefreshAndRetry = async () => {
        setShowMM(false);
        setShowQr(false);
        setResult(null);
        setCanRefresh(false);
        setErr(null);
        setBusy(true);
        try {
            const fresh = await refreshCheckoutToken();
            const res = await http(`${API_BASE}/public/payment-requests/pay`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
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
            setErr(prettyError(e?.message));
            setCanRefresh(true);
        } finally {
            setBusy(false);
        }
    };

    // show API errors (if any)
    useEffect(() => {
        if (methodsError) setErr(methodsError);
        if (networksError) setErr(networksError);
    }, [methodsError, networksError]);

    useEffect(() => {
        if (userSelectedCountry) return;
        if (!detectedCountry) return;
        setCountryCode(detectedCountry.toUpperCase());
    }, [detectedCountry, userSelectedCountry]);

    useEffect(() => {
        setExpanded(makeCollapsedState());
        setMethodId(null);
        setNetworkId(null);
        setPhoneDigits('');
        setPhoneValid(false);
        setCountryQuery('');
    }, [countryCode, makeCollapsedState, setMethodId, setNetworkId]);

    /* ---------- render helpers ---------- */
    const renderGroupTiles = (typeKey, list, logoSize) => (
        <SquareGrid>
            {list.map((m) => {
                return (
                    <SquareTile
                        key={m.id}
                        active={methodId === m.id}
                        onClick={() => {
                            setMethodId(m.id);
                            // Open only this group
                            const next = {};
                            GROUP_ORDER.forEach(t => { next[t] = false; });
                            next[typeKey] = true;
                            setExpanded(next);
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
        <div style={{display: 'flex', flexDirection: 'column', gap: 12, ...(disabled ? {opacity: 0.95} : null)}}>
            {/* Amount */}
            {isDonation ? (
                <section className="card" style={disabled ? {opacity: 0.6, pointerEvents: 'none'} : undefined}>
                    <label className="label">How much do you want to send</label>

                    {!!(Array.isArray(data.presets) && data.presets.length) && (
                        <div style={{display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8}}>
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

                    <div style={{display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, minWidth: 0}}>
                        <input
                            ref={amountRef}
                            inputMode="decimal"
                            type="tel"
                            className="input"
                            placeholder="0"
                            style={{flex: 1, minWidth: 0, fontSize: 16}}
                            onInput={(e) => {
                                const n = Number(String(e.currentTarget.value || '').replace(',', '.'));
                                setAmountValid(Number.isFinite(n) && n > 0);
                            }}
                            disabled={disabled}
                        />
                        <span
                            style={{fontSize: 14, color: 'var(--brand-muted)', whiteSpace: 'nowrap'}}>{currency}</span>
                    </div>
                </section>
            ) : (
                <section className="card" style={disabled ? {opacity: 0.6, pointerEvents: 'none'} : undefined}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: 0}}>
                        <span className="label">{type === 'INVOICE' ? 'Total to pay' : 'Amount'}</span>
                        <strong style={{fontSize: 16, whiteSpace: 'nowrap'}}>{money(data.amount, currency)}</strong>
                    </div>
                </section>
            )}

            {/* Methods header */}
            <div style={{marginTop: 2}}>
                <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                    <span className="label" style={{marginBottom: 0, flex: 1}}>How do you want to pay?</span>
                    <button
                        type="button"
                        className="chip"
                        onClick={() => {
                            if (disabled) return;
                            setCountryQuery('');
                            setShowCountryPicker(true);
                        }}
                        style={{display: 'inline-flex', alignItems: 'center', gap: 6}}
                        disabled={disabled}
                    >
                        <span style={{fontWeight: 700}}>
                            {selectedCountry.flag ? `${selectedCountry.flag} ` : ''}{selectedCountry.name}
                        </span>
                    </button>
                </div>
                {disabledReason && (
                    <span style={{display: 'block', color: '#64748B', fontSize: 14, marginTop: 4}}>
                        {disabledReason}
                    </span>
                )}
            </div>

            {/* Accordions — only one open at a time; each has its own form/CTA */}
            <div style={disabled ? {opacity: 0.6, pointerEvents: 'none'} : undefined}>
                {GROUP_ORDER.map((t) => {
                    const list = grouped[t];
                    if (!list?.length) return null;
                    const logoSize = 36;
                    const activeGroup = !!list.find(m => m.id === methodId);

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
                                    <div style={{marginTop: 14}}>
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
                                <div style={{marginTop: 10}}>
                                    <label className="label" style={{marginBottom: 6}}>Network</label>
                                    <NetworkPills items={networks} selectedId={networkId} onSelect={setNetworkId}
                                                  disabled={disabled}/>
                                </div>
                            )}

                            {/* Contact details + CTA scoped to this section */}
                            {activeGroup && (
                                <div style={{marginTop: 12, display:'flex', flexDirection:'column', gap:10}}>
                                    <label style={{ display:'inline-flex', alignItems:'center', gap:8, fontWeight:700, color:'#0f172a' }}>
                                        <input
                                            type="checkbox"
                                            checked={anonymous}
                                            onChange={(e) => setAnonymous(e.currentTarget.checked)}
                                            style={{ width:16, height:16 }}
                                        />
                                        Payer en anonyme
                                    </label>
                                    {!anonymous && (
                                        <div style={{display: 'flex', gap: 8, minWidth: 0}}>
                                            <input ref={nameRef} className="input" placeholder="Nom (optionnel)"
                                                   style={{flex: 1, minWidth: 0}}/>
                                            <input ref={emailRef} className="input" placeholder="Email (optionnel)"
                                                   style={{flex: 1, minWidth: 0}}/>
                                        </div>
                                    )}
                                    <button
                                        className="btn btn--primary"
                                        onClick={onReview}
                                        disabled={
                                            busy || quoteLoading || disabled ||
                                            !methodId ||
                                            (isCrypto && !networkId) ||
                                            !amountReady() ||
                                            (isMobile && !phoneValid)
                                        }
                                        style={{
                                            fontSize: 16,
                                            opacity: (busy || quoteLoading || disabled || !methodId || (isCrypto && !networkId) || !amountReady() || (isMobile && !phoneValid)) ? .6 : 1
                                        }}
                                    >
                                        {quoteLoading ? 'Calcul en cours…' : busy ? 'Sending…' : 'Review & Pay'}
                                    </button>
                                </div>
                            )}
                        </Accordion>
                    );
                })}
            </div>

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
            {showReview && (
                <ReviewModal
                    onClose={() => setShowReview(false)}
                    onConfirm={onPay}
                    amount={enteredAmount}
                    fees={fees}
                    total={totalToPay}
                    currency={currency}
                    method={selectedMethod}
                    network={isCrypto ? networks.find(n => n.id === networkId) : null}
                    account={isMobile ? getAccountNumber() : null}
                    canConfirm={!busy}
                />
            )}
            {showCountryPicker && (
                <CountryPickerModal
                    open={showCountryPicker}
                    onClose={() => setShowCountryPicker(false)}
                    countries={filteredCountries}
                    query={countryQuery}
                    onQueryChange={setCountryQuery}
                    selectedCode={countryCode}
                    onSelect={(country) => {
                        setUserSelectedCountry(true);
                        setCountryCode(country.code);
                        setShowCountryPicker(false);
                    }}
                />
            )}

            {/* Errors */}
            {err && (
                <section className="card card--plain" style={{borderColor: '#FECACA', background: '#FEF2F2'}}>
                    <h3 className="card-title" style={{marginBottom: 6}}>Oups…</h3>
                    <p className="p-muted" style={{color: '#991B1B'}}>{err}</p>
                    {canRefresh && (
                        <div style={{display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap'}}>
                            <button className="tile" onClick={onRefreshAndRetry} style={{padding: '8px 10px'}}>
                                Refresh & rety
                            </button>
                        </div>
                    )}
                </section>
            )}

            {/* Status */}
            {status === 'pending' && <p className="note">Confirmation en cours…</p>}
            {status === 'succeeded' && <p className="note" style={{color: '#16a34a'}}>Paiement reçu. Merci !</p>}
            {status === 'failed' &&
                <p className="note" style={{color: '#dc2626'}}>Paiement échoué. Essayez une autre méthode.</p>}
        </div>
    );
}

const COUNTRIES_BY_CODE = COUNTRIES.reduce((acc, country) => {
    if (acc[country.cca2]) return acc;
    acc[country.cca2] = {
        code: country.cca2,
        name: country.name,
        callingCode: country.callingCode,
        flag: country.flag,
    };
    return acc;
}, {});

function CountryPickerModal({open, onClose, countries, query, onQueryChange, selectedCode, onSelect}) {
    if (!open) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                background: 'rgba(0,0,0,0.45)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-end',
                padding: 0,
            }}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '100%',
                    maxWidth: 520,
                    borderTopLeftRadius: 18,
                    borderTopRightRadius: 18,
                    background: '#fff',
                    padding: '16px 16px 20px',
                    boxShadow: '0 -12px 30px rgba(0,0,0,0.25)',
                    animation: 'sheetUp .25s ease',
                }}
            >
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <h3 className="card-title" style={{margin: 0}}>Select a country</h3>
                    <button onClick={onClose} className="tile" style={{padding: '6px 10px'}}>Close</button>
                </div>

                <input
                    type="text"
                    className="input"
                    placeholder="Search country"
                    value={query}
                    onChange={(e) => onQueryChange(e.currentTarget.value)}
                    style={{marginTop: 12}}
                />

                <div
                    style={{
                        marginTop: 12,
                        maxHeight: '55vh',
                        overflow: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                    }}
                >
                    {countries.length === 0 && (
                        <div className="note" style={{padding: '12px 6px'}}>No countries found.</div>
                    )}
                    {countries.map((country) => (
                        <button
                            key={country.code}
                            type="button"
                            onClick={() => onSelect(country)}
                            className="tile"
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '10px 12px',
                                borderColor: country.code === selectedCode ? '#2563eb' : undefined,
                                background: country.code === selectedCode ? '#eff6ff' : undefined,
                            }}
                        >
                            <span style={{fontWeight: 600}}>
                                {country.flag ? `${country.flag} ` : ''}{country.name}
                            </span>
                            <span style={{color: '#64748B', fontWeight: 700}}>
                                {country.code} {country.callingCode ? `+${country.callingCode}` : ''}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

function ReviewModal({ onClose, onConfirm, amount, fees, total, currency, method, network, account, canConfirm }) {
    return (
        <div
            role="dialog"
            aria-modal="true"
            style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'flex-end', padding:0 }}
            onClick={onClose}
        >
            <div
                onClick={(e)=>e.stopPropagation()}
                style={{
                    width:'100%', maxWidth:520,
                    borderTopLeftRadius:18, borderTopRightRadius:18,
                    background:'#fff',
                    padding:'16px 16px 20px',
                    boxShadow:'0 -12px 30px rgba(0,0,0,0.25)',
                    animation:'sheetUp .25s ease'
                }}
            >
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <h3 className="card-title" style={{ margin:0 }}>Confirmer</h3>
                    <button onClick={onClose} className="tile" style={{ padding:'6px 10px' }}>Fermer</button>
                </div>

                <div style={{ marginTop: 12, display:'flex', flexDirection:'column', gap:10 }}>
                    <SummaryLine label="Montant" value={money(amount, currency)} />
                    <SummaryLine label="Frais" value={fees != null ? money(fees, currency) : '—'} />
                    <SummaryLine label="Total à payer" value={money(total || amount, currency)} bold />
                    {method && <SummaryLine label="Méthode" value={method.name} />}
                    {network && <SummaryLine label="Réseau" value={network.displayName || network.name} />}
                    {account && <SummaryLine label="Compte" value={account} />}
                </div>

                <div style={{ display:'flex', gap:10, marginTop:14, flexWrap:'wrap' }}>
                    <button className="tile" onClick={onClose} style={{ padding:'10px 12px', flex:1, minWidth:120 }}>
                        Retour
                    </button>
                    <button
                        className="btn btn--primary"
                        style={{ height:48, flex:1, minWidth:160 }}
                        onClick={onConfirm}
                        disabled={!canConfirm}
                    >
                        Payer maintenant
                    </button>
                </div>
            </div>
        </div>
    );
}

function SummaryLine({ label, value, bold }) {
    return (
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span className="label">{label}</span>
            <span style={{ fontWeight: bold ? 800 : 700 }}>{value}</span>
        </div>
    );
}
