import React, { memo } from 'react';

const SquareGrid  = memo(function SquareGrid({ children }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(88px, 1fr))', gap: 8, width: '100%' }}>
            {children}
        </div>
    );
});

export const SquareTile = memo(function SquareTile({ active, onClick, logoUrl, name, logoSize = 36, disabled }) {
    return (
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
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                minWidth: 0, overflow: 'hidden',
                opacity: disabled ? 0.6 : 1, pointerEvents: disabled ? 'none' : 'auto',
            }}
        >
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
