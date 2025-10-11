'use client';

import React, { useState } from 'react';
import GalleryLightbox from './gallery';
import ReadMore from './readmore';

export default function LightboxClient({ ytId, cover, otherImages = [], story, images = [] }) {
    const [open, setOpen] = useState(false);
    const [startIndex, setStartIndex] = useState(0);

    const onOpenIndex = (i) => { setStartIndex(i); setOpen(true); };

    return (
        <>
            {/* 1) Video */}
            {ytId && (
                <section className="card card--plain">
                    <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', borderRadius: 12, overflow: 'hidden' }}>
                        <iframe
                            src={`https://www.youtube.com/embed/${ytId}`}
                            title="YouTube video"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
                        />
                    </div>
                </section>
            )}

            {/* 2) Cover (clickable) */}
            {cover && (
                <section className="card card--plain" style={{ padding: 0, overflow: 'hidden', cursor: 'zoom-in' }}>
                    <div
                        onClick={() => onOpenIndex(0)}
                        style={{ width: '100%', aspectRatio: '16/9', background: '#F3F8F5' }}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={cover} alt="Couverture" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </div>
                </section>
            )}

            {/* 3) Thumbnails for image2..5 (click to open respective index) */}
            {otherImages.length > 0 && (
                <section className="card card--plain" style={{ background: '#fff' }}>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: otherImages.length >= 3 ? '1fr 1fr 1fr' : '1fr 1fr',
                            gap: 8,
                        }}
                    >
                        {otherImages.map((src, idx) => (
                            <img
                                key={`${src}-${idx}`}
                                src={src}
                                alt={`Image ${idx + 2}`}
                                onClick={() => onOpenIndex( (cover ? 1 : 0) + idx )}
                                style={{ width: '100%', height: 92, borderRadius: 12, objectFit: 'cover', cursor: 'zoom-in' }}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* 4) Story */}
            {story && (
                <section className="card card--plain">
                    <h3 className="card-title" style={{ marginBottom: 6 }}>About</h3>
                    <ReadMore text={story} collapsedChars={320} />
                </section>
            )}

            {/* Lightbox modal */}
            <GalleryLightbox
                images={images}
                startIndex={startIndex}
                isOpen={open}
                onClose={() => setOpen(false)}
                onIndexChange={() => {}}
            />
        </>
    );
}
