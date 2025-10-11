// app/layout.js
import './globals.css';

export const metadata = {
    title: 'Fondeka Pay',
    description: 'Paiements via lien / QR – Fondeka',
};

export default function RootLayout({ children }) {
    return (
        <html lang="fr">
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        </head>
        <body>{children}</body>
        </html>
    );
}

function HeaderLogo() {
    return (
        <div
            style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                margin: '2px 0 10px',
            }}
        >
            <div style={{display: 'inline-flex', alignItems: 'center', gap: 10}}>
                {/* Green rounded square with top-right white dot */}
                <div
                    aria-hidden="true"
                    style={{
                        position: 'relative',
                        width: 24,
                        height: 24,
                        borderRadius: 8,
                        background: 'var(--brand-primary)',
                        boxShadow: '0 2px 6px rgba(79,128,92,0.20)',
                        flex: '0 0 auto',
                    }}
                >
                    <div
                        style={{
                            position: 'absolute',
                            right: 4,
                            top: 4,
                            width: 6,
                            height: 6,
                            background: '#fff',
                            borderRadius: '50%',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
                        }}
                    />
                </div>
                <div
                    style={{
                        fontWeight: 900,
                        letterSpacing: 0.3,
                        color: 'var(--brand-primary)',
                        fontSize: 24,
                        lineHeight: '24px',
                    }}
                >
                    Fondeka
                </div>
            </div>
        </div>
    );
}
