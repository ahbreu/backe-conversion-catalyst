import { useEffect, useState } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import Index from "./pages/Index.tsx";
import SistemaBarbeariaSP from "./pages/SistemaBarbeariaSP.tsx";
import GestaoAgendaBarbearia from "./pages/GestaoAgendaBarbearia.tsx";
import SoftwareSalaoBeleza from "./pages/SoftwareSalaoBeleza.tsx";
import AutomacaoPequenasEmpresas from "./pages/AutomacaoPequenasEmpresas.tsx";
import Blog from "./pages/Blog.tsx";

const routes: Record<string, React.ComponentType> = {
  "/sistema-para-barbearia-sao-paulo": SistemaBarbeariaSP,
  "/gestao-de-agenda-para-barbearia": GestaoAgendaBarbearia,
  "/software-para-salao-de-beleza": SoftwareSalaoBeleza,
  "/automacao-para-pequenas-empresas": AutomacaoPequenasEmpresas,
  "/blog": Blog,
};

const getRoute = () => {
  const hash = window.location.hash.replace("#", "") || "/";
  return routes[hash] ? hash : "/";
};

const App = () => {
  const [route, setRoute] = useState(getRoute);

  useEffect(() => {
    const handleHashChange = () => setRoute(getRoute());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const Page = routes[route] || Index;

  return (
    <>
      <Sonner />
      <Page />
    </>
  );
};

export default App;
