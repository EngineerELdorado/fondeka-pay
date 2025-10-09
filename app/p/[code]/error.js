'use client';

import React from 'react';

export default function Error({ error, reset }) {
    return (
        <main className="page">
            <div className="wrap">
                <div className="brand-header">
                    <div className="brand-logo" />
                    <div className="brand-name">Fondeka</div>
                </div>

                <section className="card card--plain" style={{ borderColor: '#FECACA', background: '#FEF2F2' }}>
                    <h1 className="h1" style={{ fontSize: 18, marginBottom: 6 }}>Une erreur est survenue</h1>
                    <p className="p-muted" style={{ color: '#991B1B' }}>
                        {error?.message || 'Veuillez réessayer.'}
                    </p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button className="tile" onClick={() => reset()}>Réessayer</button>
                        <a href="/" className="tile">Accueil</a>
                    </div>
                </section>
            </div>
        </main>
    );
}
