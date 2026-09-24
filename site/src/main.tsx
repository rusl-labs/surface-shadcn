import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../../example/src/styles.css";
import { App } from "./home";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
