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
import {
    detectPayFormLanguage,
    getPayFormMessages,
    interpolate,
    normalizePayFormLanguage,
    withPublicLanguageHeaders,
} from './utils/payform-i18n';
import COUNTRY_DATA from '../../../src/data/countries';

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
                                    totalCollected = 0,
                                    initialLanguage = 'en',
                                }) {
    const disabled = !canPay;

    const type = data.type || 'QUICK_CHARGE';
    const currency = data.currency || 'USD';
    const isDonation = type === 'DONATION';
    const minimumEnabled = data.minimumAmountEnabled === true;
    const minimumAmount = Number(data.minAmount) || 0;
    const showCollected = type === 'INVOICE' && data.showRecentPaymentsPublicly === true;
    const collectedAmount = Number.isFinite(Number(totalCollected)) ? Number(totalCollected) : 0;

    const [checkoutToken, setCheckoutToken] = useState(data.checkoutToken || '');
    const [language, setLanguage] = useState(normalizePayFormLanguage(initialLanguage));
    const messages = useMemo(() => getPayFormMessages(language), [language]);
    const errorMessages = messages.errors;

    const [countryCode, setCountryCode] = useState((detectedCountry || 'CD').toUpperCase());
    const [userSelectedCountry, setUserSelectedCountry] = useState(false);
    const callingCode = useMemo(() => mapIsoToCallingCode(countryCode) || '243', [countryCode]);
    const selectedCountry = useMemo(
        () => COUNTRIES_BY_CODE[countryCode] || {code: countryCode, name: countryCode},
        [countryCode]
    );

    // Hooks now DO NOT auto-select a method; methodId starts as null
    const {methods, grouped, methodId, setMethodId, error: methodsError} = usePaymentMethods(publicCode, countryCode, language);
    const selectedMethod = methods.find(m => m.id === methodId) || null;
    const isCrypto = selectedMethod?.type === 'CRYPTO';
    const isMobile = selectedMethod?.type === 'MOBILE_MONEY';

    const {networks, networkId, setNetworkId, error: networksError} = useCryptoNetworks(isCrypto, methodId, language);

    const amountRef = useRef(null);
    const phoneRef = useRef(null);
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
    const isValidDonationAmount = useCallback((value) => {
        const amount = Number(value);
        if (!Number.isFinite(amount) || amount <= 0) return false;
        if (minimumEnabled && amount < minimumAmount) return false;
        if (data.maxAmount != null && Number(data.maxAmount) > 0 && amount > Number(data.maxAmount)) return false;
        return true;
    }, [data.maxAmount, minimumAmount, minimumEnabled]);
    const [amountValid, setAmountValid] = useState(() => {
        if (!isDonation) return Number(data.amount) > 0;
        return minimumEnabled && minimumAmount > 0;
    });
    const [phoneValid, setPhoneValid] = useState(false);
    const [phoneDigits, setPhoneDigits] = useState(''); // controlled digits (without +country)
    const [dynamicPayerFieldValues, setDynamicPayerFieldValues] = useState({});
    const [touchedDynamicPayerFields, setTouchedDynamicPayerFields] = useState({});

    const makeCollapsedState = useCallback(() => {
        const init = {};
        GROUP_ORDER.forEach(t => { init[t] = false; });
        return init;
    }, []);

    const firstAvailableGroup = useMemo(
        () => GROUP_ORDER.find(t => grouped[t]?.length),
        [grouped]
    );

    // ACCORDIONS: open the highest-priority available group by default; user clicks still control them after that.
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
        if (!query) return COUNTRY_OPTIONS;
        return COUNTRY_OPTIONS.filter((country) => (
            country.name.toLowerCase().includes(query) ||
            country.code.toLowerCase().includes(query)
        ));
    }, [countryQuery]);
    const payerFields = Array.isArray(data.payerFields) ? data.payerFields : [];
    const hasRequiredPayerFields = payerFields.some((field) => field?.required);
    const canPayAnonymously = !hasRequiredPayerFields;
    const payerAnonymous = canPayAnonymously;

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
    const missingRequiredPayerFieldKeys = useMemo(
        () => payerFields
            .filter((field) => field?.required)
            .filter((field) => !String(dynamicPayerFieldValues[field.key] || '').trim())
            .map((field) => field.key),
        [dynamicPayerFieldValues, payerFields]
    );
    const hasMissingRequiredPayerFields = missingRequiredPayerFieldKeys.length > 0;

    const getDynamicPayerFieldsPayload = useCallback(() => {
        if (!payerFields.length) return undefined;

        const entries = payerFields.reduce((acc, field) => {
            const value = String(dynamicPayerFieldValues[field.key] || '').trim();
            if (value) acc.push([field.key, value]);
            return acc;
        }, []);

        return entries.length ? Object.fromEntries(entries) : undefined;
    }, [dynamicPayerFieldValues, payerFields]);

    const validate = () => {
        if (!methodId) return errorMessages.choosePaymentMethod;
        if (isDonation) {
            const n = getDonationAmountNumber();
            const hasMax = data.maxAmount != null && Number(data.maxAmount) > 0;
            if (n <= 0) return errorMessages.enterAmount;
            if (minimumEnabled && n < minimumAmount) return interpolate(errorMessages.minimum, {amount: money(minimumAmount, currency, language)});
            if (hasMax && n > Number(data.maxAmount)) return interpolate(errorMessages.maximum, {amount: money(data.maxAmount, currency, language)});
        } else {
            if (!(Number(data.amount) > 0)) return errorMessages.missingAmount;
        }
        if (isMobile && !phoneValid) return errorMessages.invalidMobileMoney;
        if (isCrypto && !networkId) return errorMessages.chooseNetwork;
        for (const field of payerFields) {
            if (!field?.required) continue;
            const value = String(dynamicPayerFieldValues[field.key] || '').trim();
            if (!value) return interpolate(errorMessages.fieldRequired, {field: field.label});
        }
        return null;
    };

    const amountReady = () => (isDonation ? amountValid : Number(data.amount) > 0);

    const enteredAmount = isDonation ? getDonationAmountNumber() : Number(data.amount) || 0;
    const requestedAmount = quote?.requestedAmount ?? enteredAmount;
    const totalToPay = quote?.grossAmount ?? quote?.totalToPay ?? enteredAmount;
    const fees = quote?.fees ?? null;
    const providerAmount = quote?.providerAmount ?? null;
    const providerCurrency = quote?.providerCurrency ?? null;

    const showContact = () => {
        if (disabled) return false;
        if (!methodId) return false;
        if (isCrypto && !networkId) return false;
        if (!amountReady()) return false;
        return true;
    };

    /* ---------- token refresh ---------- */
    const refreshCheckoutToken = async () => {
        if (!publicCode) throw new Error(errorMessages.publicCodeMissing);
        const res = await fetch(
            `${API_BASE}/public/payment-requests/${encodeURIComponent(publicCode)}`,
            withPublicLanguageHeaders({cache: 'no-store'}, language)
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const link = await res.json();
        if (!link.checkoutToken) throw new Error(errorMessages.tokenUnavailable);
        setCheckoutToken(link.checkoutToken);
        return link.checkoutToken;
    };

    /* ---------- quote (fees) ---------- */
    const fetchQuote = useCallback(async () => {
        if (!publicCode) throw new Error(errorMessages.publicCodeMissing);
        const params = new URLSearchParams();
        if (methodId) params.set('paymentMethodId', String(methodId));
        params.set('amount', String(enteredAmount));
        const scopedUrl = `${API_BASE}/public/payment-requests/${encodeURIComponent(publicCode)}/quote?${params.toString()}`;

        setQuoteLoading(true);
        setQuoteError(null);
        try {
            const res = await fetch(scopedUrl, withPublicLanguageHeaders({ cache: 'no-store' }, language));
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const j = await res.json();
            setQuote(j);
            return j;
        } catch (e) {
            const msg = prettyError(e?.message || errorMessages.feesUnavailable, errorMessages);
            setQuoteError(msg);
            throw e;
        } finally {
            setQuoteLoading(false);
        }
    }, [enteredAmount, errorMessages, language, methodId, publicCode]);

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
            setErr(errorMessages.paymentFailed);
            return;
        }
        setStatus('pending');
    };

    /* ---------- review (quote then confirm) ---------- */
    const onReview = async () => {
        if (disabled) return;
        const v = validate();
        if (v) {
            if (hasMissingRequiredPayerFields) {
                setTouchedDynamicPayerFields(() => (
                    payerFields.reduce((acc, field) => {
                        if (field?.required) acc[field.key] = true;
                        return acc;
                    }, {})
                ));
            }
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
                payerFields: getDynamicPayerFieldsPayload(),
                payerAnonymous,
                idempotencyKey: idemKey,
            };
            return http(`${API_BASE}/public/payment-requests/pay`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json', 'Accept-Language': language},
                body: JSON.stringify(body)
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
                    setErr(prettyError(e2?.message, errorMessages));
                    setCanRefresh(true);
                    setStatus('failed');
                }
            } else {
                setErr(prettyError(e?.message, errorMessages));
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
                headers: {'Content-Type': 'application/json', 'Accept-Language': language},
                body: JSON.stringify({
                    checkoutToken: fresh,
                    paymentMethodId: methodId,
                    accountNumber: isMobile ? getAccountNumber() : undefined,
                    networkId: isCrypto ? networkId : null,
                    amount: isDonation ? getDonationAmountNumber() : data.amount,
                    payerFields: getDynamicPayerFieldsPayload(),
                    payerAnonymous,
                    idempotencyKey: idem(),
                })
            });
            handleSuccess(res);
        } catch (e) {
            setErr(prettyError(e?.message, errorMessages));
            setCanRefresh(true);
        } finally {
            setBusy(false);
        }
    };

    useEffect(() => {
        const nextLanguage = detectPayFormLanguage();
        setLanguage((prev) => nextLanguage === prev ? prev : nextLanguage);
        if (typeof document !== 'undefined') {
            document.documentElement.lang = nextLanguage;
        }
    }, []);

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

    useEffect(() => {
        if (!firstAvailableGroup) return;
        const next = makeCollapsedState();
        next[firstAvailableGroup] = true;
        setExpanded(next);
    }, [countryCode, firstAvailableGroup, makeCollapsedState]);

    useEffect(() => {
        setDynamicPayerFieldValues(() => (
            payerFields.reduce((acc, field) => {
                acc[field.key] = '';
                return acc;
            }, {})
        ));
        setTouchedDynamicPayerFields({});
    }, [payerFields]);

    useEffect(() => {
        if (!isDonation) {
            setAmountValid(Number(data.amount) > 0);
            return;
        }
        if (minimumEnabled && minimumAmount > 0) {
            if (amountRef.current && !String(amountRef.current.value || '').trim()) {
                amountRef.current.value = String(minimumAmount);
            }
            setAmountValid(isValidDonationAmount(minimumAmount));
            return;
        }
        setAmountValid(false);
    }, [data.amount, isDonation, isValidDonationAmount, minimumAmount, minimumEnabled]);

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
                        showCurrencyBadge={m.showCurrencyBadge}
                        currency={m.currency}
                    />
                );
            })}
        </SquareGrid>
    );

    return (
        <div style={{display: 'flex', flexDirection: 'column', gap: 12, ...(disabled ? {opacity: 0.95} : null)}}>
            <section className="payment-focus-panel" aria-label={messages.howToPay}>
                {/* Amount */}
                {isDonation ? (
                    <section className="payment-amount-card" style={disabled ? {opacity: 0.6, pointerEvents: 'none'} : undefined}>
                        <div className="payment-section-kicker payment-section-kicker--primary">
                            <span className="payment-section-index">1</span>
                            <label className="payment-section-label">{messages.amountLabel}</label>
                        </div>

                        {minimumEnabled && minimumAmount > 0 && (
                            <p className="p-muted" style={{marginTop: 8}}>
                                {interpolate(messages.minimumDonation, {amount: money(minimumAmount, currency, language)})}
                            </p>
                        )}

                        {!!(Array.isArray(data.presets) && data.presets.length) && (
                            <div style={{display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12}}>
                                {data.presets.map((p, i) => (
                                    <button
                                        key={`${p}-${i}`}
                                        onClick={() => {
                                            if (amountRef.current) amountRef.current.value = String(p);
                                            setAmountValid(isValidDonationAmount(p));
                                        }}
                                        className="chip"
                                    >
                                        {money(p, currency, language)}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="payment-amount-input-row">
                            <input
                                ref={amountRef}
                                inputMode="decimal"
                                type="tel"
                                className="input payment-amount-input"
                                placeholder="0"
                                defaultValue={minimumEnabled && minimumAmount > 0 ? String(minimumAmount) : ''}
                                onInput={(e) => {
                                    const n = Number(String(e.currentTarget.value || '').replace(',', '.'));
                                    setAmountValid(isValidDonationAmount(n));
                                }}
                                disabled={disabled}
                            />
                            <span className="payment-currency-pill">{currency}</span>
                        </div>

                    </section>
                ) : (
                    <section className="payment-amount-card" style={disabled ? {opacity: 0.6, pointerEvents: 'none'} : undefined}>
                        {showCollected && (
                            <div className="payment-collected-row">
                                <span className="label" style={{marginBottom: 0}}>{messages.collectedSoFar}</span>
                                <strong>{money(collectedAmount, currency || 'USD', language)}</strong>
                            </div>
                        )}
                        <div className="payment-total-row">
                            <div className="payment-section-kicker payment-section-kicker--primary">
                                <span className="payment-section-index">1</span>
                                <span className="payment-section-label">{type === 'INVOICE' ? messages.totalToPay : messages.amount}</span>
                            </div>
                            <strong>{money(data.amount, currency, language)}</strong>
                        </div>
                    </section>
                )}

                {/* Methods header */}
                <div className="payment-methods-heading">
                    <div className="payment-section-kicker payment-section-kicker--secondary">
                        <span className="payment-section-index payment-section-index--secondary">2</span>
                        <span className="payment-section-label">{messages.howToPay}</span>
                    </div>
                    <button
                        type="button"
                        className="chip payment-country-chip"
                        onClick={() => {
                            if (disabled) return;
                            setCountryQuery('');
                            setShowCountryPicker(true);
                        }}
                        disabled={disabled}
                    >
                        <span style={{fontWeight: 800}}>{selectedCountry.name}</span>
                        <svg
                            aria-hidden="true"
                            width="14"
                            height="14"
                            viewBox="0 0 20 20"
                            fill="none"
                            style={{display: 'block', flex: '0 0 auto'}}
                        >
                            <path
                                d="M5 7l5 5 5-5"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </button>
                    {disabledReason && (
                        <span style={{display: 'block', color: '#64748B', fontSize: 14, marginTop: 4, gridColumn: '1 / -1'}}>
                        {disabledReason}
                    </span>
                    )}
                </div>

                {/* Accordions — only one open at a time; each has its own form/CTA */}
                <div className="payment-method-list" style={disabled ? {opacity: 0.6, pointerEvents: 'none'} : undefined}>
                {GROUP_ORDER.map((t) => {
                    const list = grouped[t];
                    if (!list?.length) return null;
                    const logoSize = 36;
                    const activeGroup = !!list.find(m => m.id === methodId);

                    return (
                        <Accordion
                            key={t}
                            title={labelForType(t, messages.typeLabels)}
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
                                            messages={messages}
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
                                    <label className="label" style={{marginBottom: 6}}>{messages.network}</label>
                                    <NetworkPills items={networks} selectedId={networkId} onSelect={setNetworkId}
                                                  disabled={disabled}/>
                                </div>
                            )}

                            {/* Contact details + CTA scoped to this section */}
                            {activeGroup && (
                                <div style={{marginTop: 12, display:'flex', flexDirection:'column', gap:10}}>
                                    {!!payerFields.length && (
                                        <div style={{display: 'flex', flexDirection: 'column', gap: 10, width: '100%', minWidth: 0}}>
                                            {payerFields.map((field) => (
                                                <label key={field.key} style={{display: 'flex', flexDirection: 'column', gap: 6, width: '100%', minWidth: 0}}>
                                                    <span className="label" style={{marginBottom: 0}}>
                                                        {field.label}
                                                        {field.required ? ' *' : ''}
                                                    </span>
                                                    <input
                                                        name={field.key}
                                                        className="input"
                                                        value={dynamicPayerFieldValues[field.key] || ''}
                                                        onBlur={() => {
                                                            setTouchedDynamicPayerFields((prev) => ({
                                                                ...prev,
                                                                [field.key]: true,
                                                            }));
                                                        }}
                                                        onChange={(e) => {
                                                            const nextValue = e.currentTarget.value;
                                                            setDynamicPayerFieldValues((prev) => ({
                                                                ...prev,
                                                                [field.key]: nextValue,
                                                            }));
                                                        }}
                                                        required={field.required}
                                                        aria-invalid={field.required && touchedDynamicPayerFields[field.key] && !String(dynamicPayerFieldValues[field.key] || '').trim()}
                                                        style={{
                                                            width: '100%',
                                                            minWidth: 0,
                                                            boxSizing: 'border-box',
                                                            ...(
                                                            field.required && touchedDynamicPayerFields[field.key] && !String(dynamicPayerFieldValues[field.key] || '').trim()
                                                                ? {borderColor: '#DC2626'}
                                                                : undefined
                                                            ),
                                                        }}
                                                    />
                                                    {field.required && touchedDynamicPayerFields[field.key] && !String(dynamicPayerFieldValues[field.key] || '').trim() && (
                                                        <span style={{fontSize: 13, color: '#DC2626'}}>
                                                            {interpolate(errorMessages.fieldRequired, {field: field.label})}
                                                        </span>
                                                    )}
                                                </label>
                                            ))}
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
                                        {quoteLoading ? messages.calculating : busy ? messages.sending : messages.reviewAndPay}
                                    </button>
                                </div>
                            )}
                        </Accordion>
                    );
                })}
                </div>
            </section>

            {/* Modals */}
            {result?.rail === 'MM' && (
                <MobileMoneyModal
                    open={showMM}
                    onClose={() => setShowMM(false)}
                    number={result.number}
                    hint={result.hint}
                    onRefresh={onRefreshAndRetry}
                    messages={messages}
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
                    messages={messages}
                />
            )}
            {showReview && (
                <ReviewModal
                    onClose={() => setShowReview(false)}
                    onConfirm={onPay}
                    amount={requestedAmount}
                    fees={fees}
                    total={totalToPay}
                    currency={currency}
                    providerAmount={providerAmount}
                    providerCurrency={providerCurrency}
                    method={selectedMethod}
                    network={isCrypto ? networks.find(n => n.id === networkId) : null}
                    account={isMobile ? getAccountNumber() : null}
                    canConfirm={!busy}
                    messages={messages}
                    language={language}
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
                    messages={messages}
                />
            )}

            {/* Errors */}
            {err && (
                <section className="card card--plain" style={{borderColor: '#FECACA', background: '#FEF2F2'}}>
                    <h3 className="card-title" style={{marginBottom: 6}}>{messages.oops}</h3>
                    <p className="p-muted" style={{color: '#991B1B'}}>{err}</p>
                    {canRefresh && (
                        <div style={{display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap'}}>
                            <button className="tile" onClick={onRefreshAndRetry} style={{padding: '8px 10px'}}>
                                {messages.refreshAndRetry}
                            </button>
                        </div>
                    )}
                </section>
            )}

            {/* Status */}
            {status === 'pending' && <p className="note">{messages.confirming}</p>}
            {status === 'succeeded' && <p className="note" style={{color: '#16a34a'}}>{messages.paymentReceived}</p>}
            {status === 'failed' &&
                <p className="note" style={{color: '#dc2626'}}>{messages.paymentFailedStatus}</p>}
        </div>
    );
}

const COUNTRY_OPTIONS = COUNTRY_DATA.map((country) => ({
    code: country.cca2,
    name: country.name,
    callingCode: country.callingCode,
    flag: country.flag,
}));

const COUNTRY_CALLING_CODES = COUNTRY_DATA.reduce((acc, country) => {
    if (country.callingCode) {
        acc[country.cca2] = country.callingCode;
    }
    return acc;
}, {});

const COUNTRIES_BY_CODE = COUNTRY_OPTIONS.reduce((acc, country) => {
    acc[country.code] = country;
    return acc;
}, {});

const mapIsoToCallingCode = (code) => COUNTRY_CALLING_CODES[code] || null;

function CountryPickerModal({open, onClose, countries, query, onQueryChange, selectedCode, onSelect, messages}) {
    if (!open) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            className="country-sheet-backdrop"
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="country-sheet"
            >
                <div className="country-sheet-handle" aria-hidden="true" />

                <div className="country-sheet-header">
                    <div>
                        <h3 className="country-sheet-title">{messages.countryPickerTitle}</h3>
                    </div>
                    <button onClick={onClose} className="country-sheet-close">{messages.close}</button>
                </div>

                <div className="country-search-wrap">
                    <span className="country-search-icon" aria-hidden="true">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </span>
                    <input
                        type="text"
                        className="input country-search-input"
                        placeholder={messages.searchCountry}
                        value={query}
                        onChange={(e) => onQueryChange(e.currentTarget.value)}
                    />
                </div>

                <div className="country-list">
                    {countries.length === 0 && (
                        <div className="country-empty-state">{messages.noCountriesFound}</div>
                    )}
                    {countries.map((country) => {
                        const selected = country.code === selectedCode;
                        return (
                            <button
                                key={country.code}
                                type="button"
                                onClick={() => onSelect(country)}
                                className={`country-row${selected ? ' country-row--selected' : ''}`}
                            >
                                <span className="country-row-flag" aria-hidden="true">{country.flag}</span>
                                <span className="country-row-main">
                                    <span className="country-row-name">{country.name}</span>
                                    <span className="country-row-meta">{country.code}{country.callingCode ? ` · +${country.callingCode}` : ''}</span>
                                </span>
                                <span className="country-row-check" aria-hidden="true">
                                    {selected ? (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                            <path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    ) : null}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function ReviewModal({ onClose, onConfirm, amount, fees, total, currency, providerAmount, providerCurrency, method, network, account, canConfirm, messages, language }) {
    const showProviderAmount = providerAmount != null && providerCurrency;

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
                    <h3 className="card-title" style={{ margin:0 }}>{messages.reviewTitle}</h3>
                    <button onClick={onClose} className="tile" style={{ padding:'6px 10px' }}>{messages.close}</button>
                </div>

                <div style={{ marginTop: 12, display:'flex', flexDirection:'column', gap:10 }}>
                    <SummaryLine label={messages.amount} value={money(amount, currency, language)} />
                    <SummaryLine label={messages.fees} value={fees != null ? money(fees, currency, language) : '—'} />
                    <SummaryLine label={messages.totalToPay} value={money(total || amount, currency, language)} bold />
                    {showProviderAmount && (
                        <SummaryLine label={messages.localCharge} value={money(providerAmount, providerCurrency, language)} bold />
                    )}
                    {method && <SummaryLine label={messages.method} value={method.name} />}
                    {network && <SummaryLine label={messages.network} value={network.displayName || network.name} />}
                    {account && <SummaryLine label={messages.account} value={account} />}
                </div>

                <div className="review-actions">
                    <button className="review-action-button review-action-button--secondary" onClick={onClose}>
                        {messages.back}
                    </button>
                    <button
                        className="review-action-button review-action-button--primary"
                        onClick={onConfirm}
                        disabled={!canConfirm}
                    >
                        {messages.payNow}
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
