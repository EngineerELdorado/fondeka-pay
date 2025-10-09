// app/p/[code]/not-found.js
export default function NotFound() {
    return (
        <main className="page">
            <div className="wrap">
                <div className="brand-header">
                    <div className="brand-logo" />
                    <div className="brand-name">Fondeka</div>
                </div>

                <section className="card card--plain">
                    <h1 className="h1" style={{ fontSize: 18, marginBottom: 6 }}>Lien invalide ou expiré</h1>
                    <p className="p-muted">Ce lien de paiement n’est plus actif. Demandez un nouveau lien à l’organisateur.</p>
                    <div style={{ marginTop: 10 }}>
                        <a href="/" className="tile">Retour à l’accueil</a>
                    </div>
                </section>
            </div>
        </main>
    );
}
