/* ============================================================
   CyberBirdies — booking page logic
   Runs entirely in the browser against the availability API.
   ============================================================ */

const el = (id) => document.getElementById(id);

const state = {
  hours: 0,
  total: 0,
  deposit: 0,
  generator: false,
  slots: [],
  checkoutUrl: null,
  invoiceId: null,
};

/* The deposit only unlocks once the customer has chosen a date and a
   length, answered the setup questions, and given us a venue. */
function depositReady() {
  const date = el("event-date").value;
  const start = el("start-time").value;
  const city = el("venue-city").value.trim();
  if (!date || !start || !city) return false;

  const answered = ["chk-space", "chk-level", "chk-power", "chk-wifi"].every((id) => {
    const e = el(id);
    return e && e.value && e.value.length > 0;
  });
  if (!answered) return false;

  /* A hard block means the booth can't go there at all. */
  const blocked = setupChecks().some((c) => c.blocks);
  return !blocked;
}

/* The Square package for a given length, or null if there isn't one. */
function packageFor(hours) {
  const list = (window.CONFIG.payment && window.CONFIG.payment.packages) || [];
  return list.find((p) => p.hours === Number(hours)) || null;
}

/* Square charges the total (rental + 7% tax). Shown, never recalculated. */
function packageTotal(hours) {
  const p = packageFor(hours);
  return p ? p.total : 0;
}

/* ---------- Money ---------- */

function money(n) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/* For amounts that can have cents — tax and the Square totals. */
function money2(n) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function recalc() {
  const cfg = window.CONFIG;
  const hours = parseFloat(el("hours").value) || 0;

  if (hours > 0 && hours < cfg.pricing.minimumHours) {
    el("min-warn").classList.remove("hidden");
  } else {
    el("min-warn").classList.add("hidden");
  }

  const billable = hours >= cfg.pricing.minimumHours ? hours : 0;
  const pkg = packageFor(billable);
  const rental = billable * cfg.pricing.hourlyRate;
  const tax = Math.round(rental * cfg.payment.taxRate * 100) / 100;
  /* Square's own total is authoritative. The arithmetic above is only a
     cross-check so the page and Square can't disagree silently. */
  const total = pkg ? pkg.total : rental + tax;
  const deposit = billable ? cfg.pricing.depositAmount : 0;

  state.hours = billable;
  state.total = total;
  state.deposit = deposit;

  el("sum-hours").innerHTML = billable ? "<strong>" + billable + " hours</strong>" : "<strong>—</strong>";
  el("sum-rental").textContent = money2(rental);
  el("sum-tax").textContent = money2(tax);
  el("sum-total").textContent = money2(total);
  el("sum-deposit").textContent = money(deposit);

  renderPaymentChoice();

  const driveHours = parseFloat(el("drive-hours").value) || 0;
  if (driveHours >= cfg.serviceArea.maxDriveHours) {
    el("drive-warn").classList.remove("hidden");
  } else {
    el("drive-warn").classList.add("hidden");
  }

  validate();
}

/* ---------- Payment method choice ---------- */

