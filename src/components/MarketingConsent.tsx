import { useEffect, useState } from "react";
import { initMetaPixel, isMetaPixelConfigured, revokeMetaPixelConsent } from "@/lib/metaPixel";

const STORAGE_KEY = "backe_marketing_consent";
type Consent = "accepted" | "rejected" | null;

const getStoredConsent = (): Consent => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "accepted" || value === "rejected" ? value : null;
  } catch {
    return null;
  }
};

const MarketingConsent = () => {
  const [consent, setConsent] = useState<Consent>(getStoredConsent);
  const [isOpen, setIsOpen] = useState(() => getStoredConsent() === null);

  useEffect(() => {
    if (consent === "accepted") initMetaPixel();
  }, [consent]);

  if (!isMetaPixelConfigured()) return null;

  const choose = (value: Exclude<Consent, null>) => {
    try { localStorage.setItem(STORAGE_KEY, value); } catch { /* Consent remains valid for this page. */ }
    if (value === "rejected") revokeMetaPixelConsent();
    setConsent(value);
    setIsOpen(false);
  };

  return (
    <>
      {isOpen && (
        <aside className="fixed bottom-4 left-4 right-4 z-[100] mx-auto max-w-3xl rounded-2xl border border-primary/40 bg-background/95 p-5 shadow-2xl backdrop-blur" role="dialog" aria-label="Preferências de privacidade">
          <p className="font-heading text-base font-semibold text-foreground">Privacidade e medição</p>
          <p className="mt-2 font-body text-sm leading-relaxed text-muted-foreground">
            Usamos o Meta Pixel para medir campanhas somente com sua permissão. Cookies essenciais e a proteção do formulário continuam funcionando se você recusar. Veja a{" "}
            <a className="text-primary underline" href="/privacidade.html" target="_blank" rel="noreferrer">Política de Privacidade</a>.
          </p>
          <div className="mt-4 flex flex-wrap justify-end gap-3">
            <button className="rounded-full border border-primary px-5 py-2 font-heading text-sm text-foreground" type="button" onClick={() => choose("rejected")}>Recusar marketing</button>
            <button className="rounded-full bg-primary px-5 py-2 font-heading text-sm font-semibold text-primary-foreground" type="button" onClick={() => choose("accepted")}>Aceitar marketing</button>
          </div>
        </aside>
      )}
      {!isOpen && consent && (
        <button className="fixed bottom-3 left-3 z-[90] rounded-full border border-border bg-background/90 px-3 py-2 font-body text-xs text-muted-foreground shadow backdrop-blur" type="button" onClick={() => setIsOpen(true)}>
          Privacidade
        </button>
      )}
    </>
  );
};

export default MarketingConsent;
