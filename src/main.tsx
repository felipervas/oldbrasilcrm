import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register service worker only in production to avoid stale preview caches
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    if (import.meta.env.PROD) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
      return;
    }

    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });

    if ("caches" in window) {
      caches.keys().then((keys) => {
        keys.forEach((key) => caches.delete(key));
      });
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
