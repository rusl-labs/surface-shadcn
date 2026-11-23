import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SurfaceProvider } from "@rusl-labs/surface-shadcn";
import { Playground } from "./playground";
import "./styles.css";

// Blueprint field: 24px square grid (6 × the site's 4px spacing module).
function Workspace() {
  return <SurfaceProvider locale="en-US" defaultCountry="US" defaultCurrency="USD">
    <div className="min-h-svh bg-background" style={{
      backgroundImage: "linear-gradient(to right, oklch(0.6 0.12 245 / 0.08) 1px, transparent 1px), linear-gradient(to bottom, oklch(0.6 0.12 245 / 0.08) 1px, transparent 1px)",
      backgroundSize: "24px 24px",
    }}>
      <header className="flex flex-wrap items-center justify-between gap-4 border-b bg-background/95 px-6 py-4">
        <div className="flex flex-wrap items-center gap-4">
          <a href={import.meta.env.BASE_URL} className="text-sm text-muted-foreground hover:text-foreground">← surface-shadcn</a>
          <h1 className="text-xl font-semibold tracking-tight">Playground</h1>
        </div>
        <p className="font-mono text-xs text-muted-foreground">SCHEMA / ANNOTATION / DATA</p>
      </header>
      <main className="p-4 md:p-6">
        <Playground expanded />
      </main>
    </div>
  </SurfaceProvider>;
}

createRoot(document.getElementById("root")!).render(<StrictMode><Workspace /></StrictMode>);
