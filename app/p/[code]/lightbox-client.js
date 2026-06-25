'use client';

import React, { useState } from 'react';
import GalleryLightbox from './gallery';
import ReadMore from './readmore';
import ShareButton from "./components/ShareButton";
import { getPayFormMessages, normalizePayFormLanguage } from './utils/payform-i18n';

export default function LightboxClient({ ytId, cover, otherImages = [], story, images = [], currentUrl, isDonation, title, language = 'en' }) {
    const [open, setOpen] = useState(false);
    const [startIndex, setStartIndex] = useState(0);
    const messages = getPayFormMessages(normalizePayFormLanguage(language));

    const onOpenIndex = (i) => { setStartIndex(i); setOpen(true); };

    return (
        <>
            {/* 1) Video */}
            {ytId && (
                <section className="card card--plain">
                    <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', borderRadius: 12, overflow: 'hidden' }}>
                        <iframe
                            src={`https://www.youtube.com/embed/${ytId}`}
                            title={language === 'fr' ? 'Vidéo YouTube' : 'YouTube video'}
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
                        <img src={cover} alt={language === 'fr' ? 'Couverture' : 'Cover image'} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </div>
                </section>
            )}

            {/* 3) Thumbnails for image2..5 (click to open respective index) */}
            {otherImages.length > 0 && (
                <section className="card card--plain" style={{ background: '#fff' }}>
                    <div
                        style={{
                            display: otherImages.length > 3 ? 'grid' : 'grid',
                            gridTemplateColumns: otherImages.length > 3 ? 'repeat(3, 1fr)' : (otherImages.length >= 3 ? '1fr 1fr 1fr' : '1fr 1fr'),
                            gap: 8,
                            overflowX: otherImages.length > 3 ? 'auto' : 'visible',
                            paddingBottom: otherImages.length > 3 ? 4 : 0,
                            gridAutoFlow: otherImages.length > 3 ? 'column' : 'row'
                        }}
                    >
                        {otherImages.map((src, idx) => (
                            <img
                                key={`${src}-${idx}`}
                                src={src}
                                alt={`${language === 'fr' ? 'Image' : 'Image'} ${idx + 2}`}
                                onClick={() => onOpenIndex( (cover ? 1 : 0) + idx )}
                                style={{
                                    width: '100%',
                                    height: 92,
                                    borderRadius: 12,
                                    objectFit: 'cover',
                                    cursor: 'zoom-in',
                                    minWidth: otherImages.length > 3 ? 140 : 'auto'
                                }}
                            />
                        ))}
                    </div>
                </section>
            )}


            {/* Donation-only actions — now BELOW media, centered */}
            {isDonation && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 12, marginBottom: 8 }}>
                    <ShareButton url={currentUrl} title={title} cover={cover} language={language} />
                    <a
                        className="chip donation-action-button donation-action-button--donate"
                        href="#pay-form"
                        aria-label={messages.goToPaymentForm}
                        style={{
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            fontWeight: 800,
                            color: '#fff',
                        }}
                    >
                        {/* Heart/Donate icon */}
                        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M12 21s-6.716-4.594-9.09-7.09C.579 11.56.79 8.27 3.05 6.51a5 5 0 0 1 6.58.57L12 8.58l2.37-1.5a5 5 0 0 1 6.58-.57c2.26 1.76 2.47 5.05.14 7.4C18.716 16.406 12 21 12 21z" fill="currentColor"/>
                        </svg>
                        {messages.donate}
                    </a>
                </div>
            )}


            {/* 4) Story */}
            {story && (
                <section className="card card--plain">
                    <h3 className="card-title" style={{ marginBottom: 6 }}>{language === 'fr' ? 'À propos' : 'About'}</h3>
                    <ReadMore text={story} collapsedChars={320} language={language} />
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
