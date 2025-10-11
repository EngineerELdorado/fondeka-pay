'use client';

import React from 'react';

export default function ShareButton({ url, title, cover }) {
    const text = title ? `Je soutiens « ${title} » sur Fondeka` : 'Je soutiens cette collecte sur Fondeka';

    async function onShare() {
        try {
            if (navigator.share) {
                // Some browsers ignore images; OG/Twitter meta (already set server-side) handles preview.
                await navigator.share({ title: 'Fondeka', text, url });
            } else {
                await navigator.clipboard.writeText(url);
                alert('Lien copié dans le presse-papiers');
            }
        } catch {
            // user cancelled or share failed; no-op
        }
    }

    return (
        <button
            type="button"
            className="chip"
            onClick={onShare}
            aria-label="Partager"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 800, color:'#4F805C' }}
        >
            {/* share icon */}
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18 8a3 3 0 1 0-2.83-4H15a3 3 0 0 0 0 6c.54 0 1.05-.14 1.5-.38l-6 3a3 3 0 1 0 0 3l6 3A3 3 0 1 0 18 16a3 3 0 0 0-1.5.38l-6-3A3 3 0 0 0 10.5 12l6-3c.45.24.96.38 1.5.38Z" fill="#4F805C"/>
            </svg>
            Share
        </button>
    );
}
