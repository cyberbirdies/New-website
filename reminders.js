/* ============================================================
   CyberBirdies — balance reminder scheduler
   Pure date logic, no dependencies. Imported by server.js and
   exercised directly by the test script.

   Rules:
     - deposit holds the date
     - full balance due 14 days before the event, at the latest
     - reminders go out well before that: 30, 21 and 16 days out
     - an unpaid booking 14 days out may be released (deposit kept)
   ============================================================ */

const CONFIG = require("./config.js");

const DAY_MS = 24 * 60 * 60 * 1000;

/* Parse "YYYY-MM-DD" as a plain calendar date, no timezone drift. */
function parseEventDate(ymd) {
  const [y, m, d] = String(ymd).split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfToday(now) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

/* Whole days from today until the event. 0 = the event is today. */
function daysUntil(eventDate, now = new Date()) {
  const ev = parseEventDate(eventDate);
  const today = startOfToday(now);
  return Math.round((ev - today) / DAY_MS);
}

/* The calendar date the balance is due: event minus 14 days. */
function balanceDueDate(eventDate) {
  const ev = parseEventDate(eventDate);
  ev.setDate(ev.getDate() - CONFIG.timeline.balanceDueDaysBefore);
  return ev;
}

/* The date a given reminder fires: event minus N days. */
function reminderDate(eventDate, daysBefore) {
  const ev = parseEventDate(eventDate);
  ev.setDate(ev.getDate() - daysBefore);
  return ev;
}

function formatDate(d) {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function isOverdue(booking, now = new Date()) {
  return daysUntil(booking.date, now) < CONFIG.timeline.balanceDueDaysBefore;
}

/* Replace {placeholders} in a template string. */
function fill(template, vars) {
  return String(template).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

/* The amount still owed on a booking. */
function balanceOwed(booking) {
  if (typeof booking.balancePaid === "number" && booking.balancePaid > 0) {
    return Math.max(0, (booking.total || 0) - booking.balancePaid);
  }
  if (booking.fullPaid) return 0;
  return Math.max(0, (booking.total || 0) - (booking.deposit || 0));
}

/* ------------------------------------------------------------------
   Which reminders are due for this booking, right now?

   Returns an array of { daysBefore, subject, body, dueDate }, one per
   reminder whose trigger date has arrived and that hasn't been sent.
   A booking that is already paid produces nothing.
   ------------------------------------------------------------------ */
function dueReminders(booking, now = new Date()) {
  const t = CONFIG.timeline;
  if (!booking || !booking.date) return [];
  if (booking.status === "cancelled" || booking.status === "completed") return [];
  if (balanceOwed(booking) <= 0) return [];
  if (!booking.customer || !booking.customer.email) return [];

  const sent = Array.isArray(booking.remindersSent) ? booking.remindersSent : [];
  const left = daysUntil(booking.date, now);
  const due = balanceDueDate(booking.date);
  const out = [];

  t.reminderSchedule.forEach((daysBefore) => {
    if (sent.includes(daysBefore)) return;
    /* Fire on or after the trigger date, but never after the deadline —
       a late reminder for an overdue balance is still worth sending once. */
    const trigger = reminderDate(booking.date, daysBefore);
    if (startOfToday(now) < trigger) return;

    const vars = {
      date: formatDate(parseEventDate(booking.date)),
      dueDate: formatDate(due),
      days: Math.max(0, left),
      name: booking.customer.name || "there",
      balance: balanceOwed(booking),
    };

    out.push({
      daysBefore,
      dueDate: due,
      overdue: left < t.balanceDueDaysBefore,
      subject: fill(t.reminderSubject, vars),
      body: fill(t.reminderIntro + "\n\n" + t.reminderBody, vars),
    });
  });

  return out;
}

/* Should this booking be released? Unpaid and inside the deadline. */
function shouldRelease(booking, now = new Date()) {
  if (!booking || !booking.date) return false;
  if (booking.status === "cancelled" || booking.status === "completed") return false;
  if (balanceOwed(booking) <= 0) return false;
  return t_releaseGate(booking, now);
}

function t_releaseGate(booking, now) {
  return daysUntil(booking.date, now) < CONFIG.timeline.autoReleaseIfUnpaidDaysBefore;
}

/* A booking's full payment position, for display. */
function paymentSummary(booking, now = new Date()) {
  const owed = balanceOwed(booking);
  const left = daysUntil(booking.date, now);
  return {
    total: booking.total || 0,
    deposit: booking.deposit || 0,
    paid: (booking.total || 0) - owed,
    owed,
    daysUntilEvent: left,
    dueDate: formatDate(balanceDueDate(booking.date)),
    overdue: owed > 0 && left < CONFIG.timeline.balanceDueDaysBefore,
    released: shouldRelease(booking, now),
  };
}

module.exports = {
  DAY_MS,
  parseEventDate,
  daysUntil,
  balanceDueDate,
  reminderDate,
  formatDate,
  balanceOwed,
  dueReminders,
  shouldRelease,
  paymentSummary,
  fill,
};
