import React from 'react';
import { copyToClipboard, formatPhone } from '../utils/payform-helpers';

export default function MobileMoneyModal({ open, onClose, number, hint, onRefresh }) {
    if (!open) return null;
    const formatted = formatPhone(number);
    return (
        <div role="dialog" aria-modal="true"
             style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
             onClick={onClose}>
            <div onClick={(e)=>e.stopPropagation()}
                 style={{ width:'100%', maxWidth:420, borderRadius:16, background:'#fff', padding:16, boxShadow:'0 20px 40px rgba(0,0,0,0.35)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <h3 className="card-title" style={{ margin: 0 }}>Confirmez sur votre téléphone</h3>
                    <button onClick={onClose} className="tile" style={{ padding: '6px 10px' }}>Fermer</button>
                </div>

                <div style={{ marginTop: 12 }}>


                    <p className="p-muted" style={{ marginTop: 10 }}>
                        Nous avons envoyé une demande de paiement à{' '}
                        <strong style={{ color: 'var(--brand-primary)' }}>{formatted || number || '—'}</strong>.
                        Verifiez votre telephone qui heberge ce numero et validez l’opération.
                    </p>

                    {hint && <p className="p-muted" style={{ marginTop: 6 }}>{hint}</p>}
                </div>
            </div>
        </div>
    );
}
