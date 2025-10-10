// app/p/[code]/page.js
import { API_BASE } from '../../../lib/api';
import PayForm from './payform';
import PaymentsFeed from './payments';
import LightboxClient from './lightbox-client';
import { notFound } from 'next/navigation';
import { cookies, headers } from 'next/headers';

/* ------------------------- data fetching & helpers ------------------------- */

async function fetchPublicLink(code) {
    try {
        const res = await fetch(`${API_BASE}/public/payment-requests/${code}`, { cache: 'no-store' });
        if (res.status === 404) return null;
        if (!res.ok) return { __error: `Erreur serveur (${res.status})` };
        return res.json();
    } catch {
        return { __error: 'Connexion au serveur impossible.' };
    }
}

function normalizeData(d) {
    if (!d || d.__error) return d;
    return {
        title: d.title ?? null,
        description: d.description ?? null,
        creator: d.creator ?? null,
        type: d.type ?? 'QUICK_CHARGE',
        currency: d.currency ?? 'USD',
        amount: toNum(d.amount),
        minAmount: toNum(d.minAmount),
        maxAmount: toNum(d.maxAmount),
        checkoutToken: d.checkoutToken ?? '',
        presets: Array.isArray(d.presets) ? d.presets.map(toNum).filter(n => Number.isFinite(n) && n > 0) : [],
        items: Array.isArray(d.items) ? d.items : [],
        metadata: d.metadata ?? {},
        image1: d.image1 ?? null,
        image2: d.image2 ?? null,
        image3: d.image3 ?? null,
        image4: d.image4 ?? null,
        image5: d.image5 ?? null,
        lifecycle: d.lifecycle ?? 'ACTIVE',
    };
}
const toNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };

const getYouTubeId = (url) => {
    if (!url) return null;
    try {
        const u = new URL(url);
        if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
        if (u.hostname.includes('youtube.com')) return u.searchParams.get('v') || null;
        return null;
    } catch { return null; }
};

/* --------------------------- lifecycle evaluation -------------------------- */
function evaluatePayability(type, lifecycle) {
    const l = String(lifecycle || '').toUpperCase();
    const t = String(type || '').toUpperCase();
    if (l === 'ACTIVE') return { canPay: true, reason: null, tone: null };
    if (['SUSPENDED','CANCELLED','CANCELED','EXPIRED'].includes(l)) {
        const map = { SUSPENDED: 'Collecte suspendue', CANCELLED: 'Collecte annulée', CANCELED: 'Collecte annulée', EXPIRED: 'Collecte expirée' };
        return { canPay: false, reason: map[l] || 'Paiements indisponibles', tone: 'warn' };
    }
    if (l === 'COMPLETED') {
        return t === 'DONATION'
            ? { canPay: false, reason: 'Objectif atteint — campagne clôturée', tone: 'info' }
            : { canPay: false, reason: 'Demande clôturée (déjà réglée)', tone: 'info' };
    }
    return { canPay: false, reason: 'Paiements indisponibles pour le moment', tone: 'muted' };
}

/* ---------------------------------- page ---------------------------------- */