function renderPaymentChoice() {
  const cfg = window.CONFIG;
  const box = el("pay-methods");
  if (!box) return;

  const pkg = packageFor(state.hours);
  if (!state.hours) {
    box.innerHTML = '<p class="slot-empty">Choose your date and length to see payment options.</p>';
    updatePayButton();
    return;
  }
  if (!pkg) {
    box.innerHTML = '<p class="slot-empty">We don\'t have a card option for that length. Email us and we\'ll sort it out.</p>';
    updatePayButton();
    return;
  }

  const dep = cfg.payment.deposit;
  const gen = cfg.payment.generator;
  const wantsGenerator = el("generator") && el("generator").checked;

  /* The deposit unlocks once a date is picked and the setup questions
     are answered — nothing is charged before the customer has told us
     where the booth is going. */
  const ready = depositReady();

  let html = `
    <div class="pkg-pay">
      <div class="pkg-pay-row">
        <span>${state.hours} hour rental</span><strong>${money2(pkg.price)}</strong>
      </div>
      <div class="pkg-pay-row">
        <span>Sales tax (7%)</span><strong>${money2(pkg.tax)}</strong>
      </div>
      <div class="pkg-pay-total">
        <span>Square charges</span><strong>${money2(pkg.total)}</strong>
      </div>
      <p class="pkg-pay-note">
        Tax is added by Square at checkout. This is the exact amount you'll be charged.
      </p>
      <div class="alert alert-warn noreserve">
        <strong>Paying does not reserve your event date.</strong>
        ${cfg.payment.noReserveWarning}
      </div>
      <a class="btn btn-primary btn-lg ${ready ? "" : "btn-disabled"}" 
         href="${ready ? pkg.url : "#"}"
         ${ready ? 'target="_blank" rel="noopener"' : 'aria-disabled="true"'}
         style="width:100%;text-align:center">
        Pay ${money2(pkg.total)} with Square
      </a>
      ${ready ? "" : `<p class="pkg-pay-note" style="margin-top:12px">
        Payment unlocks only after you confirm the site meets the space, power, and setup requirements above.
      </p>`}
    </div>

    <div class="pkg-pay pkg-pay-deposit">
      <h4 class="step-head">Step 2 · Hold your date</h4>

      <div class="pkg-pay-row">
        <span>${dep.label}</span><strong>${money2(dep.amount)}</strong>
      </div>
      <div class="pkg-pay-row">
        <span>Sales tax</span><strong>$0.00</strong>
      </div>
      <div class="pkg-pay-total">
        <span>Square charges</span><strong>${money2(dep.amount)}</strong>
      </div>

      <p class="pkg-pay-note">
        ${ready ? dep.readyNote : dep.notReadyNote}
        ${dep.nonRefundable ? " The deposit is non-refundable." : ""}
      </p>

      <a class="btn btn-primary btn-lg ${ready ? "" : "btn-disabled"}"
         href="${ready ? dep.url : "#"}"
         ${ready ? 'target="_blank" rel="noopener"' : 'aria-disabled="true"'}
         style="width:100%;text-align:center">
        ${dep.label} with Square
      </a>

      ${ready ? "" : `<p class="pkg-pay-note" style="margin-top:12px">
        The button unlocks once your date and the setup questions above are done.
      </p>`}

      <div class="balance-note">
        <strong>How the balance works.</strong>
        ${dep.balanceNote}
      </div>
    </div>`;

  /* Second, separate checkout for the generator add-on. */
  if (wantsGenerator) {
    html += `
    <div class="pkg-pay pkg-pay-second">
      <div class="two-pay-banner">
        <strong>This requires two payments.</strong>
        ${gen.twoPaymentNote}
      </div>

      <h4 class="step-head">Step 2 · ${gen.label}</h4>

      <div class="pkg-pay-row">
        <span>${gen.label}</span><strong>${money2(gen.price)}</strong>
      </div>
      <div class="pkg-pay-row">
        <span>Sales tax (7%)</span><strong>${money2(gen.tax)}</strong>
      </div>
      <div class="pkg-pay-total">
        <span>Square charges</span><strong>${money2(gen.total)}</strong>
      </div>
      <p class="pkg-pay-note">
        Tax is added by Square at checkout. Pay this after your rental checkout above.
      </p>
      <a class="btn btn-primary btn-lg" href="${gen.url}"
         target="_blank" rel="noopener" style="width:100%;text-align:center">
        Pay ${money2(gen.total)} for generator with Square
      </a>

      <div class="pkg-pay-row grand">
        <span>Total across both payments</span><strong>${money2(grand)}</strong>
      </div>
      <p class="pkg-pay-note">
        Two separate Square receipts will be emailed to you — one for the rental,
        one for the generator.
      </p>
    </div>`;
  }

  box.innerHTML = html;
  updatePayButton();
}

function selectedMethod() {
  const r = document.querySelector('input[name="paymethod"]:checked');
  return r ? r.value : null;
}

function updatePayButton() {
  const btn = el("pay-btn");
  if (!btn) return;
  const m = selectedMethod();
  btn.textContent =
    m === "square"
      ? `Reserve & pay ${money(state.total)} by card`
      : `Reserve & pay ${money(state.deposit)} deposit in crypto`;
}

/* ---------- Date + slot loading ---------- */

async function loadSlots() {
  const date = el("event-date").value;
  if (!date) return;

  const hours = state.hours;
  const list = el("slot-list");
  list.innerHTML = '<p class="slot-empty">Checking availability…</p>';

  try {
    const res = await fetch(`/api/availability?date=${date}&hours=${hours}`);
    const data = await res.json();
    state.slots = data.slots || [];

    if (!state.slots.length) {
      list.innerHTML = '<p class="slot-empty">No open start times for that date with the length you selected.</p>';
      return;
    }

    list.innerHTML = "";
    state.slots.forEach((s) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-ghost";
      btn.style.width = "100%";
      btn.textContent = s.label;
      btn.addEventListener("click", () => {
        [...list.querySelectorAll("button")].forEach((b) => {
          b.classList.remove("btn-primary");
          b.classList.add("btn-ghost");
        });
        btn.classList.remove("btn-ghost");
        btn.classList.add("btn-primary");
        el("start-time").value = s.start;
        el("sum-start").textContent = s.label;
        validate();
      });
      list.appendChild(btn);
    });
  } catch (err) {
    list.innerHTML = '<p class="slot-empty">Could not load availability. Try again in a moment.</p>';
  }
}

/* ---------- Validation ---------- */

