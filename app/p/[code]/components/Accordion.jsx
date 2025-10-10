import React, { memo } from 'react';
import { accordionHeaderStyle } from '../utils/payform-helpers';

function ChevronDown({ size = 18, color = '#475569' }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 9l6 6 6-6" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

const Accordion = memo(function Accordion({ title, typeKey, open, onToggle, disabled, children }) {
    return (
        <section className="card card--plain" style={{ background: '#fff' }}>
            <button
                type="button"
                onClick={() => onToggle(typeKey)}
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
});

export default Accordion;
