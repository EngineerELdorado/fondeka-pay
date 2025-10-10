import { useEffect, useState } from 'react';
import { GROUP_ORDER } from '../utils/payform-helpers';
import {API_BASE} from "../../../../lib/api";

export default function usePaymentMethods(countryCode) {
    const [methods, setMethods] = useState([]);
    const [grouped, setGrouped] = useState({});
    const [methodId, setMethodId] = useState(null);     // start with NO selection
    const [error, setError] = useState(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const res = await fetch(
                    `${API_BASE}/public/payment-requests/payment-methods?type=COLLECTION&countryCode=${encodeURIComponent(countryCode)}`,
                    { cache: 'no-store' }
                );
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const list = await res.json();
                const arr = Array.isArray(list) ? list : [];
                if (!mounted) return;
                setMethods(arr);

                const g = arr.reduce((acc, m) => {
                    const t = m.type || 'OTHER'; (acc[t] ||= []).push(m); return acc;
                }, {});
                const ordered = {};
                GROUP_ORDER.forEach(t => { if (g[t]?.length) ordered[t] = g[t]; });
                Object.keys(g).forEach(t => { if (!ordered[t]) ordered[t] = g[t]; });
                setGrouped(ordered);

                // IMPORTANT: Do NOT auto-select any method; user must expand and pick one.
                setMethodId(null);
            } catch (e) {
                if (mounted) setError(e?.message || 'Impossible de charger les méthodes de paiement.');
            }
        })();
        return () => { mounted = false; };
    }, [countryCode]);

    return { methods, grouped, methodId, setMethodId, error };
}
