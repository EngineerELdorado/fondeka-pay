'use client';

import React from 'react';

export default function ShareButton({ url, title, cover }) {
    const text = title ? `Je soutiens « ${title} » sur Fondeka` : 'Je soutiens cette collecte sur Fondeka';

    async function onShare() {
        try {
            // Try Web Share with FILE (best UX if supported + CORS allows fetching the image)
            const files = await tryBuildShareFiles(cover);
            if (files && typeof navigator !== 'undefined' && navigator.canShare?.({ files })) {
                await navigator.share({ title: 'Fondeka', text, url, files });
                return;
            }

            // Fallback: classic Web Share with URL/text (most modern browsers)
            if (typeof navigator !== 'undefined' && navigator.share) {
                await navigator.share({ title: 'Fondeka', text, url });
                return;
            }

            // Final fallback: copy URL to clipboard
            await navigator.clipboard.writeText(url);
            // Use a minimal, non-blocking toast if you want; keeping alert() for simplicity:
            alert('Lien copié dans le presse-papiers');
        } catch {
            // user cancelled or sharing failed — ignore
        }
    }

    return (
        <button
            type="button"
            className="chip"
            onClick={onShare}
            aria-label="Partager"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 800, color: '#4F805C' }}
        >
            {/* share icon */}
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18 8a3 3 0 1 0-2.83-4H15a3 3 0 0 0 0 6c.54 0 1.05-.14 1.5-.38l-6 3a3 3 0 1 0 0 3l6 3A3 3 0 1 0 18 16a3 3 0 0 0-1.5.38l-6-3A3 3 0 0 0 10.5 12l6-3c.45.24.96.38 1.5.38Z" fill="#4F805C"/>
            </svg>
            Share
        </button>
    );
}

/**
 * Try to fetch the cover image and wrap it as a File for Web Share Level 2.
 * Requirements:
 *  - cover must be same-origin or CORS-enabled to allow fetch
 *  - size should be reasonably small (< ~10MB)
 *  - mime must be an image/* type
 */
async function tryBuildShareFiles(cover) {
    try {
        if (!cover) return null;

        const res = await fetch(cover, { mode: 'cors', credentials: 'omit' });
        if (!res.ok) return null;

        const contentType = res.headers.get('content-type') || '';
        if (!contentType.startsWith('image/')) return null;

        // Optional: reject very large images (some platforms fail silently on huge files)
        const contentLength = Number(res.headers.get('content-length') || 0);
        if (contentLength && contentLength > 10 * 1024 * 1024) return null; // 10MB cap

        const blob = await res.blob();
        const ext  = guessExtFromMime(contentType);
        const file = new File([blob], `fondeka-cover${ext}`, { type: contentType });
        return [file];
    } catch {
        return null;
    }
}

function guessExtFromMime(mime) {
    if (mime.includes('png')) return '.png';
    if (mime.includes('webp')) return '.webp';
    if (mime.includes('jpeg') || mime.includes('jpg')) return '.jpg';
    return '';
}
