import DownloadAppButton from './DownloadAppButton';

const useCases = [
    {
        eyebrow: 'Crowdfunding',
        title: 'Launch a community collection',
        desc: 'Raise money for school fees, medical support, events, church projects, diaspora help, or neighborhood initiatives.',
        meta: 'Open goal, public progress, payer messages',
    },
    {
        eyebrow: 'Invoices',
        title: 'Send a payable invoice link',
        desc: 'Create a professional request with a fixed amount, due context, and a clean payment page your client can open anywhere.',
        meta: 'Fixed amount, status tracking, easy sharing',
    },
    {
        eyebrow: 'Quick requests',
        title: 'Ask for money in seconds',
        desc: 'Share one link or QR for tips, deposits, table payments, social commerce, or one-off services.',
        meta: 'Link, QR, Mobile Money, card, crypto',
    },
];

const rails = ['Mobile Money', 'Cards', 'Crypto', 'QR codes', 'Payment links', 'Live tracking'];

export default function Home() {
    return (
        <main className="page page--home">
            <div className="home-shell">
                <nav className="home-nav" aria-label="Navigation principale">
                    <HeaderLogo />
                    <div className="home-nav__links">
                        <a href="#features">Features</a>
                        <a href="#how-it-works">How it works</a>
                        <a href="#download">Download</a>
                    </div>
                </nav>

                <section className="home-hero">
                    <div className="home-hero__copy">
                        <div className="hero-badge">Built for African payment habits</div>
                        <h1 className="home-title">
                            Collect payments with a link.
                        </h1>
                        <p className="home-lede">
                            Create a crowdfunding page, send a payable invoice, or request a quick payment. Your payer chooses the rail that works for them: Mobile Money, card, or crypto.
                        </p>
                        <div className="hero-actions">
                            <DownloadAppButton variant="hero" />
                            <a className="btn hero-secondary" href="#features">
                                Explore features
                            </a>
                        </div>
                        <div className="home-trust-row" aria-label="Payment options">
                            {rails.slice(0, 3).map((rail) => (
                                <span key={rail}>{rail}</span>
                            ))}
                        </div>
                    </div>

                    <div className="payment-preview" aria-label="Example Fondeka Pay page preview">
                        <div className="payment-preview__top">
                            <div>
                                <div className="preview-label">Community fundraiser</div>
                                <strong>Support Samuel's tuition</strong>
                            </div>
                            <div className="preview-qr" aria-hidden="true">
                                <span />
                                <span />
                                <span />
                                <span />
                            </div>
                        </div>
                        <div className="preview-progress">
                            <div className="preview-progress__bar">
                                <span />
                            </div>
                            <div className="preview-progress__text">
                                <strong>$2,840 raised</strong>
                                <span>$4,000 goal</span>
                            </div>
                        </div>
                        <div className="preview-methods">
                            <span>MTN MoMo</span>
                            <span>Airtel Money</span>
                            <span>Visa</span>
                            <span>USDT</span>
                        </div>
                        <div className="preview-payments">
                            <PreviewPayment name="Jean" amount="$40" note="For books" />
                            <PreviewPayment name="Nadia" amount="$25" note="From Brussels" />
                            <PreviewPayment name="Musa" amount="$100" note="Keep going" />
                        </div>
                    </div>
                </section>
            </div>

            <section id="features" className="home-band">
                <div className="home-section-head">
                    <span className="section-kicker">One product, three daily jobs</span>
                    <h2>Collect like a crowdfunding platform, a creator page, or an invoicing app.</h2>
                </div>
                <div className="use-case-grid">
                    {useCases.map((item) => (
                        <FeatureCard key={item.eyebrow} {...item} />
                    ))}
                </div>
            </section>

            <section id="how-it-works" className="home-band home-band--split">
                <div className="home-section-head">
                    <span className="section-kicker">Designed for the real payment mix</span>
                    <h2>Less chasing, more ways for people to actually pay.</h2>
                    <p>
                        Fondeka Pay keeps the request simple for you and flexible for the payer, whether they are nearby, across the continent, or in the diaspora.
                    </p>
                </div>
                <div className="workflow-list">
                    <Step number="1" title="Create the request" desc="Choose a campaign, invoice, or quick request. Add a fixed amount, free amount, images, and a useful description." />
                    <Step number="2" title="Share the link or QR" desc="Send it on WhatsApp, add it to a bio, print the QR, or place it in front of customers." />
                    <Step number="3" title="Track every payment" desc="Follow contributions and paid invoices from your phone without refreshing or reconciling screenshots." />
                </div>
            </section>

            <section className="home-band rails-band">
                <div className="rail-copy">
                    <span className="section-kicker">African context first</span>
                    <h2>Payment pages that understand Mobile Money, cards, crypto, QR sharing, and cross-border supporters.</h2>
                </div>
                <div className="rail-grid">
                    {rails.map((rail) => (
                        <span key={rail}>{rail}</span>
                    ))}
                </div>
            </section>

            <section id="download" className="home-band download-band">
                <div>
                    <HeaderLogo compact />
                    <h2>Start collecting with Fondeka Pay.</h2>
                    <p>Create your first payment link from the mobile app, then share it anywhere your people already are.</p>
                </div>
                <DownloadAppButton label="Download Fondeka now" />
            </section>
        </main>
    );
}

function HeaderLogo({ compact = false }) {
    return (
        <div className={compact ? 'brand-header brand-header--compact' : 'brand-header'}>
            <div className="brand-logo" aria-hidden="true" />
            <div className="brand-name">Fondeka Pay</div>
        </div>
    );
}

function FeatureCard({ eyebrow, title, desc, meta }) {
    return (
        <article className="feature-card">
            <div className="feature-card__eyebrow">{eyebrow}</div>
            <h3>{title}</h3>
            <p>{desc}</p>
            <div className="feature-card__meta">{meta}</div>
        </article>
    );
}

function Step({ number, title, desc }) {
    return (
        <div className="step-row">
            <div className="step-index">{number}</div>
            <div>
                <h3>{title}</h3>
                <p>{desc}</p>
            </div>
        </div>
    );
}

function PreviewPayment({ name, amount, note }) {
    return (
        <div className="preview-payment">
            <div>
                <strong>{name}</strong>
                <span>{note}</span>
            </div>
            <strong>{amount}</strong>
        </div>
    );
}
