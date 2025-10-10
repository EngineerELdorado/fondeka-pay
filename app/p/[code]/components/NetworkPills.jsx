import React, { memo } from 'react';

const NetworkPills = memo(function NetworkPills({ items, selectedId, onSelect, disabled }) {
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
});

export default NetworkPills;
