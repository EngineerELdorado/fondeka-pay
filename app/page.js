// app/page.js
export default function Home() {
    return (
        <main className="page page--home">
            <div className="wrap">
                <section className="hero-block">
                    <div aria-hidden className="floating-orb orb-1" />
                    <div aria-hidden className="floating-orb orb-2" />
                    <div className="hero-grid">
                        <div>
                            <HeaderLogo />
                            <div className="hero-badge">Lien + QR en 2 minutes</div>
                            <h1 className="h1" style={{ marginTop: 6, fontSize: 26 }}>
                                Encaissez partout, en un lien
                            </h1>
                            <p className="p-muted" style={{ maxWidth: 420 }}>
                                Partagez un lien ou un QR. Le payeur choisit Mobile Money, carte ou crypto. Vous recevez.
                            </p>

                            <div className="pill-row">
                                <span className="pill">🪙 Collectes</span>
                                <span className="pill">🧾 Factures</span>
                                <span className="pill">🖨️ QR en vitrine</span>
                            </div>

                            <div className="hero-actions">
                                <a className="btn btn--primary hero-btn" href="#download">
                                    Download
                                </a>
                            </div>

                        </div>
                    </div>
                </section>

                <section id="features" className="feature-section card card--plain">
                    <h2 className="card-title">Ce que vous pouvez faire</h2>
                    <p className="p-muted" style={{ marginBottom: 12 }}>
                        Un seul lien, plusieurs rails de paiement, suivi en direct.
                    </p>
                    <div className="feature-grid">
                        <FeatureCard
                            title="Lien + QR"
                            desc="Un lien ou un QR prêt à partager ou afficher."
                        />
                        <FeatureCard
                            title="Multi-méthodes"
                            desc="Mobile Money, carte ou crypto, au choix du payeur."
                        />
                        <FeatureCard
                            title="Suivi en direct"
                            desc="Chaque paiement apparaît dans le fil, sans recharger."
                        />
                    </div>
                </section>

                <section id="how-it-works" className="card card--plain steps-section">
                    <div className="step-row">
                        <div className="step-index">1</div>
                        <div>
                            <div className="card-title">Créez</div>
                            <div className="p-muted">Titre, montant fixe ou libre, images en option.</div>
                        </div>
                    </div>
                    <div className="step-row">
                        <div className="step-index">2</div>
                        <div>
                            <div className="card-title">Partagez</div>
                            <div className="p-muted">Lien ou QR par message, email ou affichage.</div>
                        </div>
                    </div>
                    <div className="step-row">
                        <div className="step-index">3</div>
                        <div>
                            <div className="card-title">Encaissez</div>
                            <div className="p-muted">Le payeur choisit sa méthode; vous voyez les paiements en direct.</div>
                        </div>
                    </div>
                </section>

                <section id="download" className="card card--plain">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div className="card-title">Téléchargez l’application Fondeka</div>
                        <div className="p-muted">Configurez vos liens, affichez les QR et suivez les paiements depuis votre mobile.</div>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <a className="btn btn--primary hero-btn" href="/download">
                                Download
                            </a>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}

function HeaderLogo() {
    return (
        <div className="brand-header">
            <div className="brand-logo" />
            <div className="brand-name">Fondeka</div>
        </div>
    );
}

function FeatureCard({ title, desc }) {
    return (
        <div className="feature-card">
            <div className="feature-dot" />
            <div>
                <div className="card-title" style={{ marginBottom: 4 }}>{title}</div>
                <div className="p-muted" style={{ margin: 0 }}>{desc}</div>
            </div>
        </div>
    );
}
