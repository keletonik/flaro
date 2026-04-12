import { createRoot } from "react-dom/client";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

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
