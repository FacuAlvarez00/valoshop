const config = {
  storeName: "ValoShop",
  storeTagline: "Las mejores cuentas de Valorant",
  contact: {
    whatsapp: "", // e.g. "5491112345678"
    discord: "", // e.g. "username#0000"
    email: "",
  },
  defaultCurrency: "USD",
  // Show admin panel (only in dev by default)
  adminEnabled: process.env.NODE_ENV === "development",
};

export default config;
