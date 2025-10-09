/** @type {import('next').NextConfig} */
const nextConfig = {
    async redirects() {
        return [
            { source: '/:lang(fr|en)', destination: '/', permanent: false },
            { source: '/:lang(fr|en)/:path*', destination: '/:path*', permanent: false },
        ];
    },
    headers: async () => ([
        {
            source: '/:path*',
            headers: [
                { key: 'X-Frame-Options', value: 'DENY' },
                { key: 'X-Content-Type-Options', value: 'nosniff' },
                { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
            ],
        },
    ]),
};

module.exports = nextConfig;
