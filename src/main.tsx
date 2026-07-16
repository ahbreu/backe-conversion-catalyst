import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const root = createRoot(document.getElementById("root")!);

// GitHub Pages cannot emit frame-ancestors/X-Frame-Options headers. Refuse to
// render the lead form inside a third-party frame as a defense-in-depth guard.
root.render(window.self === window.top ? <App /> : null);
