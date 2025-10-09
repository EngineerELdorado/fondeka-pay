'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Simple, dependency-free lightbox gallery.
 * - Thumbnails: you decide how to render; pass onOpen(index) to open.
 * - Modal: fixed overlay, pinch-to-zoom (mobile) via native zoom (double tap to zoom supported by browser),
 *          swipe left/right (touch), ESC/←/→ keys on desktop.
 *
 * Props:
 *  - images: string[]   // list of image URLs (e.g., [image1, image2, ...])
 *  - startIndex?: number
 *  - isOpen: boolean
 *  - onClose: () => void
 *  - onIndexChange?: (i:number) => void
 */
export default function GalleryLightbox({
                                            images = [],
                                            startIndex = 0,
                                            isOpen,
                                            onClose,
                                            onIndexChange,
                                        }) {
    const [index, setIndex] = useState(startIndex);
    const img = images[index] || null;

    useEffect(() => { if (isOpen) setIndex(startIndex); }, [isOpen, startIndex]);

    const prev = useCallback(() => {
        setIndex((i) => {
            const next = (i - 1 + images.length) % images.length;
            onIndexChange?.(next);
            return next;
        });
    }, [images.length, onIndexChange]);

    const next = useCallback(() => {
        setIndex((i) => {
            const next = (i + 1) % images.length;
            onIndexChange?.(next);
            return next;
        });
    }, [images.length, onIndexChange]);

    // Keyboard
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e) => {
            if (e.key === 'Escape') onClose?.();
            if (e.key === 'ArrowLeft') prev();
            if (e.key === 'ArrowRight') next();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onClose, prev, next]);

    // Swipe
    const touchStart = useRef({ x: 0, y: 0, t: 0 });
    const onTouchStart = (e) => {
        const t = e.touches?.[0];
        if (!t) return;
        touchStart.current = { x: t.clientX, y: t.clientY, t: Date.now() };
    };
    const onTouchEnd = (e) => {
        const t = e.changedTouches?.[0];
        if (!t) return;
        const dx = t.clientX - touchStart.current.x;
        const dy = t.clientY - touchStart.current.y;
        const dt = Date.now() - touchStart.current.t;
        if (dt < 500 && Math.abs(dx) > 40 && Math.abs(dy) < 80) {
            if (dx < 0) next();
            else prev();
        }
    };

    if (!isOpen) return null;
    if (!images.length) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
        >
            {/* Container to stop click bubbling on image/body */}
            <div
                onClick={(e) => e.stopPropagation()}
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
                style={{ position: 'relative', width: '100%', maxWidth: 900, padding: '0 16px' }}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    aria-label="Fermer"
                    style={{
                        position: 'absolute', top: 10, right: 18, zIndex: 2,
                        background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none',
                        padding: '8px 10px', borderRadius: 10, cursor: 'pointer'
                    }}
                >
                    ✕
                </button>

                {/* Prev / Next */}
                {images.length > 1 && (
                    <>
                        <button
                            onClick={prev}
                            aria-label="Précédent"
                            style={navBtnStyle('left')}
                        >
                            ‹
                        </button>
                        <button
                            onClick={next}
                            aria-label="Suivant"
                            style={navBtnStyle('right')}
                        >
                            ›
                        </button>
                    </>
                )}

                {/* Image */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', maxHeight: '80dvh' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={img}
                        alt=""
                        style={{
                            maxWidth: '100%', maxHeight: '80dvh', objectFit: 'contain', borderRadius: 12,
                            // Let the browser handle double-tap zoom on mobile
                        }}
                    />
                </div>

                {/* Counter */}
                {images.length > 1 && (
                    <div style={{ textAlign: 'center', color: '#fff', marginTop: 10, fontSize: 13 }}>
                        {index + 1} / {images.length}
                    </div>
                )}
            </div>
        </div>
    );
}

function navBtnStyle(side) {
    const base = {
        position: 'absolute', top: '50%', transform: 'translateY(-50%)',
        background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none',
        width: 40, height: 48, fontSize: 24, lineHeight: '48px',
        borderRadius: 10, cursor: 'pointer', zIndex: 2
    };
    return side === 'left' ? { ...base, left: 8 } : { ...base, right: 8 };
}