export default async function Page({ params }) {
    const raw = await fetchPublicLink(params.code);
    if (raw === null) notFound();

    if (raw?.__error) {
        const retryHref = `/p/${encodeURIComponent(params.code)}`;
        return (
            <main className="page">
                <div className="wrap">
                    <HeaderLogo />
                    <section className="card card--plain" style={{ borderColor: '#FECACA', background: '#FEF2F2' }}>
                        <h1 className="h1" style={{ fontSize: 18, marginBottom: 6 }}>Oups…</h1>
                        <p className="p-muted" style={{ color: '#991B1B' }}>{raw.__error || 'Une erreur est survenue.'}</p>
                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                            <a href="/" className="tile">Accueil</a>
                            <a href={retryHref} className="tile">Réessayer</a>
                        </div>
                    </section>
                </div>
            </main>
        );
    }

    const data = normalizeData(raw);
    const isDonation = data.type === 'DONATION';
    const isInvoice  = data.type === 'INVOICE';
    const { canPay, reason } = evaluatePayability(data.type, data.lifecycle);

    // country detect (cookie → headers → default)
    const ck = cookies();
    let countryIso = ck.get('country_iso')?.value?.toUpperCase();
    if (!countryIso) {
        const hdr = headers();
        countryIso =
            hdr.get('x-vercel-ip-country')?.toUpperCase() ||
            hdr.get('cloudfront-viewer-country')?.toUpperCase() ||
            null;
    }
    const detectedCountry = countryIso || 'CD';

    // Donation media
    const ytId = getYouTubeId(data?.metadata?.youtubeUrl);
    const cover = data.image1 || null;
    const otherImages = [data.image2, data.image3, data.image4, data.image5].filter(Boolean);

    // (Optional) invoice items if present
    const items = data.items || [];

    return (
        <main className="page">
            <div className="wrap">

                {/* Brand header */}
                <HeaderLogo />

                {/* Title / creator */}
                <header style={{ marginBottom: 6 }}>
                    <h1 className="h1">
                        {data.title || (isInvoice ? 'Facture' : isDonation ? 'Collecte' : 'Paiement')}
                    </h1>
                    {data.creator && (
                        <div style={{ marginTop: 4, fontSize: 13, display: 'flex', gap: 6, alignItems: 'baseline', flexWrap: 'wrap' }}>
                            <span style={{ color: 'var(--brand-muted)' }}>Created by</span>
                            <strong style={{ color: 'var(--brand-primary)' }}>{data.creator}</strong>
                        </div>
                    )}
                    {!isDonation && data.description && (
                        <p className="p-muted" style={{ whiteSpace: 'pre-wrap' }}>{data.description}</p>
                    )}
                </header>

                {/* Lifecycle banner */}
                {!canPay && (
                    <section className="card card--plain" style={{ borderColor: 'var(--brand-border)', background: '#FFF8F0' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <span style={{ width:10, height:10, borderRadius:5, background:'#F59E0B', flex:'0 0 auto' }} />
                            <strong style={{ color:'#92400E' }}>{reason}</strong>
                        </div>
                    </section>
                )}

                {/* Donation media-first */}
                {isDonation && (
                    <LightboxClient
                        ytId={ytId}
                        cover={cover}
                        otherImages={otherImages}
                        story={data.description}
                        images={[cover, ...otherImages].filter(Boolean)}
                    />
                )}

                {/* Invoice items */}
                {isInvoice && items.length > 0 && (
                    <section className="card card--plain">
                        <h3 className="card-title">Détail</h3>
                        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {items.map((it) => (
                                <div key={it.id || `${it.name}-${Math.random()}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, fontSize: 14 }}>{it.name}</div>
                                        {it.description && <div style={{ color: '#64748B', fontSize: 12 }}>{it.description}</div>}
                                        <div style={{ color: '#64748B', fontSize: 12 }}>
                                            {it.quantity} × {Number(it.unitPrice).toFixed(2)} {data.currency}
                                        </div>
                                    </div>
                                    <div style={{ fontWeight: 800, whiteSpace: 'nowrap' }}>{Number(it.lineTotal).toFixed(2)} {data.currency}</div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Pay form (disabled when not payable) */}
                <PayForm
                    data={data}
                    detectedCountry={detectedCountry}
                    publicCode={params.code}
                    canPay={canPay}
                    disabledReason={reason}
                />

                {/* Endless payments list */}
                <PaymentsFeed publicCode={params.code} currency={data.currency || 'USD'} requestType={data.type} />
            </div>
        </main>
    );
}

/* ------------------------------- subcomponents ------------------------------ */

/** Brand mark header: green rounded square + top-right white dot + “Fondeka”, centered */
function HeaderLogo() {
    return (
        <div
            style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                margin: '2px 0 10px',
            }}
        >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                {/* Green rounded square with top-right white dot */}
                <div
                    aria-hidden="true"
                    style={{
                        position: 'relative',
                        width: 24,
                        height: 24,
                        borderRadius: 8,
                        background: 'var(--brand-primary)',
                        boxShadow: '0 2px 6px rgba(79,128,92,0.20)',
                        flex: '0 0 auto',
                    }}
                >
                    <div
                        style={{
                            position: 'absolute',
                            right: 4,
                            top: 4,
                            width: 6,
                            height: 6,
                            background: '#fff',
                            borderRadius: '50%',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
                        }}
                    />
                </div>
                <div
                    style={{
                        fontWeight: 900,
                        letterSpacing: 0.3,
                        color: 'var(--brand-primary)',
                        fontSize: 16,
                        lineHeight: '16px',
                    }}
                >
                    Fondeka
                </div>
            </div>
        </div>
    );
}
