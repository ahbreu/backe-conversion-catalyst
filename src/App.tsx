import { useEffect } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import Index from "./pages/Index.tsx";
import MarketingConsent from "@/components/MarketingConsent";
import { initCloudflareWebAnalytics } from "@/lib/cloudflareAnalytics";

const App = () => {
  useEffect(() => {
    initCloudflareWebAnalytics();
  }, []);

  return (
    <>
      <Sonner />
      <Index />
      <MarketingConsent />
    </>
  );
};

export default App;
