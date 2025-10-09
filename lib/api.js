// lib/api.js
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';

export async function http(input, init) {
    const res = await fetch(input, init);
    if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try { const j = await res.json(); msg = j?.message || msg; } catch {}
        throw new Error(msg);
    }
    return res.json();
}

export const idem = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
