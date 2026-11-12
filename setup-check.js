/* ============================================================
   CyberBirdies — setup checklist
   Loaded before booking.js; exposes window.setupChecks().
   ============================================================ */

(function () {
  function byId(id) { return document.getElementById(id); }
  function val(id) { const e = byId(id); return e ? e.value : ""; }

  window.setupChecks = function setupChecks() {
    const cfg = window.CONFIG;
    const out = [];

    /* 1. Floor space — a hard no blocks; tight or unsure goes to review. */
    const space = val("chk-space");
    if (space === "no") {
      out.push({
        blocks: true,
        message: "The booth needs " + cfg.setup.minFloorSpace +
          " of clear floor. If you have a different spot in mind, tell us in the notes.",
      });
    } else if (space === "maybe" || space === "unsure") {
      out.push({ review: true, note: "floor space is tight or unconfirmed." });
    }

    /* 2. Level ground — a hard no blocks. */
    const level = val("chk-level");
    if (level === "no") {
      out.push({
        blocks: true,
        message: "The booth needs reasonably level ground. A noticeable slope means it can't be set up safely.",
      });
    } else if (level === "maybe" || level === "unsure") {
      out.push({ review: true, note: "the ground may be slightly sloped." });
    }

    /* 3. Power — no outlet is workable with the generator add-on,
          but the owner still confirms before payment. */
    const power = val("chk-power");
    const hasGenerator = byId("generator") && byId("generator").checked;
    if (power === "no" && !hasGenerator) {
      out.push({
        review: true,
        note: "no outlet within " + cfg.setup.maxOutletDistanceFt +
          " ft — they'd need the generator add-on, or we confirm power before payment.",
      });
    } else if (power === "generator" && !hasGenerator) {
      out.push({
        review: true,
        note: "they think they need generator power — confirm and have them tick the add-on.",
      });
    } else if (power === "unsure") {
      out.push({ review: true, note: "the outlet distance is unconfirmed." });
    }

    /* 4. WiFi — needed for the tracker. Anything short of a yes goes to review. */
    const wifi = val("chk-wifi");
    if (wifi === "no") {
      out.push({ review: true, note: "there may be no WiFi at the venue." });
    } else if (wifi === "weak" || wifi === "unsure") {
      out.push({ review: true, note: "WiFi signal is weak or unconfirmed." });
    }

    /* 5. Ceiling height — under 11 ft 6 in is a hard block. */
    const ceiling = val("ceiling");
    if (ceiling === "under-11") {
      out.push({
        blocks: true,
        message: "The booth is 11 ft tall and needs " + cfg.setup.minCeilingHeight +
          " of clearance. A lower ceiling means it cannot be set up.",
      });
    } else if (ceiling === "unsure") {
      out.push({ review: true, note: "ceiling height is unconfirmed — measure before the event." });
    }

    return out;
  };
})();
