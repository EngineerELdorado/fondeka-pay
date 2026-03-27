'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { detectPayFormLanguage } from './utils/payform-i18n';

const NOT_FOUND_MESSAGES = {
    en: {
        title: 'Invalid or expired link',
        description: 'This payment link is no longer active. Ask the organizer for a new link.',
        home: 'Back to home',
    },
    fr: {
        title: 'Lien invalide ou expiré',
        description: 'Ce lien de paiement n’est plus actif. Demandez un nouveau lien à l’organisateur.',
        home: 'Retour à l’accueil',
    },
};

export default function NotFound() {
    const [language, setLanguage] = useState('fr');
    const messages = useMemo(() => NOT_FOUND_MESSAGES[language] || NOT_FOUND_MESSAGES.fr, [language]);

    useEffect(() => {
        setLanguage(detectPayFormLanguage());
    }, []);

    return (
        <main className="page">
            <div className="wrap">
                <div className="brand-header">
                    <div className="brand-logo" />
                    <div className="brand-name">Fondeka</div>
                </div>

                <section className="card card--plain">
                    <h1 className="h1" style={{ fontSize: 18, marginBottom: 6 }}>{messages.title}</h1>
                    <p className="p-muted">{messages.description}</p>
                    <div style={{ marginTop: 10 }}>
                        <a href="/" className="tile">{messages.home}</a>
                    </div>
                </section>
            </div>
        </main>
    );
}
