export const GROUP_ORDER = ['MOBILE_MONEY', 'CRYPTO', 'CARD', 'BANK_TRANSFER', 'WALLET', 'OTHER'];

export const accordionHeaderStyle = (open) => ({
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

export function labelForType(t, typeLabels = {}) {
    return typeLabels[t] || typeLabels.OTHER || t;
}

export function mapIsoToCallingCode(iso2) {
    const map = { CD:'243', CG:'242', CM:'237', RW:'250', BI:'257', KE:'254', TZ:'255', UG:'256', ZM:'260', ZW:'263', GA:'241', AO:'244' };
    return map[(iso2 || '').toUpperCase()];
}

export function money(n, curr, locale) {
    if (n == null) return '';
    const value = Number(n) || 0;
    const c = String(curr || 'USD').toUpperCase();
    if (c === 'USD') {
        return value.toLocaleString(locale || undefined, { style:'currency', currency:'USD', currencyDisplay:'narrowSymbol', maximumFractionDigits:2 });
    }
    return value.toLocaleString(locale || undefined, { style:'currency', currency:c, maximumFractionDigits:2 });
}

export function formatPhone(e164 = '') {
    if (!e164?.startsWith('+')) return e164 || '';
    const cc = e164.slice(0, 4);
    const rest = e164.slice(4);
    return `${cc} ${rest.replace(/(\d{2,3})(?=\d)/g, '$1 ').trim()}`;
}

export function parseCryptoHint(text) {
    try {
        const amtMatch = text.match(/send\s+([\d.]+\s*\w+)/i);
        const netMatch = text.match(/network\s+([\w-]+)/i);
        return { amount: amtMatch?.[1] || null, network: netMatch?.[1] || null };
    } catch { return {}; }
}

export async function copyToClipboard(text) {
    try { await navigator.clipboard.writeText(text || ''); } catch {}
}

export function prettyError(m = '', messages) {
    const s = String(m || '').toLowerCase();
    if (s.includes('expired') || s.includes('token')) return messages?.sessionExpired || 'Session expired.';
    if (s.includes('idempot')) return messages?.requestConflict || 'Request conflict.';
    return m || messages?.generic || 'Something went wrong.';
}

export function shouldRefreshOnError(message = '') {
    const m = String(message || '').toLowerCase();
    return (
        m.includes('expired') || m.includes('token') ||
        m.includes('idempotency') || m.includes('idempotent') ||
        m.includes('already exists') || m.includes('401') || m.includes('403')
    );
}
