import React from 'react';
import { formatPhone } from '../utils/payform-helpers';

export default function MobileMoneyModal({ open, onClose, number, hint, onRefresh, messages }) {
    if (!open) return null;
    const formatted = formatPhone(number);
    const highlightedTarget = hint || formatted || '';
    const messageParts = messages.mobileMoneyModalMessage.split('{hint}');
    return (
        <div role="dialog" aria-modal="true"
             style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
             onClick={onClose}>
            <div onClick={(e)=>e.stopPropagation()}
                 style={{ width:'100%', maxWidth:420, borderRadius:16, background:'#fff', padding:16, boxShadow:'0 20px 40px rgba(0,0,0,0.35)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <h3 className="card-title" style={{ margin: 0 }}>{messages.mobileMoneyModalTitle}</h3>
                    <button onClick={onClose} className="tile" style={{ padding: '6px 10px' }}>{messages.close}</button>
                </div>

                <div style={{ marginTop: 12 }}>
                    <p className="p-muted" style={{ marginTop: 10 }}>
                        {messageParts[0]}
                        {highlightedTarget ? <strong style={{ color: 'var(--brand-primary)' }}>{highlightedTarget}</strong> : null}
                        {messageParts[1]}
                    </p>

                    {/*{hint && <p className="p-muted" style={{ marginTop: 6 }}>{hint}</p>}*/}
                </div>
            </div>
        </div>
    );
}
