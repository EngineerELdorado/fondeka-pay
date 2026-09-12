'use client';

import { useEffect, useMemo, useState } from 'react';
import DownloadAppButton from './DownloadAppButton';
import FundraisingDownloadPreview from './FundraisingDownloadPreview';

const copy = {
    en: {
        navLabel: 'Main navigation',
        brand: 'Fondeka Pay',
        nav: {
            features: 'Features',
            how: 'How it works',
            download: 'Download',
        },
        badge: 'Built for African payment habits',
        title: 'Collect payments with a link.',
        lede: 'Create a crowdfunding page, send a payable invoice, or request a quick payment. Your payer chooses the rail that works for them: Mobile Money, card, or crypto.',
        download: 'Download app',
        downloadNow: 'Download Fondeka now',
        downloadAria: 'Download Fondeka to create a payment link',
        previewAria: 'Download Fondeka to create a fundraising page',
        explore: 'Features',
        paymentOptions: 'Payment options',
        rails: ['Mobile Money', 'Cards', 'Crypto', 'QR codes', 'Payment links', 'Live tracking'],
        featuresKicker: 'One product, three daily jobs',
        featuresTitle: 'Collect like a crowdfunding platform, a creator page, or an invoicing app.',
        useCases: [
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
        ],
        howKicker: 'Designed for the real payment mix',
        howTitle: 'Less chasing, more ways for people to actually pay.',
        howBody: 'Fondeka Pay keeps the request simple for you and flexible for the payer, whether they are nearby, across the continent, or in the diaspora.',
        steps: [
            {
                title: 'Create the request',
                desc: 'Choose a campaign, invoice, or quick request. Add a fixed amount, free amount, images, and a useful description.',
            },
            {
                title: 'Share the link or QR',
                desc: 'Send it on WhatsApp, add it to a bio, print the QR, or place it in front of customers.',
            },
            {
                title: 'Track every payment',
                desc: 'Follow contributions and paid invoices from your phone without refreshing or reconciling screenshots.',
            },
        ],
        railsKicker: 'African context first',
        railsTitle: 'Payment pages that understand Mobile Money, cards, crypto, QR sharing, and cross-border supporters.',
        finalTitle: 'Start collecting with Fondeka Pay.',
        finalBody: 'Create your first payment link from the mobile app, then share it anywhere your people already are.',
        mobileAndroid: 'Download for Android',
        mobileIos: 'Download for iPhone',
        popoverTitle: 'Scan and install Fondeka',
        popoverBody: 'Use the app for payment links, invoices, campaigns, cards, bills, crypto, and more.',
        openStore: 'Open store page',
        qrAlt: 'QR code for',
        language: 'Language',
    },
    fr: {
        navLabel: 'Navigation principale',
        brand: 'Fondeka Pay',
        nav: {
            features: 'Fonctionnalites',
            how: 'Comment ca marche',
            download: 'Telecharger',
        },
        badge: 'Pense pour les habitudes de paiement africaines',
        title: 'Encaissez avec un lien.',
        lede: 'Creez une page de collecte, envoyez une facture payable ou demandez un paiement rapide. Le payeur choisit le moyen qui lui convient: Mobile Money, carte ou crypto.',
        download: "Telecharger l'app",
        downloadNow: 'Telecharger Fondeka maintenant',
        downloadAria: 'Telecharger Fondeka pour creer un lien de paiement',
        previewAria: 'Telecharger Fondeka pour creer une collecte de fonds',
        explore: 'Voir',
        paymentOptions: 'Options de paiement',
        rails: ['Mobile Money', 'Cartes', 'Crypto', 'Codes QR', 'Liens de paiement', 'Suivi en direct'],
        featuresKicker: 'Un produit, trois usages quotidiens',
        featuresTitle: 'Encaissez comme une plateforme de collecte, une page createur ou une app de facturation.',
        useCases: [
            {
                eyebrow: 'Collecte',
                title: 'Lancez une collecte communautaire',
                desc: 'Collectez pour les frais scolaires, la sante, les evenements, les projets religieux, l’aide de la diaspora ou les initiatives locales.',
                meta: 'Objectif ouvert, progression publique, messages des contributeurs',
            },
            {
                eyebrow: 'Factures',
                title: 'Envoyez une facture payable',
                desc: 'Creez une demande professionnelle avec un montant fixe, du contexte et une page de paiement claire que le client peut ouvrir partout.',
                meta: 'Montant fixe, suivi du statut, partage facile',
            },
            {
                eyebrow: 'Demandes rapides',
                title: 'Demandez un paiement en secondes',
                desc: 'Partagez un lien ou un QR pour les pourboires, acomptes, paiements sur table, ventes sociales ou services ponctuels.',
                meta: 'Lien, QR, Mobile Money, carte, crypto',
            },
        ],
        howKicker: 'Adapte au vrai mix de paiement',
        howTitle: 'Moins de relances, plus de facons de payer.',
        howBody: 'Fondeka Pay garde la demande simple pour vous et flexible pour le payeur, qu’il soit a cote, ailleurs en Afrique ou dans la diaspora.',
        steps: [
            {
                title: 'Creez la demande',
                desc: 'Choisissez une collecte, une facture ou une demande rapide. Ajoutez un montant fixe ou libre, des images et une description utile.',
            },
            {
                title: 'Partagez le lien ou le QR',
                desc: 'Envoyez-le sur WhatsApp, ajoutez-le a une bio, imprimez le QR ou affichez-le devant vos clients.',
            },
            {
                title: 'Suivez chaque paiement',
                desc: 'Suivez les contributions et factures payees depuis votre telephone, sans captures d’ecran a reconcilier.',
            },
        ],
        railsKicker: 'Contexte africain d’abord',
        railsTitle: 'Des pages de paiement qui comprennent Mobile Money, cartes, crypto, QR et supporters transfrontaliers.',
        finalTitle: 'Commencez a encaisser avec Fondeka Pay.',
        finalBody: 'Creez votre premier lien de paiement dans l’app mobile, puis partagez-le la ou vos proches et clients sont deja.',
        mobileAndroid: 'Telecharger pour Android',
        mobileIos: 'Telecharger pour iPhone',
        popoverTitle: 'Scannez et installez Fondeka',
        popoverBody: 'Utilisez l’app pour les liens de paiement, factures, collectes, cartes, factures, crypto et plus encore.',
        openStore: 'Ouvrir la page du store',
        qrAlt: 'Code QR pour',
        language: 'Langue',
    },
};

