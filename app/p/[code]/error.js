'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { detectPayFormLanguage } from './utils/payform-i18n';

const ERROR_MESSAGES = {
    en: {
        title: 'Something went wrong',
        fallback: 'Please try again.',
        retry: 'Try again',
        home: 'Home',
    },
    fr: {
        title: 'Une erreur est survenue',
        fallback: 'Veuillez réessayer.',
        retry: 'Réessayer',
        home: 'Accueil',
    },
};

export default function Error({ error, reset }) {
    const [language, setLanguage] = useState('fr');
    const messages = useMemo(() => ERROR_MESSAGES[language] || ERROR_MESSAGES.fr, [language]);

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

                <section className="card card--plain" style={{ borderColor: '#FECACA', background: '#FEF2F2' }}>
                    <h1 className="h1" style={{ fontSize: 18, marginBottom: 6 }}>{messages.title}</h1>
                    <p className="p-muted" style={{ color: '#991B1B' }}>
                        {error?.message || messages.fallback}
                    </p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button className="tile" onClick={() => reset()}>{messages.retry}</button>
                        <a href="/" className="tile">{messages.home}</a>
                    </div>
                </section>
            </div>
        </main>
    );
}
