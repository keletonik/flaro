import { createRoot } from "react-dom/client";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

// Point the generated api-client-react hooks at a remote backend when the
// frontend is deployed on a different origin from the api server (e.g. the
// Vercel static host pointing at a Replit-hosted api). When VITE_API_BASE is
// unset we leave the base URL as-is and the hooks use same-origin relative
// paths, which is the Replit-all-in-one default.
const apiBase = import.meta.env.VITE_API_BASE as string | undefined;
if (apiBase) {
  setBaseUrl(apiBase.replace(/\/+$/, ""));
}

// Feed the generated api-client-react hooks the same bearer token that apiFetch
// reads from localStorage. Without this the React Query hooks bypass auth entirely.
setAuthTokenGetter(() => {
  try {
    return localStorage.getItem("ops-auth-token");
  } catch {
    return null;
  }
});

createRoot(document.getElementById("root")!).render(<App />);
