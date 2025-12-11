# Public Fees API

Guide for frontend / web integrations that need to quote customer-facing fees without authentication. This is a thin wrapper over `FeeService` with the same calculation rules used by the app.

## Endpoint
- Base path: `${app.api.baseUrls.public}/fees` (default `/public/fees`)
- Method: `GET`
- Auth: none (public route)

## Query params
- `action` (required, enum `Action`): see list below.
- `amount` (required, decimal): transaction amount; must be `>= 0`.
- `paymentMethodId` (optional, long): strongly recommended to pick the right provider; see fallback rules.

### Action enum (strings)
`FUND_WALLET`, `WITHDRAW_FROM_WALLET`, `REFUND_TO_WALLET`, `PAY_INTERNET_BILL`, `PAY_TV_SUBSCRIPTION`, `PAY_ELECTRICITY_BILL`, `PAY_WATER_BILL`, `LOAN_REQUEST`, `LOAN_DISBURSEMENT`, `REPAY_LOAN`, `FUND_CARD`, `WITHDRAW_FROM_CARD`, `BUY_CARD`, `CARD_ONLINE_PAYMENT`, `BUY_CRYPTO`, `SELL_CRYPTO`, `RECEIVE_CRYPTO`, `SEND_CRYPTO`, `SWAP_CRYPTO`, `REQUEST_PAYMENT`, `PAY_REQUEST`, `E_SIM_PURCHASE`, `E_SIM_TOPUP`, `SEND_AIRTIME`, `SEND_DATA_BUNDLES`, `BUY_GIFT_CARD`, `PAY_NETFLIX`, `OTHER`.

## Response (`200 OK`)
Shape: `FeeResource`
```json
{
  "fees": 3.50,
  "loanInterestRate": 0.05,
  "loanInterest": 5.00,
  "totalToPay": 108.50,
  "feesPercentage": 0.02
}
```
- `fees`: sum of provider + our flat and percentage fees.
- `feesPercentage`: combined percentage expressed as a fraction (0.02 = 2%).
- `loanInterestRate`: fraction (0.05 = 5%). Applies when the payment method type is CREDIT or when `action=LOAN_REQUEST`.
- `loanInterest`: amount derived from `loanInterestRate * amount`.
- `totalToPay`: `amount + fees + loanInterest`, rounded to 2 decimals.

## Calculation rules
- Percentages can be stored as `5` (5%) or `0.05`; service normalizes to fractions.
- Lookup order when `paymentMethodId` is provided: payment method → winning provider → PaymentMethodPaymentProvider → fee row for the action; falls back to global action row; finally to global `OTHER`.
- Lookup without `paymentMethodId`: tries global fee for the action, then global `OTHER`, then uses the payment method marked `defaultForFees=true` to resolve provider-specific fees.
- Money values are rounded with scale 2, `HALF_UP`.

## Errors
- Missing/invalid params return `400` (Spring validation).
- If no matching payment method/provider/fee row exists, the service raises `IllegalArgumentException`; the client receives an error body with a message (structure depends on resolver: standard Spring error or `ApiError { message, statusCode, errorCode }` when handled by `FondekaAppExceptionHandler`).

## Example request
```
GET /public/fees?action=FUND_WALLET&paymentMethodId=12&amount=100.00
```
Response example:
```json
{
  "fees": 1.25,
  "loanInterestRate": 0,
  "loanInterest": 0,
  "totalToPay": 101.25,
  "feesPercentage": 0.0125
}
```

## Integration tips
- Always send `paymentMethodId` from the user’s selection when possible to avoid falling back to global/default rows.
- Treat `feesPercentage` and `loanInterestRate` as fractions; multiply by 100 to display percents.
- For loan flows, pick the loan product by amount first, then call `/public/fees` so the interest portion matches backend validation.
