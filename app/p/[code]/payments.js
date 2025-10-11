// app/p/[code]/payments.js
'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE } from '../../../lib/api'; // uses NEXT_PUBLIC_API_BASE

export default function PaymentsFeed({ publicCode, currency = 'USD', pageSize = 10, requestType = 'QUICK_CHARGE' }) {
    const [items, setItems] = useState([]);
    const [error, setError] = useState(null);

    // pagination guards in refs
    const pageRef = useRef(0);                 // next page to fetch
    const hasMoreRef = useRef(true);
    const loadingRef = useRef(false);
    const fetchedPagesRef = useRef(new Set()); // pages already fetched
    const abortRef = useRef(null);

    // sentinel + observer
    const sentinelRef = useRef(null);
    const observerRef = useRef(null);
    const initializedRef = useRef(false);

    // Amount formatter — ensure USD shows "$" (not "US$")
    const fmtMoney = useCallback(
        (n) => {
            if (typeof n !== 'number') return n;
            if (String(currency).toUpperCase() === 'USD') {
                // Force narrow symbol with US locale to render "$"
                return n.toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    currencyDisplay: 'narrowSymbol',
                    maximumFractionDigits: 2,
                });
            }
            // Fallback for other currencies (keep user’s locale)
            return n.toLocaleString(undefined, {
                style: 'currency',
                currency,
                maximumFractionDigits: 2,
            });
        },
        [currency]
    );

    const fmtDate = (iso) => {
        try { return new Date(iso).toLocaleString(); } catch { return iso || '—'; }
    };

    const fetchPage = useCallback(async (p) => {
        if (!publicCode) return;
        if (loadingRef.current) return;
        if (!hasMoreRef.current) return;
        if (fetchedPagesRef.current.has(p)) return;

        loadingRef.current = true;
        setError(null);

        // cancel in-flight request if any
        if (abortRef.current) abortRef.current.abort();
        const ac = new AbortController();
        abortRef.current = ac;

        try {
            const url = `${API_BASE}/public/payment-requests/${encodeURIComponent(publicCode)}/payments?page=${p}&size=${pageSize}`;
            const res = await fetch(url, { cache: 'no-store', signal: ac.signal });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();

            const content = Array.isArray(json?.content) ? json.content : [];
            setItems((prev) => {
                const seen = new Set(prev.map((x) => x.id));
                const next = [...prev];
                for (const it of content) {
                    if (!seen.has(it.id)) next.push(it);
                }
                return next;
            });

            fetchedPagesRef.current.add(p);
            hasMoreRef.current = json?.last === false; // more pages only if last=false
            pageRef.current = p + 1;                   // advance to next page
        } catch (e) {
            if (e?.name !== 'AbortError') setError(e?.message || 'Impossible de charger les paiements.');
        } finally {
            if (abortRef.current === ac) abortRef.current = null;
            loadingRef.current = false;
        }
    }, [publicCode, pageSize]);

    // initialize per code
    useEffect(() => {
        resetAndFetchFirst();
        return () => { if (abortRef.current) abortRef.current.abort(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [publicCode]);

    const resetAndFetchFirst = useCallback(() => {
        setItems([]);
        setError(null);
        fetchedPagesRef.current.clear();
        pageRef.current = 0;
        hasMoreRef.current = true;
        loadingRef.current = false;
        initializedRef.current = true;
        fetchPage(0);
    }, [fetchPage]);

    // intersection observer: load next page when sentinel is visible
    useEffect(() => {
        if (!initializedRef.current || !sentinelRef.current) return;

        observerRef.current = new IntersectionObserver(
            (entries) => {
                const first = entries[0];
                if (!first?.isIntersecting) return;
                if (!loadingRef.current && hasMoreRef.current) {
                    fetchPage(pageRef.current);
                }
            },
            { root: null, rootMargin: '200px 0px', threshold: 0.1 }
        );

        observerRef.current.observe(sentinelRef.current);
        return () => observerRef.current?.disconnect();
    }, [fetchPage]);

    const loading = loadingRef.current;

    return (
        <section className="card card--plain" style={{ background: '#fff', marginTop: 12 }}>
            {/* Header with refresh */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 className="card-title" style={{ margin: 0 }}>They have contributed</h3>
                <button
                    aria-label="Rafraîchir"
                    title="Rafraîchir"
                    className="tile"
                    onClick={resetAndFetchFirst}
                    style={{ padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: 6, color: '#4F805C' }}
                >
                    <IconRefresh />
                    <span style={{ fontSize: 14 }}>Refresh</span>
                </button>
            </div>

            {/* Empty */}
            {!items.length && !loading && !error && (
                <div style={{ marginTop: 8, padding: 12, border: '1px dashed var(--brand-border)', borderRadius: 12, background: '#fff' }}>
                    <div className="label" style={{ marginBottom: 4 }}>Aucun paiement</div>
                    <div className="p-muted">Les paiements apparaîtront ici au fur et à mesure.</div>
                </div>
            )}

            {/* List */}
            {!!items.length && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                    {items.map((p) => (
                        <div
                            key={p.id}
                            style={{
                                border: '1px solid var(--brand-border)',
                                borderRadius: 12,
                                background: '#fff',
                                padding: 12,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: 10,
                            }}
                        >
                            {/* Left: avatar + amount + optional name */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                <Avatar type={requestType} />
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontWeight: 900, color: '#0f172a' }}>
                                        {fmtMoney(p.amount)}
                                    </div>

                                    {/* Show payerName only when present — no placeholder, avoids the "dot" look */}
                                    {p.payerName && (
                                        <div
                                            style={{
                                                fontSize: 14,
                                                color: '#0f172a',
                                                marginTop: 2,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}
                                            title={p.payerName}
                                        >
                                            {p.payerName}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right: date */}
                            <div style={{ fontSize: 13, color: '#64748B', whiteSpace: 'nowrap' }}>
                                {fmtDate(p.createdAt)}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Error */}
            {error && (
                <div style={{
                    marginTop: 8, border: '1px solid #FECACA', background: '#FEF2F2',
                    borderRadius: 12, padding: 10, color: '#991B1B', fontSize: 13
                }}>
                    {error}
                </div>
            )}

            {/* Loading skeleton */}
            {loading && (
                <div style={{ marginTop: 8 }}>
                    <ListSkeleton />
                </div>
            )}

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} style={{ height: 1 }} />
        </section>
    );
}

/* -------------------------- Avatar + icons -------------------------- */

function Avatar({ type = 'QUICK_CHARGE' }) {
    const t = String(type || '').toUpperCase();
    const bg = 'var(--brand-primary-soft)';   // soft green background
    const fg = 'var(--brand-primary)';        // brand green for icon

    return (
        <div
            aria-hidden
            style={{
                width: 40,
                height: 40,
                borderRadius: 999,
                background: bg,
                border: '1px solid var(--brand-border)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: '0 0 auto',
            }}
        >
            {t === 'DONATION' ? <IconHeart color={fg} /> :
                t === 'INVOICE'  ? <IconReceipt color={fg} /> :
                    <IconFlash color={fg} />}
        </div>
    );
}

/* Crisp SVGs */
function IconFlash({ color = '#4F805C', size = 18 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M13 2L3 14h7l-1 8L21 8h-7l-1-6z" fill={color} />
        </svg>
    );
}
function IconReceipt({ color = '#4F805C', size = 18 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 2h12l2 2v16l-2 2-2-2-2 2-2-2-2 2-2-2-2 2-2-2V4l2-2zM8 6h8v2H8V6zm0 4h8v2H8v-2zm0 4h6v2H8v-2z" fill={color} />
        </svg>
    );
}
function IconHeart({ color = '#4F805C', size = 18 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12.1 21.35l-1.1-1.02C5.4 15.36 2 12.28 2 8.5 2 6 4 4 6.5 4 8 4 9.4 4.81 10.2 6.08 11 4.81 12.4 4 13.9 4 16.4 4 18.4 6 18.4 8.5c0 3.78-3.4 6.86-8.9 11.83l-1.4 1.02z" fill={color} />
        </svg>
    );
}

/* Refresh icon */
function IconRefresh({ size = 16, color = '#0f172a' }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
            <path fill={color} d="M17.65 6.35A7.95 7.95 0 0 0 12 4a8 8 0 1 0 8 8h-2a6 6 0 1 1-6-6c1.66 0 3.14.67 4.22 1.76L13 11h7V4l-2.35 2.35z"/>
        </svg>
    );
}

/* Skeleton renderer */
function ListSkeleton() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{
                    border: '1px solid var(--brand-border)', borderRadius: 12, background: '#fff',
                    padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8
                }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:40, height:40, borderRadius:999, background:'#F1F5F9' }} />
                        <div>
                            <div style={{ width:120, height:12, background:'#F1F5F9', borderRadius:6, marginBottom:6 }} />
                            <div style={{ width:80, height:10, background:'#F1F5F9', borderRadius:6 }} />
                        </div>
                    </div>
                    <div style={{ width:90, height:12, background:'#F1F5F9', borderRadius:6 }} />
                </div>
            ))}
        </div>
    );
}
