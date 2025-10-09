// app/layout.js
import './globals.css';

export const metadata = {
    title: 'Fondeka Pay',
    description: 'Paiements via lien / QR – Fondeka',
};

export default function RootLayout({ children }) {
    return (
        <html lang="fr">
        <body>{children}</body>
        </html>
    );
}
