'use client';

import React, { useState, useMemo } from 'react';

/**
 * Clamp long text with a “Lire plus / Lire moins” toggle.
 * @param {string} text
 * @param {number} collapsedChars - how many characters to show when collapsed
 */
export default function ReadMore({ text = '', collapsedChars = 280 }) {
    const [open, setOpen] = useState(false);

    const { head, tail, needsClamp } = useMemo(() => {
        if (!text || text.length <= collapsedChars) {
            return { head: text, tail: '', needsClamp: false };
        }
        return { head: text.slice(0, collapsedChars), tail: text.slice(collapsedChars), needsClamp: true };
    }, [text, collapsedChars]);

    if (!text) return null;

    return (
        <div>
            <p className="p-muted" style={{ whiteSpace: 'pre-wrap', marginTop: 0 }}>
                {open ? text : `${head}${needsClamp ? '…' : ''}`}
            </p>
            {needsClamp && (
                <button
                    type="button"
                    className="tile"
                    onClick={() => setOpen((v) => !v)}
                    style={{ padding: '8px 12px', marginTop: 6 }}
                >
                    {open ? 'Lire moins' : 'Lire plus'}
                </button>
            )}
        </div>
    );
}
