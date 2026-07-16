import { Toaster as Sonner } from "@/components/ui/sonner";
import Index from "./pages/Index.tsx";
import MarketingConsent from "@/components/MarketingConsent";

const App = () => {
  return (
    <>
      <Sonner />
      <Index />
      <MarketingConsent />
    </>
  );
};

export default App;
