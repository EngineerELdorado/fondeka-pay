// app/p/[code]/page.js
import { API_BASE } from '../../../lib/api';
import PayForm from './payform';

async function fetchPublicLink(code) {
    const res = await fetch(`${API_BASE}/public/payment-requests/${code}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(res.status === 404 ? 'Lien invalide ou expiré.' : 'Impossible de charger la demande.');
    return res.json();
}

export default async function Page({ params }) {
    const data = await fetchPublicLink(params.code);

    return (
        <main className="page">
            <div className="wrap">
                <div className="brand-header">
                    <div className="brand-logo" />
                    <div className="brand-name">Fondeka</div>
                </div>

                <header style={{ marginBottom: 6 }}>
                    <h1 className="h1">{data.title || 'Paiement'}</h1>
                    {data.description && <p className="p-muted">{data.description}</p>}
                </header>

                <PayForm data={data} />
            </div>
        </main>
    );
}
