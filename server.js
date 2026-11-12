/* ============================================================
   CyberBirdies — booking + crypto payment server
   Node 18+. No dependencies beyond Node itself.

   Run:   node server.js
   Env:   copy .env.example to .env and fill it in, OR export
          the variables in your host's dashboard.
   ============================================================ */

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const CONFIG = require("./config.js");

const PORT = process.env.PORT || 3000;
const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY || "";
const NOWPAYMENTS_IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET || "";
const SITE_URL = process.env.SITE_URL || `http://localhost:${PORT}`;

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const BOOKINGS_FILE = path.join(DATA_DIR, "bookings.json");

/* Books of record: bookings and blocked dates. */
function readStore() {
  try {
    return JSON.parse(fs.readFileSync(BOOKINGS_FILE, "utf8"));
  } catch {
    return { bookings: [], blocked: [] };
  }
}

function writeStore(store) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(store, null, 2));
}

/* ---------- Time helpers ---------- */

const SLOT = CONFIG.booking.slotMinutes;

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function toHHMM(mins) {
  const h = String(Math.floor(mins / 60)).padStart(2, "0");
  const m = String(mins % 60).padStart(2, "0");
  return `${h}:${m}`;
}

function label12(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${String(m).padStart(2, "0")} ${suffix}`;
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

/* ---------- Availability ---------- */

function computeSlots(date, hours) {
  const store = readStore();
  if (!hours || hours < CONFIG.pricing.minimumHours) return [];

  const dayStart = CONFIG.booking.openHour * 60;
  const dayEnd = CONFIG.booking.closeHour * 60;
  const duration = hours * 60;

  // Every booking that still holds the calendar on this date.
  const taken = store.bookings
    .filter((b) => b.date === date && b.status !== "cancelled" && b.status !== "expired")
    .map((b) => ({
      start: toMinutes(b.startTime),
      end: toMinutes(b.startTime) + b.hours * 60,
    }));

  const blocked = (store.blocked || [])
    .filter((b) => b.date === date)
    .map((b) => ({
      start: toMinutes(b.startTime || "00:00"),
      end: toMinutes(b.endTime || "23:59"),
    }));

  const busy = taken.concat(blocked);
  const slots = [];

  for (let s = dayStart; s + duration <= dayEnd; s += SLOT) {
    const e = s + duration;
    if (!busy.some((b) => overlaps(s, e, b.start, b.end))) {
      slots.push({ start: toHHMM(s), label: label12(toHHMM(s)) });
    }
  }
  return slots;
}

/* ---------- NOWPayments ---------- */

async function createCryptoInvoice(booking) {
  /* If no API key is configured, return a clearly-labelled demo invoice so the
     whole flow can be walked through end to end before you go live. */
  if (!NOWPAYMENTS_API_KEY) {
    return {
      demo: true,
      invoiceId: "DEMO-" + booking.reference,
      checkoutUrl: `${SITE_URL}/payment-pending.html?ref=${booking.reference}&demo=1`,
    };
  }

  const body = {
    price_amount: booking.deposit,
    price_currency: "usd",
    pay_currency: null,       // let the customer choose at the hosted checkout
    order_id: booking.reference,
    order_description: `CyberBirdies deposit — ${booking.hours}h on ${booking.date} at ${booking.startTime}`,
    ipn_callback_url: `${SITE_URL}/api/payment-webhook`,
    success_url: `${SITE_URL}/payment-confirmed.html?ref=${booking.reference}`,
    cancel_url: `${SITE_URL}/book.html?cancelled=1`,
  };

  const res = await fetch("https://api.nowpayments.io/v1/invoice", {
    method: "POST",
    headers: {
      "x-api-key": NOWPAYMENTS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Payment provider rejected the invoice: ${res.status} ${text}`);
  }

  const data = await res.json();
  return {
    demo: false,
    invoiceId: String(data.id || booking.reference),
    checkoutUrl: data.invoice_url,
  };
}

