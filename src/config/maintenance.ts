const maintenanceModeValue = String(import.meta.env.VITE_MAINTENANCE_MODE ?? "false").toLowerCase();

export const MAINTENANCE_MODE = ["1", "true", "yes"].includes(maintenanceModeValue);

const publicWhatsAppPhone = String(import.meta.env.VITE_PUBLIC_WHATSAPP_PHONE || "").replace(/\D/g, "");
const publicWhatsAppMessage =
  import.meta.env.VITE_PUBLIC_WHATSAPP_MESSAGE ||
  "Olá, vim pelo site da BACKE.co e quero entender como automatizar atendimento e captação de leads.";
const publicWhatsAppHref = publicWhatsAppPhone
  ? `https://wa.me/${publicWhatsAppPhone}?text=${encodeURIComponent(publicWhatsAppMessage)}`
  : null;

export const MAINTENANCE_CONTACT = {
  label: publicWhatsAppHref ? "Fale pelo WhatsApp" : "Fale com a Backe",
  href: publicWhatsAppHref || "mailto:contato@backe.com.br",
};
