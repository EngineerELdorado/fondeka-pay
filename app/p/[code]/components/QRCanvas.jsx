import React, { useEffect, useState } from 'react';

export default function QRCanvas({ text = '', size = 240 }) {
    const [dataUrl, setDataUrl] = useState('');
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let mounted = true;
        (async () => {
            const qrText = String(text || '').trim();
            setDataUrl('');
            setFailed(false);
            if (!qrText) return;

            try {
                const QR = await import('qrcode');
                const renderer = QR.default || QR;
                const nextDataUrl = await renderer.toDataURL(qrText, {
                    errorCorrectionLevel: 'M',
                    margin: 2,
                    width: size,
                    color: { dark: '#000000', light: '#ffffff' },
                });
                if (mounted) setDataUrl(nextDataUrl);
            } catch {
                if (mounted) setFailed(true);
            }
        })();
        return () => { mounted = false; };
    }, [text, size]);

    const boxStyle = {
        width: size,
        height: size,
        background: '#fff',
        border: '1px solid var(--brand-border)',
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
        boxSizing: 'border-box',
    };

    if (!String(text || '').trim() || failed) {
        return (
            <div aria-hidden="true" style={boxStyle}>
                <span style={{ color: '#64748B', fontSize: 14, fontWeight: 700 }}>QR unavailable</span>
            </div>
        );
    }

    if (!dataUrl) {
        return (
            <div aria-hidden="true" style={boxStyle}>
                <span style={{ color: '#64748B', fontSize: 14, fontWeight: 700 }}>Generating QR...</span>
            </div>
        );
    }

    return (
        <img
            src={dataUrl}
            alt=""
            aria-hidden="true"
            style={{ ...boxStyle, objectFit: 'contain' }}
        />
    );
}
