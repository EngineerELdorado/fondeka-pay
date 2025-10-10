import React from 'react';
import QRCanvas from './QRCanvas';
import { copyToClipboard } from '../utils/payform-helpers';

export default function CryptoQrModal({ open, onClose, address, amount, networkName, hint }) {
    if (!open) return null;
    return (
        <div role="dialog" aria-modal="true"
             style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
             onClick={onClose}>
            <div onClick={(e)=>e.stopPropagation()}
                 style={{ width:'100%', maxWidth:420, borderRadius:16, background:'#fff', padding:16, boxShadow:'0 20px 40px rgba(0,0,0,0.35)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <h3 className="card-title" style={{ margin:0 }}>Effectuez le paiement</h3>
                    <button onClick={onClose} className="tile" style={{ padding:'6px 10px' }}>Fermer</button>
                </div>

                {hint && (
                    <div style={{ marginTop:10, border:'1px solid var(--brand-border)', background:'var(--brand-primary-soft-2)', borderRadius:10, padding:'8px 10px', color:'#0f172a', fontWeight:700 }}>
                        {hint}
                    </div>
                )}

                <div style={{ display:'flex', flexDirection:'column', gap:12, alignItems:'center', marginTop:12 }}>
                    <QRCanvas text={address || ''} size={240} />

                    <div style={{ textAlign:'center', width:'100%' }}>
                        <div className="label" style={{ marginBottom:6 }}>Réseau</div>
                        <div style={{ fontWeight:800, marginBottom:10 }}>{networkName || '—'}</div>

                        <div className="label" style={{ marginBottom:6 }}>Adresse</div>
                        <div style={{ border:'1px solid var(--brand-border)', borderRadius:10, padding:'10px 12px',
                            fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace',
                            maxWidth:'100%', overflow:'hidden', textOverflow:'ellipsis' }}
                             title={address}>
                            {address || '—'}
                        </div>
                        <div style={{ display:'flex', gap:8, marginTop:10, justifyContent:'center' }}>
                            <button className="tile" onClick={() => copyToClipboard(address)} style={{ padding:'8px 10px' }}>
                                Copier l’adresse
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