function detectLanguage() {
    if (typeof window === 'undefined') {
        return 'en';
    }

    const params = new URLSearchParams(window.location.search);
    const queryLang = params.get('lang');
    const browserLang = navigator.languages?.[0] || navigator.language || 'en';
    return (queryLang || browserLang).toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

export default function Home() {
    const [language, setLanguageState] = useState('en');
    const t = useMemo(() => copy[language] || copy.en, [language]);

    useEffect(() => {
        setLanguageState(detectLanguage());
    }, []);

    const setLanguage = (nextLanguage) => {
        setLanguageState(nextLanguage);
        const url = new URL(window.location.href);
        url.searchParams.set('lang', nextLanguage);
        window.history.pushState({}, '', url);
        document.documentElement.lang = nextLanguage;
    };

    return (
        <main className="page page--home">
            <div className="home-shell">
                <nav className="home-nav" aria-label={t.navLabel}>
                    <HeaderLogo brand={t.brand} />
                    <div className="home-nav__links">
                        <a href="#features">{t.nav.features}</a>
                        <a href="#how-it-works">{t.nav.how}</a>
                        <a href="#download">{t.nav.download}</a>
                        <div className="language-switcher" aria-label={t.language}>
                            <button type="button" className={language === 'en' ? 'is-active' : ''} onClick={() => setLanguage('en')}>EN</button>
                            <button type="button" className={language === 'fr' ? 'is-active' : ''} onClick={() => setLanguage('fr')}>FR</button>
                        </div>
                    </div>
                </nav>

                <section className="home-hero">
                    <div className="home-hero__copy">
                        <div className="hero-badge"><span aria-hidden="true">✦</span>{t.badge}</div>
                        <h1 className="home-title">{t.title}</h1>
                        <p className="home-lede">{t.lede}</p>
                        <div className="hero-actions">
                            <DownloadAppButton
                                variant="hero"
                                label={t.download}
                                ariaLabel={t.downloadAria}
                                labels={t}
                            />
                            <a className="btn hero-secondary" href="#features">
                                {t.explore}
                            </a>
                        </div>
                        <div className="home-trust-row" aria-label={t.paymentOptions}>
                            {t.rails.slice(0, 3).map((rail) => (
                                <span key={rail}>{rail}</span>
                            ))}
                        </div>
                    </div>

                    <FundraisingDownloadPreview language={language} ariaLabel={t.previewAria} labels={t} />
                </section>
            </div>

            <section id="features" className="home-band">
                <div className="home-section-head">
                    <span className="section-kicker">{t.featuresKicker}</span>
                    <h2>{t.featuresTitle}</h2>
                </div>
                <div className="use-case-grid">
                    {t.useCases.map((item) => (
                        <FeatureCard key={item.eyebrow} {...item} />
                    ))}
                </div>
            </section>

            <section id="how-it-works" className="home-band home-band--split">
                <div className="home-section-head">
                    <span className="section-kicker">{t.howKicker}</span>
                    <h2>{t.howTitle}</h2>
                    <p>{t.howBody}</p>
                </div>
                <div className="workflow-list">
                    {t.steps.map((step, index) => (
                        <Step key={step.title} number={String(index + 1)} title={step.title} desc={step.desc} />
                    ))}
                </div>
            </section>

            <section className="home-band rails-band">
                <div className="rail-copy">
                    <span className="section-kicker">{t.railsKicker}</span>
                    <h2>{t.railsTitle}</h2>
                </div>
                <div className="rail-grid">
                    {t.rails.map((rail) => (
                        <span key={rail}>{rail}</span>
                    ))}
                </div>
            </section>

            <section id="download" className="home-band download-band">
                <div>
                    <HeaderLogo compact brand={t.brand} />
                    <h2>{t.finalTitle}</h2>
                    <p>{t.finalBody}</p>
                </div>
                <DownloadAppButton label={t.downloadNow} ariaLabel={t.downloadAria} labels={t} />
            </section>
        </main>
    );
}

function HeaderLogo({ compact = false, brand }) {
    return (
        <div className={compact ? 'brand-header brand-header--compact' : 'brand-header'}>
            <div className="brand-logo" aria-hidden="true" />
            <div className="brand-name">{brand}</div>
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
