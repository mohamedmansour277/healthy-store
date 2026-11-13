/* ==========================================================================
   Healthy — central store settings
   Every value below is a PLACEHOLDER until verified with the store owner.
   Change things here only; no other file contains business data.
   ========================================================================== */
const STORE_CONFIG = {
  name: "Healthy",

  // WhatsApp number in international format, digits only, no "+" or spaces.
  // Egypt example: 201012345678  (20 + mobile number without the leading 0)
  whatsappNumber: "20XXXXXXXXXX",

  currency: "EGP",
  currencyLabel: "جنيه",

  // Delivery (DEMO VALUE ONLY — replace with the real fee)
  deliveryFee: 20,
  freeDeliveryMinimum: null,          // e.g. 300 to give free delivery above 300; null = never free
  deliveryAreas: ["العريش"],          // delivery is available inside El Arish only

  // Store details (placeholders)
  address: "العريش، شمال سيناء، مصر",
  addressDetail: "",                   // street / landmark, e.g. "شارع ... بجوار ..."
  mapsUrl: "",                         // Google Maps link; leave empty until the real address is known
  workingHours: "",                    // e.g. "يوميًا من 9 صباحًا حتى 11 مساءً"; empty shows a placeholder

  // Text of the top announcement bar
  announcement: "منتجات Healthy الطبيعية.. دلوقتي تقدر تطلبها لحد باب بيتك في العريش",

  // Safety cap for a single product in the cart
  maxQtyPerItem: 20,

  // While true, a visible notice tells visitors that products, prices and the
  // WhatsApp number are demo data. Set to false once the real data is in.
  demoMode: true,

  // Social links. Leave empty to show a muted "قريبًا" placeholder icon.
  social: { facebook: "", instagram: "", tiktok: "" }
};
