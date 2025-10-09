// middleware.js
import { NextResponse } from 'next/server';

export function middleware(req) {
    const res = NextResponse.next();

    // Geo headers (Vercel / CloudFront)
    const vercel = req.headers.get('x-vercel-ip-country');              // e.g., "CD"
    const cf     = req.headers.get('cloudfront-viewer-country');        // e.g., "CD"
    const hCountry = (vercel || cf || '').toUpperCase();

    // Set a cookie once so both server & client can read it
    if (hCountry && !req.cookies.get('country_iso')) {
        res.cookies.set('country_iso', hCountry, {
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            sameSite: 'lax',
        });
    }

    return res;
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
