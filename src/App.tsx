import { useEffect, useState } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import Index from "./pages/Index.tsx";
import SistemaBarbeariaSP from "./pages/SistemaBarbeariaSP.tsx";
import GestaoAgendaBarbearia from "./pages/GestaoAgendaBarbearia.tsx";
import SoftwareSalaoBeleza from "./pages/SoftwareSalaoBeleza.tsx";
import AutomacaoPequenasEmpresas from "./pages/AutomacaoPequenasEmpresas.tsx";
import Blog from "./pages/Blog.tsx";
import BlogPost from "./pages/BlogPost.tsx";
import Parceiros from "./pages/Parceiros.tsx";

const BLOG_SLUGS = [
  "marketing-para-pequenas-empresas",
  "trafego-pago-para-iniciantes",
  "branding-identidade-visual",
];

const routes: Record<string, React.ComponentType | ((props: unknown) => JSX.Element)> = {
  "/sistema-para-barbearia-sao-paulo": SistemaBarbeariaSP,
  "/gestao-de-agenda-para-barbearia": GestaoAgendaBarbearia,
  "/software-para-salao-de-beleza": SoftwareSalaoBeleza,
  "/automacao-para-pequenas-empresas": AutomacaoPequenasEmpresas,
  "/blog": Blog,
  "/parceiros": Parceiros,
};

BLOG_SLUGS.forEach((slug) => {
  routes[`/blog/${slug}`] = () => <BlogPost slug={slug} />;
});

const getRoute = () => {
  const hash = window.location.hash.replace("#", "") || "/";
  if (routes[hash]) return hash;
  return "/";
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
