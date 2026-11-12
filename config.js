/* ============================================================
   CyberBirdies — SITE CONFIGURATION
   Edit the values in this file. Nothing else needs to change.
   Anything still wrapped in [[ ... ]] must be filled in before
   you take a real booking.
   ============================================================ */

const CONFIG = {

  /* ---- BUSINESS IDENTITY ---- */
  business: {
    name: "CyberBirdies",
    legalName: "CyberBirdies LLC",          // [[FILL IN: your exact registered entity name]]
    tagline: "golf simulators",
    domain: "cyberbirdies.com",
    email: "cyberbirdiesgolf@gmail.com",     // primary contact inbox
    phone: "409-224-9765",
    homeBase: "Welcome, NC",
  },

  /* ---- PRICING ---- */
  pricing: {
    hourlyRate: 250,          // USD per hour
    minimumHours: 2,          // minimum rental length
    depositAmount: 250,       // flat, non-refundable deposit to hold a date
    travelFeePerMile: 0,      // set a number if you charge beyond a radius
    freeRadiusMiles: 0,       // miles included before travel fee applies
  },

  /* ---- SERVICE AREA
     You said: no further than a 2 hour drive from Welcome, NC.
     The radius below is only used to draw the map circle and to
     reject obviously out-of-range bookings. The real gate is the
     booking form's drive-time question. ---- */
  serviceArea: {
    centerLabel: "Welcome, NC",
    centerLat: 35.9029,
    centerLng: -80.2548,
    maxDriveHours: 2,
    // Rough straight-line radius equivalent of a 2-hour drive.
    // Rural interstate ~65 mph, county roads slower. 80 miles is
    // a conservative straight-line approximation; tune if needed.
    maxRadiusMiles: 80,
    driveTimeDisclaimer:
      "Drive time is measured from Welcome, NC by the fastest road route. " +
      "Anything closer than a 2 hour drive can be booked. Bookings beyond " +
      "a 2 hour drive cannot be accepted, even if the address falls inside " +
      "the radius shown.",
  },

  /* ---- SITE REQUIREMENTS ----
     These drive the setup checklist on the booking form. Every one
     of them is a thing that stops a setup on the day if it's wrong,
     so the form asks about all of them before anyone pays. */

  setup: {
    boothSize: '16 ft x 20 ft footprint, 11 ft tall',
    minCeilingHeight: '11 ft 6 in',
    minFloorSpace: '16 ft x 20 ft',
    maxOutletDistanceFt: 50,
    powerRequirement: 'One standard 120V 15A outlet within 50 ft',
    surfaceRequirement: 'Reasonably level ground — no steep slope',
    wifiRequirement: 'Venue WiFi in range of the hitting bay',
    setupTime: '[[FILL IN: your real setup time, e.g. 45-60 minutes]]',
    teardownTime: '[[FILL IN: your real teardown time]]',
    arrivalBufferMinutes: 60,   // you arrive this early to build the bay
  },

  /* ---- EQUIPMENT ---- */
  equipment: [
    {
      name: "Uneekor EYE XO Launch Monitor",
      detail: "Overhead dual high-speed camera system. 24 data points of ball and club tracking — ball speed, launch angle, backspin, sidespin, club path, face angle, and more."
    },
    {
      name: "EE Projector",
      detail: "Overhead projection onto the booth screen for a full-size, immersive course view."
    },
    {
      name: "MSI Gaming Laptop",
      detail: "Dedicated simulator PC running the course software. No customer hardware required."
    },
    {
      name: "Inflatable Booth",
      detail: "16 ft x 20 ft enclosure, 11 ft tall. Full-size hitting bay with a real turf mat."
    }
  ],

  /* ---- PAYMENT ----
     Card payment runs entirely on Square-hosted checkout. The site
     only ever links out to these URLs; it takes no card details and
     builds no custom payment form.

     TAX IS ALREADY INCLUDED. Square adds 7% tax on its own, so the
     "total" figures below are what Square actually charges. Do not
     add tax anywhere else in this project.

     Tips are switched off in the Square account. */

  payment: {
    squareLabel: "Pay by card via Square",
    squareNote:
      "Card, Cash App Pay, and Afterpay accepted. Square adds 7% tax at " +
      "checkout. Payment does not reserve your date — confirm availability " +
      "with us first.",

    /* The warning shown above every payment button. */
    noReserveWarning:
      "Paying does not reserve your event date. Confirm the date, the drive, " +
      "and the setup with us before you pay.",

    /* Rate and tax, for display only. The real charge is Square's. */
    hourlyRate: 250,
    taxRate: 0.07,

    /* $250 deposit — its own Square checkout. Collects exactly $250:
       no tax, no tip. Balance is NOT collected through the package
       links, because those charge the full rental again. */
    deposit: {
      url: "https://square.link/u/HVHdg8vY",
      amount: 250,
      label: "Pay $250 Deposit",
      note:
        "Pay $250 now to hold your date. No tax and no tip are added — " +
        "Square collects exactly $250.",

      /* Shown once the customer has a date and has answered the
         setup questions. */
      readyNote:
        "You've picked your date and answered the setup questions. Paying the " +
        "$250 deposit now holds it. No tax and no tip — Square collects " +
        "exactly $250.",
      notReadyNote:
        "Pick your date and answer the setup questions above, then you can pay " +
        "the $250 deposit here.",
      balanceNote:
        "The remaining balance is NOT paid through the rental links on this " +
        "page — those charge the full rental again. We'll send you a separate " +
        "balance invoice before your event.",
      nonRefundable: true,
      noConfirmWarning:
        "Paying the deposit does not by itself confirm your event. We confirm " +
        "the date, the drive, and the setup with you first.",
    },

    /* Optional generator add-on — a SEPARATE Square checkout, paid
       after the rental. Square adds the 7% tax; do not add it again. */
    generator: {
      url: "https://square.link/u/siQmMPqs",
      price: 50,
      tax: 3.50,
      total: 53.50,
      label: "Generator power",
      twoPaymentNote:
        "The generator is a separate $53.50 payment. You'll pay for your " +
        "rental first, then complete this second checkout, and you'll " +
        "receive two separate receipts from Square.",
    },

    /* Package buttons. Price is the pre-tax rental; total is what
       Square charges. Both are shown to the customer. */
    packages: [
      { hours: 2, url: "https://square.link/u/VFGkEzgN", price: 500,  tax: 35,    total: 535    },
      { hours: 3, url: "https://square.link/u/MVIMOCb5", price: 750,  tax: 52.50, total: 802.50 },
      { hours: 4, url: "https://square.link/u/l5J5kMnF", price: 1000, tax: 70,    total: 1070   },
      { hours: 5, url: "https://square.link/u/LJ4Bm7u3", price: 1250, tax: 87.50, total: 1337.50},
      { hours: 6, url: "https://square.link/u/5RtWRCCj", price: 1500, tax: 105,   total: 1605   },
      { hours: 7, url: "https://square.link/u/Vwclowhw", price: 1750, tax: 122.50,total: 1872.50},
      { hours: 8, url: "https://square.link/u/amxHcpwM", price: 2000, tax: 140,   total: 2140   }
    ],
  },

  /* ---- OPTIONAL ADD-ONS ---- */
  addons: {
    generator: {
      label: "Generator power",
      price: 50,
      detail:
        "Generator power, if needed, costs an additional $50.",
    },
  },

  /* ---- CRYPTO ---- */
  crypto: {
    provider: "NOWPayments",           // see README for why not Coinbase Commerce
    acceptedCoins: ["BTC", "ETH", "USDC", "USDT", "LTC", "DOGE"],
    // Public receive/merchant identifiers only. NEVER put a seed
    // phrase or private key in this file — it is visible to anyone
    // who opens the website source.
    merchantWalletLabel: "[[FILL IN: label only, e.g. 'CyberBirdies Business Wallet']]",
    payoutAddress: "[[FILL IN: your public receive address]]",
  },

  /* ---- TERMS AGREEMENT ----
     Version is stored with every booking, so you can prove which
     wording a customer accepted and when. Bump the version any time
     the terms text changes. */

  terms: {
    version: "1.0",
    requireAgreementBeforePayment: true,
    agreementLabel:
      "I have read and agree to the Terms & Conditions, Rental Agreement, " +
      "and Damage Liability terms.",
    agreementShort:
      "I agree to the Terms & Conditions and accept financial liability " +
      "for damage to CyberBirdies equipment caused by me, my guests, or my customers.",
  },

  /* ---- PAYMENT TIMELINE ----
     Deposit holds the date. The full balance is due 14 days before
     the event at the latest. Reminders go out well ahead of that. */

  timeline: {
    balanceDueDaysBefore: 14,      // hard deadline
    reminderDaysBefore: 30,        // first gentle reminder
    reminderSecondDaysBefore: 21,  // second reminder, still early
    reminderFinalDaysBefore: 16,   // last nudge, 2 days of headroom
    autoReleaseIfUnpaidDaysBefore: 14,
    reminderSubject: "Your CyberBirdies balance is due {date}",
    reminderIntro:
      "Your event is coming up. The remaining balance is due by {dueDate} " +
      "({days} days before your event).",
    reminderBody:
      "You can settle it now whenever suits you — paying early is fine and " +
      "means nothing left to do on the day.\n\n" +
      "If your balance is already paid, thank you, and please ignore this.",
    reminderSchedule: [30, 21, 16],
  },

  /* ---- POLICIES ----
     These now follow the terms on your Square link, so the site and
     your payment page say the same thing:
       - pay only after the date and setup are confirmed
       - cancellations with 7+ days notice transfer to a date within 6 months
     Change the numbers here and both pages update. */

  policies: {
    cancellationNoticeDays: 7,
    transferWindowMonths: 6,
    confirmBeforePay: true,
    depositNonRefundable: true,
    cancellationPolicy:
      "The $250 deposit is non-refundable if you cancel. Cancellations with at least 7 days' " +
      "notice qualify for a transfer of any additional payments to an available date " +
      "within 6 months of cancellation. Cancellations inside 7 days do not " +
      "qualify for a transfer.",
    depositClause:
      "The $250 deposit is non-refundable if you cancel, in all circumstances, including " +
      "cancellation, rescheduling outside the 7-day notice window, or failure " +
      "to pay the balance by the due date.",
    balancePolicy:
      "The full balance is due at least 14 days before your event. Your date " +
      "is held until then. If the balance is unpaid 14 days out, the date may " +
      "be released and the deposit is not refunded.",
    weatherPolicy:
      "Outdoor bookings are rescheduled at no charge if severe weather makes the event unsafe or unusable.",
    agePolicy: "Guests under 18 must have a parent or guardian present who accepts these terms on their behalf. Continuous adult supervision is required for anyone under 12.",
    generatorNote:
      "Generator power is available for $50 where the venue has no outlet in reach.",
  },

  /* ---- BOOKING ---- */
  booking: {
    openHour: 8,        // earliest start time, 24h clock
    closeHour: 23,      // latest end time
    slotMinutes: 30,    // booking grid granularity
    leadTimeHours: 24,  // how soon before an event you'll still take a booking
    defaultMaxHours: 8,
  }
};

// Make available to both the browser and Node (for the server).
if (typeof module !== "undefined" && module.exports) {
  module.exports = CONFIG;
}