function verifyIpnSignature(rawBody, signature) {
  if (!NOWPAYMENTS_IPN_SECRET) return false;
  const expected = crypto
    .createHmac("sha512", NOWPAYMENTS_IPN_SECRET)
    .update(rawBody)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature || ""));
  } catch {
    return false;
  }
}

/* ---------- Static files ---------- */

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

function serveStatic(req, res) {
  let rel = decodeURIComponent(req.url.split("?")[0]);
  if (rel === "/") rel = "/index.html";

  const target = path.join(ROOT, path.normalize(rel).replace(/^(\.\.[/\\])+/, ""));

  // Never serve the store, the server source, or env files.
  if (
    !target.startsWith(ROOT) ||
    target.startsWith(DATA_DIR) ||
    /\/(server\.js|\.env)/.test(target)
  ) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  fs.readFile(target, (err, buf) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(target)] || "application/octet-stream" });
    res.end(buf);
  });
}

/* ---------- Request body ---------- */

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c) => {
      raw += c;
      if (raw.length > 1e6) reject(new Error("Payload too large"));
    });
    req.on("end", () => resolve(raw));
    req.on("error", reject);
  });
}

function sendJson(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}

/* ---------- Server ---------- */

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, SITE_URL);

  /* --- availability --- */
  if (url.pathname === "/api/availability" && req.method === "GET") {
    const date = url.searchParams.get("date");
    const hours = parseFloat(url.searchParams.get("hours")) || 0;
    if (!date) return sendJson(res, 400, { error: "date is required" });
    return sendJson(res, 200, { date, hours, slots: computeSlots(date, hours) });
  }

  /* --- create booking --- */
  if (url.pathname === "/api/booking" && req.method === "POST") {
    let payload;
    try {
      payload = JSON.parse(await readBody(req));
    } catch {
      return sendJson(res, 400, { error: "Invalid request body." });
    }

    const { hours, date, startTime, customer, venue, notes, subtotal, deposit } = payload;

    /* Server-side re-validation — never trust the browser. */
    if (!(hours >= CONFIG.pricing.minimumHours)) {
      return sendJson(res, 400, { error: `Minimum booking is ${CONFIG.pricing.minimumHours} hours.` });
    }
    if (!date || !startTime) return sendJson(res, 400, { error: "Date and start time are required." });
    if (!customer || !customer.name || !customer.email) {
      return sendJson(res, 400, { error: "Name and email are required." });
    }
    if (venue && venue.driveTimeHours >= CONFIG.serviceArea.maxDriveHours) {
      return sendJson(res, 400, {
        error: `We book events closer than a ${CONFIG.serviceArea.maxDriveHours} hour drive from ${CONFIG.serviceArea.centerLabel}.`,
      });
    }

    /* Re-check the slot is still free. */
    const open = computeSlots(date, hours).some((s) => s.start === startTime);
    if (!open) {
      return sendJson(res, 409, { error: "That time was just taken. Pick another start time." });
    }

    /* Recompute money server-side. */
    const trueTotal = hours * CONFIG.pricing.hourlyRate
      + (payload.generator ? CONFIG.addons.generator.price : 0);
    const trueDeposit = CONFIG.pricing.depositAmount;

    const reference = "CB-" + Date.now().toString(36).toUpperCase() +
      "-" + crypto.randomBytes(2).toString("hex").toUpperCase();

    const booking = {
      reference,
      date,
      startTime,
      hours,
      subtotal: trueTotal,
      deposit: trueDeposit,
      customer,
      venue: venue || {},
      notes: notes || "",
      status: "pending_payment",
      createdAt: new Date().toISOString(),
      invoiceId: null,
      checkoutUrl: null,
      paidAt: null,
      txHash: null,
      paymentMethod: payload.paymentMethod || "square",
    };

    // Square is the primary method. Record the booking and hand back the correct Square link.
    if (booking.paymentMethod === "square" || !NOWPAYMENTS_API_KEY) {
      const pkg = (CONFIG.payment.packages || []).find(p => p.hours === hours);
      booking.checkoutUrl = pkg ? pkg.url : CONFIG.payment.deposit.url;
      booking.invoiceId = "SQUARE-" + reference;
    } else {
      try {
        const invoice = await createCryptoInvoice(booking);
        booking.invoiceId = invoice.invoiceId;
        booking.checkoutUrl = invoice.checkoutUrl;
        booking.demo = !!invoice.demo;
      } catch (err) {
        return sendJson(res, 502, { error: err.message });
      }
    }

    const store = readStore();
    store.bookings.push(booking);
    writeStore(store);

    console.log(`[booking] ${reference} ${date} ${startTime} ${hours}h deposit $${trueDeposit} via ${booking.paymentMethod}`);

    return sendJson(res, 200, {
      reference,
      invoiceId: booking.invoiceId,
      checkoutUrl: booking.checkoutUrl,
      total: trueTotal,
      deposit: trueDeposit,
      demo: !!booking.demo,
      message: "Booking recorded. Complete payment at the link to hold your date.",
    });
  }

  /* --- payment webhook (NOWPayments IPN) --- */
  if (url.pathname === "/api/payment-webhook" && req.method === "POST") {
    const raw = await readBody(req);
    const signature = req.headers["x-nowpayments-sig"];
    const isDemo = process.env.ALLOW_DEMO_WEBHOOK === "true";

    if (!isDemo && !verifyIpnSignature(raw, signature)) {
      console.warn("[webhook] Signature check failed — rejected.");
      return sendJson(res, 401, { error: "Invalid signature" });
    }

    let event;
    try {
      event = JSON.parse(raw || "{}");
    } catch {
      return sendJson(res, 400, { error: "Invalid JSON" });
    }

    const orderId = event.order_id;
    const status = (event.payment_status || "").toLowerCase();
    const txHash = event.payin_hash || event.txid || null;

    const store = readStore();
    const booking = store.bookings.find((b) => b.reference === orderId);

    if (!booking) {
      console.warn(`[webhook] Unknown order ${orderId}`);
      return sendJson(res, 200, { ok: true, note: "unknown order" });
    }

    if (status === "finished" || status === "confirmed") {
      booking.status = "paid";
      booking.paidAt = new Date().toISOString();
      booking.txHash = txHash;
      console.log(`[webhook] ${orderId} PAID — deposit locked in.`);
      /* Hook your email confirmation in here. */
    } else if (status === "failed" || status === "refunded" || status === "expired") {
      booking.status = "cancelled";
      console.log(`[webhook] ${orderId} ${status} — slot released.`);
    } else {
      booking.status = "pending_payment";
    }

    writeStore(store);
    return sendJson(res, 200, { ok: true });
  }

  /* --- owner tools: see bookings, block dates --- */
  if (url.pathname === "/api/owner/bookings" && req.method === "GET") {
    const token = req.headers["x-owner-token"];
    if (!process.env.OWNER_TOKEN || token !== process.env.OWNER_TOKEN) {
      return sendJson(res, 401, { error: "Unauthorized" });
    }
    return sendJson(res, 200, readStore());
  }

  if (url.pathname === "/api/owner/block" && req.method === "POST") {
    const token = req.headers["x-owner-token"];
    if (!process.env.OWNER_TOKEN || token !== process.env.OWNER_TOKEN) {
      return sendJson(res, 401, { error: "Unauthorized" });
    }
    const { date, startTime, endTime, reason } = JSON.parse(await readBody(req));
    const store = readStore();
    store.blocked = store.blocked || [];
    store.blocked.push({ date, startTime, endTime, reason: reason || "" });
    writeStore(store);
    return sendJson(res, 200, { ok: true, blocked: store.blocked.length });
  }

  /* --- pages --- */
  if (req.method === "GET") return serveStatic(req, res);

  res.writeHead(405).end("Method not allowed");
});

server.listen(PORT, () => {
  console.log(`CyberBirdies running on ${SITE_URL}`);
  if (!NOWPAYMENTS_API_KEY) {
    console.log("NOTE: NOWPAYMENTS_API_KEY is not set — bookings will use a demo invoice.");
  }
});
