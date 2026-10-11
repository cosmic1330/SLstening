import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import './i18n';
import { DiagnosticsErrorBoundary, initializeDiagnostics } from "./diagnostics";

initializeDiagnostics();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <DiagnosticsErrorBoundary><App /></DiagnosticsErrorBoundary>
  </React.StrictMode>,
);
