import React, { useEffect, useRef } from 'react';

export default function QRCanvas({ text = '', size = 240 }) {
    const canvasRef = useRef(null);
    useEffect(() => {
        let mounted = true;
        (async () => {
            if (!canvasRef.current || !text) return;
            const QR = await import('qrcode');
            if (!mounted) return;
            await QR.toCanvas(canvasRef.current, text, {
                errorCorrectionLevel: 'M',
                margin: 2,
                width: size,
                color: { dark: '#000000', light: '#ffffff' },
            });
        })();
        return () => { mounted = false; };
    }, [text, size]);
    return <canvas ref={canvasRef} style={{ width: size, height: size }} />;
}
