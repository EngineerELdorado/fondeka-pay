'use client';

import { useEffect, useRef, useState } from 'react';

const playUrl = 'https://play.google.com/store/apps/details?id=com.fondeka.app';
const appStoreUrl = 'https://apps.apple.com/cd/app/fondeka/id6757371679';

function getDevicePlatform() {
    if (typeof navigator === 'undefined') {
        return 'other';
    }

    const ua = navigator.userAgent || '';
    const platform = navigator.platform || '';
    const isAndroid = /Android/i.test(ua);
    const isiOS =
        /iPhone|iPad|iPod/i.test(ua) ||
        (platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (isAndroid) {
        return 'android';
    }

    if (isiOS) {
        return 'ios';
    }

    return 'other';
}

function PlayIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#3DDC84" d="M1.5 3.5v17l10-8.5z" />
            <path fill="#0F9D58" d="M21 12L11.5 3.5v17z" />
            <path fill="#FFCD40" d="M21 12l-4.5 2.9L11.5 12l4.9-2.9z" />
            <path fill="#4285F4" d="M1.5 3.5l10 8.5-2 1.5-8-7z" />
        </svg>
    );
}

function AppleIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M16.365 13.23c.03 3.272 2.873 4.363 2.903 4.377-.024.078-.454 1.56-1.506 3.09-.906 1.315-1.85 2.626-3.326 2.652-1.45.026-1.918-.86-3.58-.86-1.661 0-2.179.83-3.548.886-1.425.056-2.576-1.42-3.487-2.73-1.9-2.727-3.358-7.71-1.407-11.082.972-1.68 2.707-2.745 4.608-2.77 1.438-.028 2.797.943 3.58.943.78 0 2.478-1.167 4.185-.995.713.03 2.716.29 3.995 2.177-.104.064-2.384 1.39-2.317 3.312zM14.23 3.98c.767-.926 1.264-2.222 1.123-3.51-1.084.044-2.39.72-3.162 1.646-.696.806-1.304 2.098-1.14 3.357 1.202.094 2.412-.61 3.179-1.493z" />
        </svg>
    );
}

export default function DownloadAppButton({
    label = 'Download app',
    variant = 'default',
    children = null,
    ariaLabel,
    labels = {},
}) {
    const [platform, setPlatform] = useState('other');
    const [open, setOpen] = useState(false);
    const menuRef = useRef(null);

    const qrSize = '180x180';
    const qrPlay = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}&data=${encodeURIComponent(playUrl)}&margin=0`;
    const qrApple = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}&data=${encodeURIComponent(appStoreUrl)}&margin=0`;
    const isImage = variant === 'image';
    const triggerClassName = isImage ? 'download-image-trigger' : 'btn btn--primary hero-btn';
    const triggerContent = children || <span>{label}</span>;

    useEffect(() => {
        setPlatform(getDevicePlatform());
    }, []);

    useEffect(() => {
        const onClick = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setOpen(false);
            }
        };

        document.addEventListener('click', onClick);
        return () => document.removeEventListener('click', onClick);
    }, []);

    if (platform === 'android' || platform === 'ios') {
        const isAndroid = platform === 'android';
        const href = isAndroid ? playUrl : appStoreUrl;
        const Icon = isAndroid ? PlayIcon : AppleIcon;
        const mobileLabel = isAndroid
            ? (labels.mobileAndroid || 'Download for Android')
            : (labels.mobileIos || 'Download for iPhone');

        return (
            <a className={triggerClassName} href={href} target="_blank" rel="noopener noreferrer" aria-label={ariaLabel || mobileLabel}>
                {children ? triggerContent : (
                    <>
                        <Icon />
                        <span>{mobileLabel}</span>
                    </>
                )}
            </a>
        );
    }

    return (
        <div className="download-menu" ref={menuRef}>
            <button
                className={triggerClassName}
                type="button"
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-label={ariaLabel || label}
                onClick={(event) => {
                    event.stopPropagation();
                    setOpen((value) => !value);
                }}
            >
                {triggerContent}
            </button>

            {open && (
                <div className="download-popover" role="dialog" aria-label="Download the Fondeka app">
                    <div className="download-popover__intro">
                        <strong>{labels.popoverTitle || 'Scan and install Fondeka'}</strong>
                        <span>{labels.popoverBody || 'Use the app for payment links, invoices, campaigns, cards, bills, crypto, and more.'}</span>
                    </div>
                    <StoreQr href={playUrl} src={qrPlay} label="Google Play" icon={<PlayIcon />} qrAlt={labels.qrAlt} />
                    <StoreQr href={appStoreUrl} src={qrApple} label="App Store" icon={<AppleIcon />} qrAlt={labels.qrAlt} />
                    <a className="download-popover__store-link" href={playUrl} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
                        {labels.openStore || 'Open store page'}
                    </a>
                </div>
            )}
        </div>
    );
}

function StoreQr({ href, src, label, icon, qrAlt }) {
    return (
        <a className="download-qr-link" href={href} target="_blank" rel="noopener noreferrer">
            <img src={src} alt={`${qrAlt || 'QR code for'} ${label}`} loading="lazy" />
            <span>{icon}{label}</span>
        </a>
    );
}
