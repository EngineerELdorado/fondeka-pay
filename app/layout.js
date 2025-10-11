// app/layout.js
import './globals.css';

export const metadata = {
    metadataBase: new URL('https://pay.fondeka.com'),
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
