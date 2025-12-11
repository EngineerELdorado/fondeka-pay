# Payment Method Widget — Web Implementation Guide (Next.js)

## What the widget does (UX expectations)
- Selector card for method choice (grid/list), with inline phone/network/address inputs that appear contextually.
- Summary block showing amount, fees, and total (or receive value).
- Primary CTA that opens a review surface before committing (unless immediate mode).
- Soft modals for pending, invoice, payout, credit review, success, and errors.
- Visual tone: light surfaces, gentle borders, tiny shadows, rounded corners; clear flow from selector → summary → CTA → modals.

## Data contracts (mirror the mobile widget)
- `type`: `"COLLECTION"`.
- `action`: string identifier for the operation (e.g., `"PAY_REQUEST"`).
- `baseTotal`: number to pay/receive before fees/interest.
- `currency`: currency code (e.g., `USD`, `CDF`).
- `paymentMethod`: `{ id, type, accountRef?, networkId?, name?, label? }`
- `quoteFn(payload)`: async function returning `{ totalToPay, fees, loanInterestRate?, loanInterest?, ... }`.
- `onSubmit(payload)`: async function that triggers the server transaction. Receives `paymentMethod` merged with user inputs (phone/address/network).
- Events/callbacks: `onCompleted`, `onProcessing`, `onError`, `onPayloadBuilt`, `onCloseModal`.

## Step-by-step: Next.js implementation

1) **Flow state (logic can differ)**  
   Port or re-implement the non-UI parts of `usePaymentFlow` so the widget gets the same state shape:
```ts
const {
  pmByType, pmLoading, methods, reload,
  selectedMethod, setSelectedMethod,
  requiresPhone, isCrypto, isCredit,
  phone, setPhone, country, setCountry,
  networks, selectedNetwork, setSelectedNetwork,
  cryptoAddress, setCryptoAddress,
  methodFees, interestRate, interestAmount, finalTotal, dueDateStr,
  submitting, ctaDisabled, handleSubmit, clearInputs,
  pending, setPending,
  cryptoDetails,
  successVisible, setSuccessVisible,
  hardErrorVisible, setHardErrorVisible, errorMsg, errorCode,
  successData,
} = usePaymentFlowWeb({...});
```
Reuse the same params as the mobile hook (`type`, `action`, `baseTotal`, `currency`, `creditDays`, `getMsisdn`, `onSubmit`, `autoSelectFirstNetwork`).

2) **Selector UI (match the look)**
- Card with soft border (`#E4E9E2`), minimal shadow, 16–18px radius on a light page background.
- 2–3 column grid or tidy list with clear selection state.
- Inline inputs:
    - Phone/MSISDN with country picker when `requiresPhone`.
    - Network dropdown when `isCrypto`.
    - Crypto address input when `type === 'PAYOUT'`.
- Spacing similar to mobile: ~14–16px padding, 10–12px gaps, eyebrow + title for the section.

3) **CTA behavior** (same cadence)
- Default/review-first: on press, fetch quote (if needed) then open review modal/drawer.
- If `ctaMode === 'immediate'` → call `handleSubmit` directly.
- If `ctaMode === 'review-first'` or default → call `ensureQuote()` then open review modal/sheet.
- If `disableReview` → submit immediately after dismissing focus.
  Use `combinedDisabled = ctaDisabled || extraCtaDisabled || submitting || !(baseTotal > 0)`.

4) **Quote fetching**  
   Only on CTA press (review-first). Cache by `action|paymentMethod.id|paymentMethod.networkId|baseTotal`. On error, show a small inline message and call `onError({ type: 'QUOTE_ERROR', ... })`.

5) **Review step (drawer/modal)**
- Show method name, phone/MSISDN, network, crypto address (if payout).
- Show fees, interest, and total to pay/receive with the same labels.
- Primary/secondary actions mirroring mobile labels.

6) **Submit**  
   `onSubmit` gets `{ ...payloadFromParent, paymentMethod: { id, type, accountRef, networkId } }`. For airtime, keep the diversion to your airtime flow when `baseTotal > 0`.

7) **Modals (match tone)**
- Light surfaces, subtle border/shadow; centered or sheet-style.
- Pending MM (`pending === 'MM'`) with the same message cadence.
- Crypto invoice (`pending === 'CRYPTO'`) and payout (`pending === 'CRYPTO_PAYOUT'`).
- Credit processing (`pending === 'CREDIT'`).
- Success (unless `disableSuccessModal`).
- Error modal for hard errors.

8) **Callbacks**  
   Keep parity with RN: `onProcessing`, `onCompleted`, `onError`, `onCloseModal`.

9) **Formatting helpers**  
   Use `formatMoney(amount, currency)`; fallback to `${amount} ${currency}`.

## Minimal Next.js wiring example (type=COLLECTION, action=PAY_REQUEST)

```tsx
// app/payments/page.tsx (Next.js 13+)
import { useState, useCallback } from 'react';
import { PaymentWidgetWeb } from '@/components/PaymentWidgetWeb';
import { fetchQuote, submitPayment, fetchMethods } from '@/lib/payments/api';

export default function PaymentsPage() {
  const [methods, setMethods] = useState([]);

  // Load methods server-side or via useEffect
  // setMethods(await fetchMethods());

  return (
    <PaymentWidgetWeb
      type="COLLECTION"
      action="PAY_REQUEST"
      baseTotal={25000}
      currency="CDF"
      methods={methods}
      onSubmit={submitPayment}
      quoteFn={fetchQuote}
      getMsisdn={() => /* pull from profile */ ''}
      labels={{ ctaPay: 'Payer maintenant' }}
      onCompleted={({ finalTotal }) => console.log('Paid', finalTotal)}
      onError={(e) => console.error(e)}
    />
  );
}
```

## Styling cheat sheet (to match the mobile feel)
- Surfaces: `#FBFCFA` / `#FFFFFF` cards on `#F5F7F4` page.
- Borders: `#E4E9E2` hairline; shadows very light (blur ~12, alpha ~0.06).
- Radius: 16–18px for cards; pill for badges.
- Spacing: 14–16px padding in cards; 10–12px gaps; clear vertical rhythm.
- Type: bold titles (700–800), eyebrows at 11px with slight letter spacing, primary text `#102110`, secondary `#6D7A6D`.
- CTA: solid primary `#4F805C`, rounded, generous hit area.
- Keep the sequence: Selector → Summary → CTA → Review → Pending/Success/Error.

By mirroring the hook outputs and the submit/review contract above, you can drop the same business flow into a Next.js UI without changing backend integrations.
