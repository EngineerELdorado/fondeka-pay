'use client';

import Image from 'next/image';
import fundraisingEnglish from '../assets/fundraising_english.jpg';
import fundraisingFrench from '../assets/fundraising_french.jpg';
import DownloadAppButton from './DownloadAppButton';

export default function FundraisingDownloadPreview({ language = 'en', ariaLabel, labels }) {
    const isFrench = language === 'fr';
    const image = isFrench ? fundraisingFrench : fundraisingEnglish;
    const alt = isFrench
        ? "Apercu d'une page de collecte de fonds Fondeka Pay"
        : 'Preview of a Fondeka Pay fundraising page';

    return (
        <DownloadAppButton variant="image" ariaLabel={ariaLabel} labels={labels}>
            <Image
                src={image}
                alt={alt}
                className="fundraising-preview__image"
                sizes="(max-width: 960px) 560px, 420px"
                priority
            />
        </DownloadAppButton>
    );
}
