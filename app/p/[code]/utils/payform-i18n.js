const PAYFORM_MESSAGES = {
    en: {
        locale: 'en',
        typeLabels: {
            MOBILE_MONEY: 'Mobile Money',
            CRYPTO: 'Crypto',
            CARD: 'Card',
            BANK_TRANSFER: 'Bank transfer',
            WALLET: 'Wallet',
            OTHER: 'Other',
        },
        errors: {
            choosePaymentMethod: 'Please choose a payment method.',
            enterAmount: 'Please enter an amount.',
            minimum: 'Minimum: {amount}',
            maximum: 'Maximum: {amount}',
            missingAmount: 'Amount is missing.',
            invalidMobileMoney: 'Invalid Mobile Money number.',
            chooseNetwork: 'Please choose a network (blockchain).',
            fieldRequired: '{field} is required.',
            publicCodeMissing: 'Public code is missing.',
            tokenUnavailable: 'Token unavailable.',
            feesUnavailable: 'Unable to calculate fees.',
            paymentFailed: 'Payment failed.',
            sessionExpired: 'Session expired. Refreshing the payment page.',
            requestConflict: 'Request conflict. Retrying.',
            generic: 'Something went wrong.',
        },
        fieldLabelFallback: 'Field {index}',
        amountLabel: 'How much do you want to send?',
        minimumDonation: 'Minimum donation: {amount}',
        collectedSoFar: 'Collected so far',
        totalToPay: 'Total to pay',
        amount: 'Amount',
        howToPay: 'How do you want to pay?',
        network: 'Network',
        reviewAndPay: 'Review & Pay',
        calculating: 'Calculating...',
        sending: 'Sending...',
        oops: 'Oops...',
        refreshAndRetry: 'Refresh & retry',
        confirming: 'Confirmation in progress...',
        paymentReceived: 'Payment received. Thank you.',
        paymentFailedStatus: 'Payment failed. Try another method.',
        countryPickerTitle: 'Select a country',
        close: 'Close',
        searchCountry: 'Search country',
        noCountriesFound: 'No countries found.',
        reviewTitle: 'Confirm',
        fees: 'Fees',
        method: 'Method',
        account: 'Account',
        back: 'Back',
        payNow: 'Pay now',
        mobileMoneyPhoneLabel: 'Mobile Money phone',
        countryCodeAriaLabel: 'Country calling code',
        mobileNumberPlaceholder: 'Number (e.g. 970000000)',
        cryptoModalTitle: 'Complete the payment',
        address: 'Address',
        copyAddress: 'Copy address',
        mobileMoneyModalTitle: 'Confirm on your phone',
        mobileMoneyModalMessage: 'We sent a payment request to {hint}. Check the phone linked to this number and approve the transaction.',
        createdBy: 'Created by',
        home: 'Home',
        retry: 'Try again',
        details: 'Details',
        payment: 'Payment',
        collection: 'Fundraiser',
        invoice: 'Invoice',
        donate: 'Pay',
        goToPaymentForm: 'Go to payment form',
        share: 'Share',
        linkCopied: 'Link copied to clipboard',
        readMore: 'Read more',
        readLess: 'Read less',
        anonymousDonor: 'Anonymous donor',
        publicPaymentDescription: 'Payments by link / QR - Fondeka',
        serverError: 'Server error ({status})',
        connectionError: 'Unable to connect to the server.',
        suspendedCollection: 'Collection suspended',
        cancelledCollection: 'Collection cancelled',
        expiredCollection: 'Collection expired',
        goalReached: 'Goal reached - campaign closed',
        requestClosed: 'Request closed (already paid)',
        paymentsUnavailable: 'Payments unavailable right now',
    },
    fr: {
        locale: 'fr',
        typeLabels: {
            MOBILE_MONEY: 'Mobile Money',
            CRYPTO: 'Crypto',
            CARD: 'Carte',
            BANK_TRANSFER: 'Virement',
            WALLET: 'Portefeuille',
            OTHER: 'Autres',
        },
        errors: {
            choosePaymentMethod: 'Veuillez choisir une méthode de paiement.',
            enterAmount: 'Veuillez entrer un montant.',
            minimum: 'Minimum: {amount}',
            maximum: 'Maximum: {amount}',
            missingAmount: 'Montant manquant.',
            invalidMobileMoney: 'Numéro Mobile Money invalide.',
            chooseNetwork: 'Veuillez choisir un réseau (blockchain).',
            fieldRequired: '{field} est requis.',
            publicCodeMissing: 'Code public manquant.',
            tokenUnavailable: 'Token indisponible.',
            feesUnavailable: 'Impossible de calculer les frais.',
            paymentFailed: 'Échec du paiement.',
            sessionExpired: 'Session expirée. Rafraîchissement de la page de paiement.',
            requestConflict: 'Conflit de requête. Nouvelle tentative.',
            generic: 'Une erreur est survenue.',
        },
        fieldLabelFallback: 'Champ {index}',
        amountLabel: 'Combien voulez-vous envoyer ?',
        minimumDonation: 'Don minimum : {amount}',
        collectedSoFar: 'Montant collecté',
        totalToPay: 'Total à payer',
        amount: 'Montant',
        howToPay: 'Comment voulez-vous payer ?',
        network: 'Réseau',
        reviewAndPay: 'Vérifier et payer',
        calculating: 'Calcul en cours...',
        sending: 'Envoi en cours...',
        oops: 'Oups...',
        refreshAndRetry: 'Rafraîchir et réessayer',
        confirming: 'Confirmation en cours...',
        paymentReceived: 'Paiement reçu. Merci.',
        paymentFailedStatus: 'Paiement échoué. Essayez une autre méthode.',
        countryPickerTitle: 'Sélectionnez un pays',
        close: 'Fermer',
        searchCountry: 'Rechercher un pays',
        noCountriesFound: 'Aucun pays trouvé.',
        reviewTitle: 'Confirmer',
        fees: 'Frais',
        method: 'Méthode',
        account: 'Compte',
        back: 'Retour',
        payNow: 'Payer maintenant',
        mobileMoneyPhoneLabel: 'Téléphone Mobile Money',
        countryCodeAriaLabel: 'Indicatif pays',
        mobileNumberPlaceholder: 'Numéro (ex : 970000000)',
        cryptoModalTitle: 'Effectuez le paiement',
        address: 'Adresse',
        copyAddress: 'Copier l’adresse',
        mobileMoneyModalTitle: 'Confirmez sur votre téléphone',
        mobileMoneyModalMessage: 'Nous avons envoyé une demande de paiement à {hint}. Vérifiez le téléphone lié à ce numéro et validez l’opération.',
        createdBy: 'Créé par',
        home: 'Accueil',
        retry: 'Réessayer',
        details: 'Détail',
        payment: 'Paiement',
        collection: 'Collecte',
        invoice: 'Facture',
        donate: 'Payer',
        goToPaymentForm: 'Aller au formulaire de paiement',
        share: 'Partager',
        linkCopied: 'Lien copié dans le presse-papiers',
        readMore: 'Lire plus',
        readLess: 'Lire moins',
        anonymousDonor: 'Donateur anonyme',
        publicPaymentDescription: 'Paiements via lien / QR - Fondeka',
        serverError: 'Erreur serveur ({status})',
        connectionError: 'Connexion au serveur impossible.',
        suspendedCollection: 'Collecte suspendue',
        cancelledCollection: 'Collecte annulée',
        expiredCollection: 'Collecte expirée',
        goalReached: 'Objectif atteint - campagne clôturée',
        requestClosed: 'Demande clôturée (déjà réglée)',
        paymentsUnavailable: 'Paiements indisponibles pour le moment',
    },
};