function validate() {
  const cfg = window.CONFIG;
  const problems = [];

  if (parseFloat(el("hours").value) < cfg.pricing.minimumHours) {
    problems.push(`Minimum booking is ${cfg.pricing.minimumHours} hours.`);
  }
  if (el("event-date").value && !el("start-time").value) {
    problems.push("Choose a start time.");
  }
  if (parseFloat(el("drive-hours").value) >= cfg.serviceArea.maxDriveHours) {
    problems.push(`We book events closer than a ${cfg.serviceArea.maxDriveHours} hour drive from Welcome, NC.`);
  }
  ["name", "email", "venue-city"].forEach((f) => {
    if (!el(f).value.trim()) problems.push("Fill in " + f.replace("-", " ") + ".");
  });
  if (!selectedMethod()) problems.push("Choose how you'd like to pay.");

  /* Terms must be agreed before any payment can be made. */
  const agreed = el("agree-terms") && el("agree-terms").checked;
  if (!agreed) problems.push("Agree to the Terms & Conditions before you pay.");
  el("terms-warn").classList.toggle("hidden", agreed);

  /* --- Setup checklist ---
     A hard "no" blocks the booking outright. Anything uncertain is
     allowed through, but flagged so it lands on the owner's desk
     before a payment link is ever sent. */
  const checks = setupChecks();
  checks.forEach((c) => {
    if (c.blocks) problems.push(c.message);
  });

  const warnBox = el("setup-warn");
  const blockBox = el("setup-block");

  const blocked = checks.filter((c) => c.blocks);
  const flagged = checks.filter((c) => c.review);

  blockBox.classList.toggle("hidden", blocked.length === 0);
  if (blocked.length) {
    blockBox.innerHTML = "<strong>We can't set up with this:</strong> " +
      blocked.map((c) => c.message).join(" ");
  }

  warnBox.classList.toggle("hidden", flagged.length === 0);
  if (flagged.length) {
    warnBox.innerHTML = "<strong>We'll confirm these with you before you pay:</strong> " +
      flagged.map((c) => c.note).join(" ");
  }

  el("pay-btn").disabled = problems.length > 0;
  el("validation-msg").textContent = problems.length ? problems[0] : "";
}

/* ---------- Checkout ---------- */

async function startCheckout() {
  const btn = el("pay-btn");
  const method = selectedMethod();

  btn.disabled = true;
  btn.textContent = method === "square" ? "Reserving your date…" : "Creating your invoice…";

  const payload = {
    paymentMethod: method,
    hours: state.hours,
    date: el("event-date").value,
    startTime: el("start-time").value,
    customer: {
      name: el("name").value.trim(),
      email: el("email").value.trim(),
      phone: el("phone").value.trim(),
    },
    venue: {
      city: el("venue-city").value.trim(),
      address: el("venue-address").value.trim(),
      type: el("venue-type").value,
      ceilingHeight: el("ceiling").value,
      driveTimeHours: parseFloat(el("drive-hours").value) || 0,
    },
    notes: el("notes").value.trim(),
    generator: state.generator,
    subtotal: state.total,
    deposit: state.deposit,
  };

  try {
    const res = await fetch("/api/booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Booking could not be created.");
    }

    el("checkout-box").classList.remove("hidden");
    el("invoice-ref").textContent = data.reference;
    el("square-box").classList.add("hidden");
    el("crypto-box").classList.add("hidden");

    if (method === "square") {
      el("square-link").href = data.checkoutUrl;
      el("square-amount").textContent = money(state.total);
      el("square-box").classList.remove("hidden");
      btn.textContent = "Date reserved — finish payment";
    } else {
      el("checkout-link").href = data.checkoutUrl;
      el("crypto-box").classList.remove("hidden");
      btn.textContent = "Date reserved — finish payment";
    }

    el("checkout-box").scrollIntoView({ behavior: "smooth" });
  } catch (err) {
    const box = el("form-alert");
    box.className = "alert alert-err";
    box.textContent = err.message;
    box.classList.remove("hidden");
    btn.disabled = false;
    updatePayButton();
    return;
  }
}

/* ---------- Wire up ---------- */

document.addEventListener("DOMContentLoaded", () => {
  const cfg = window.CONFIG;

  el("rate-line").textContent = `${money(cfg.pricing.hourlyRate)} / hour · ${cfg.pricing.minimumHours} hour minimum`;
  el("deposit-note").textContent =
    `${cfg.pricing.depositAmount} deposit due to confirm. Balance due on the event day. Non-refundable.`;
  el("drive-max").textContent = cfg.serviceArea.maxDriveHours;
  el("area-label").textContent = cfg.serviceArea.centerLabel;

  const hoursSel = el("hours");
  for (let h = cfg.pricing.minimumHours; h <= cfg.booking.defaultMaxHours; h++) {
    const o = document.createElement("option");
    o.value = h;
    o.textContent = h + " hours";
    hoursSel.appendChild(o);
  }

  const today = new Date();
  const min = new Date(today.getTime() + cfg.booking.leadTimeHours * 3600 * 1000);
  el("event-date").min = min.toISOString().split("T")[0];

  ["hours", "event-date", "start-time", "drive-hours", "name", "email", "venue-city"]
    .forEach((id) => el(id).addEventListener("input", validate));

  el("hours").addEventListener("change", () => { recalc(); loadSlots(); });
  el("event-date").addEventListener("change", () => { recalc(); loadSlots(); });
  el("drive-hours").addEventListener("change", recalc);

  el("pay-btn").addEventListener("click", startCheckout);

  recalc();
});
