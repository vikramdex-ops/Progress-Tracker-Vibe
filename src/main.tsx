import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./lib/auth";
import { TestModeProvider } from "./lib/test-mode";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <TestModeProvider>
        <App />
      </TestModeProvider>
    </AuthProvider>
  </React.StrictMode>
);
