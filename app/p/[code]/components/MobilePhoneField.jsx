import React, { memo, forwardRef } from 'react';

const MobilePhoneField = memo(forwardRef(function MobilePhoneField(
    { callingCode, value, onChangeDigits, disabled = false }, inputRef
) {
    return (
        <div style={{ marginTop: 10 }}>
            <label className="label" style={{ marginBottom: 10 }}>Téléphone Mobile Money</label>
            <div style={{ display: 'flex', gap: 8, minWidth: 0, marginTop: 5 }}>
                <input
                    className="input"
                    style={{ width: 64, flex: '0 0 auto', color: '#0f172a', background: '#F8FAFC'}}
                    value={`+${callingCode}`}
                    readOnly
                    aria-label="Indicatif pays"
                />
                <input
                    ref={inputRef}
                    className="input"
                    type="tel"
                    inputMode="numeric"
                    value={value || ''}
                    placeholder="Numéro (ex: 970000000)"
                    style={{ flex: 1, minWidth: 0 }}
                    maxLength={9}
                    onChange={(e) => {
                        const digits = String(e.currentTarget.value || '').replace(/\D+/g, '').slice(0, 9); // clamp to 9 digits
                        onChangeDigits?.(digits);
                    }}
                    disabled={disabled}
                />
            </div>
        </div>
    );
}));

export default MobilePhoneField;
