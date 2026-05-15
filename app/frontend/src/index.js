import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

try {
  const savedTheme = localStorage.getItem("qp_theme") || "dark";
  document.documentElement.classList.toggle("dark", savedTheme === "dark");
  document.documentElement.style.colorScheme = savedTheme;
} catch (e) {
  document.documentElement.classList.add("dark");
  document.documentElement.style.colorScheme = "dark";
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);


