# CyberBirdies — cyberbirdies.com

A mobile golf simulator rental site: marketing pages, a booking flow with real
availability logic, and cryptocurrency checkout.

Everything here runs on Node with **no external dependencies**. Nothing needs
`npm install`.

---

## Read this first

### 1. There are `[[FILL IN]]` markers everywhere

Every value only you can decide is wrapped in double square brackets. Search the
project for `[[` and work through them. The site will run before they're filled
in — it just won't be truthful or complete.

The ones that matter most, in order:

1. **`terms.html` — the waiver and liability sections.** These are a framework,
   not a legal document. Have a North Carolina attorney draft the waiver,
   liability cap, and acceptance mechanism before you take a single booking.
   A rental business that lets strangers swing golf clubs carries real risk, and
   an unenforceable waiver is worse than none because it creates false
   confidence.
2. **Insurance.** The FAQ and the terms both promise a certificate of insurance
   on request. Most venues — and every corporate client — will ask. Get the
   policy and the COI sorted before you market to venues.
3. **`config.js` — pricing, deposit, cancellation window.** The numbers in there
   now match your Square page: $250/hour, 2 hour minimum, a flat **$250
   non-refundable deposit**, pay only after the date and setup are confirmed,
   and cancellations with 7 days' notice transfer to another date within 6
   months. Generator power is a $50 add-on.
4. **Contact details**, in `config.js` and in every page footer.

### 2. Crypto checkout needs one decision

**Coinbase Commerce is not an option.** Most guides still recommend it, but
Coinbase shut the Commerce portal to merchants outside the US and Singapore on
31 March 2026, with no migration path. Don't build on it.

The server is written for **NOWPayments**, which is a reasonable default:

| Option | Fee | Custody | Notes |
|---|---|---|---|
| **NOWPayments** | 0.5–1% | Non-custodial payouts available | 350+ coins, hosted checkout, easiest to start |
| **BTCPay Server** | 0% | Fully non-custodial | Self-hosted; you run the server |
| **Coinbase Business** | ~1% | Custodial | Successor to Commerce; pays out in USDC |
| **Strike** | 1% → 0.49% | Custodial | Bitcoin only, instant USD settlement |

If you want zero fees and you're comfortable running a server, BTCPay Server is
the strongest long-term answer. If you want it working this week, NOWPayments.

**Never put a seed phrase or private key in any file in this project.** The
site source is public. Only public receive addresses and API keys that live in
`.env` (never committed) belong here.

### 3. The service area rule

You said no further than a 2 hour drive from Welcome, NC. That's implemented
two ways:

- The booking form asks the customer their drive time and **blocks the booking**
  beyond 2 hours.
- The server **re-checks it** and rejects the booking even if someone edits the
  browser.

`config.js` also carries a `maxRadiusMiles: 80` straight-line figure. It's only
used for the map circle and rough filtering — the drive-time question is the
real gate. Tune the radius if you want.

---

## Running it locally

```bash
cd cyberbirdies-site
cp .env.example .env      # then edit .env
node server.js
```

Open http://localhost:3000

With no API key set, bookings create a **demo invoice** so you can walk the
whole flow — date picker, availability, summary, checkout hand-off — without
any real money involved.

## Going live

Any Node host works: Render, Railway, Fly.io, a VPS with nginx in front.
Steps:

1. Point `cyberbirdies.com` at the host.
2. Set every variable from `.env.example` in the host's dashboard.
3. Set `SITE_URL` to `https://cyberbirdies.com`.
4. In NOWPayments, set the IPN callback URL to
   `https://cyberbirdies.com/api/payment-webhook`.
5. Leave `ALLOW_DEMO_WEBHOOK=false` in production. It disables signature
   verification on the payment webhook, which would let anyone mark a booking
   paid.

## Managing bookings

Bookings are stored in `data/bookings.json`. Two owner endpoints, guarded by
`OWNER_TOKEN`:

```bash
# See every booking and blocked date
curl -H "x-owner-token: YOUR_TOKEN" https://cyberbirdies.com/api/owner/bookings

# Block off a date or a time range (maintenance, personal plans)
curl -X POST https://cyberbirdies.com/api/owner/block \
  -H "x-owner-token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date":"2027-04-11","startTime":"00:00","endTime":"23:59","reason":"Personal"}'
```

A JSON file is fine for one booth and a handful of bookings a week. If you ever
run multiple booths or take bookings faster than you can read the file, move to
a real database — SQLite is the natural next step and needs no server.

## What is deliberately not built

- **Email sending.** The confirmation emails aren't wired up. The hooks are
  marked in `server.js`. Add Resend, Postmark, or SendGrid — it's about ten
  lines with an API key.
- **A waiver signature capture at checkout.** There's no checkbox on the booking
  form yet, because the wording has to come from your attorney. Add it once you
  have the text, and log the accepted version with the booking.
- **Analytics.** Nothing tracks visitors. Add it deliberately and update
  `privacy.html` when you do.
- **A real availability calendar UI.** The booking page shows a list of open
  start times for a chosen date, which is honest for a single-booth operation
  and much simpler than a month grid. It's also harder to mis-read.

## File map

```
index.html              marketing page
book.html               booking form
terms.html              terms, waiver framework, rental agreement
privacy.html            privacy policy
payment-confirmed.html  after successful payment
payment-pending.html    while the invoice is open
config.js               everything you edit: prices, policy, service area
server.js               static files, availability API, bookings, crypto invoice, webhook
assets/style.css        styling
assets/booking.js       booking page behaviour
assets/logo.jpeg        your logo
.env.example            environment variable template
data/bookings.json      created on first booking
```
