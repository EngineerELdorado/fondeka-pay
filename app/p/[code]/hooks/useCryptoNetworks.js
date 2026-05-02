import { useEffect, useState } from 'react';
import {API_BASE} from "../../../../lib/api";
import { withPublicLanguageHeaders } from '../utils/payform-i18n';

export default function useCryptoNetworks(isCrypto, methodId, language) {
    const [networks, setNetworks] = useState([]);
    const [networkId, setNetworkId] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        let mounted = true;
        if (!isCrypto || !methodId) { setNetworks([]); setNetworkId(null); return; }
        (async () => {
            try {
                const res = await fetch(
                    `${API_BASE}/public/payment-requests/payment-methods/${methodId}/networks`,
                    withPublicLanguageHeaders({ cache: 'no-store' }, language)
                );
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const nets = await res.json();
                const arr = Array.isArray(nets) ? nets : [];
                if (!mounted) return;
                setNetworks(arr);
                setNetworkId(arr[0]?.id ?? null);
            } catch (e) {
                if (mounted) setError(e?.message || 'Impossible de charger les réseaux crypto.');
            }
        })();
        return () => { mounted = false; };
    }, [isCrypto, language, methodId]);

    return { networks, networkId, setNetworkId, error };
}