export function normalizePayFormLanguage(candidate) {
    const normalized = String(candidate || '').toLowerCase();
    if (normalized.startsWith('fr')) return 'fr';
    if (normalized.startsWith('en')) return 'en';
    return 'en';
}

export function detectPayFormLanguageFromHeader(headerValue) {
    const candidates = String(headerValue || '')
        .split(',')
        .map((part) => part.trim().split(';')[0])
        .filter(Boolean);

    for (const candidate of candidates) {
        const language = normalizePayFormLanguage(candidate);
        if (language === 'fr' || language === 'en') return language;
    }

    return 'en';
}

export function detectPayFormLanguage() {
    if (typeof navigator === 'undefined') return 'en';
    const candidates = Array.isArray(navigator.languages) && navigator.languages.length
        ? navigator.languages
        : [navigator.language].filter(Boolean);

    for (const candidate of candidates) {
        const language = normalizePayFormLanguage(candidate);
        if (language === 'fr' || language === 'en') return language;
    }
    return 'en';
}

export function getPayFormMessages(language) {
    return PAYFORM_MESSAGES[normalizePayFormLanguage(language)] || PAYFORM_MESSAGES.en;
}

export function withPublicLanguageHeaders(init = {}, language) {
    const headers = new Headers(init?.headers || undefined);
    headers.set('Accept-Language', normalizePayFormLanguage(language));
    return { ...init, headers };
}

export function getLocalizedBankInstructions(method = {}, language) {
    const locale = normalizePayFormLanguage(language);
    if (locale === 'fr' && method.bankInstructionsFr) return method.bankInstructionsFr;
    if (locale === 'en' && method.bankInstructionsEn) return method.bankInstructionsEn;
    return method.bankInstructions || method.bankInstructionsEn || method.bankInstructionsFr || '';
}

export function interpolate(template, values = {}) {
    return String(template || '').replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
}
