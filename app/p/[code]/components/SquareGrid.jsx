import React, { memo } from 'react';

const SquareGrid  = memo(function SquareGrid({ children }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(88px, 1fr))', gap: 8, width: '100%' }}>
            {children}
        </div>
    );
});

function getCurrencyBadgeColors(currency) {
    const code = String(currency || '').trim().toUpperCase();

    if (code === 'USD') return { bg: '#DCFCE7', text: '#166534', border: '#BBF7D0' };
    if (code === 'CDF') return { bg: '#DBEAFE', text: '#1D4ED8', border: '#BFDBFE' };
    if (code === 'EUR') return { bg: '#EDE9FE', text: '#6D28D9', border: '#DDD6FE' };
    if (code === 'KES') return { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' };
    if (code === 'GHS') return { bg: '#FCE7F3', text: '#BE185D', border: '#FBCFE8' };

    return { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' };
}

export const SquareTile = memo(function SquareTile({
    active,
    onClick,
    logoUrl,
    name,
    logoSize = 36,
    disabled,
    showCurrencyBadge,
    currency,
}) {
    const badgeCurrency = String(currency || '').trim().toUpperCase();
    const shouldShowBadge = showCurrencyBadge === true && !!badgeCurrency;
    const badgeColors = shouldShowBadge ? getCurrencyBadgeColors(badgeCurrency) : null;

    return (
        <button
            onClick={onClick}
            className={`tile payment-method-tile${active ? ' payment-method-tile--active' : ''}`}
            disabled={disabled}
            style={{
                borderColor: active ? 'var(--brand-primary)' : 'var(--brand-border)',
                background: active ? 'var(--brand-primary-soft)' : '#fff',
                borderRadius: 12,
                width: '100%',
                aspectRatio: '1 / 1',
                padding: 8,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                minWidth: 0, overflow: 'hidden',
                opacity: disabled ? 0.6 : 1, pointerEvents: disabled ? 'none' : 'auto',
            }}
        >
            {shouldShowBadge ? (
                <span
                    className="currency-badge"
                    style={{
                        backgroundColor: badgeColors.bg,
                        color: badgeColors.text,
                        borderColor: badgeColors.border,
                    }}
                >
                    {badgeCurrency}
                </span>
            ) : null}
            {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={name} style={{ width: logoSize, height: logoSize, objectFit: 'contain', borderRadius: 8 }} />
            ) : null}
            <span style={{
                lineHeight: '14px', textAlign: 'center', color: '#0f172a', fontWeight: 600,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', width: '100%',
            }}>
        {name}
      </span>
        </button>
    );
});

export default SquareGrid;
