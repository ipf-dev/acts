import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app";
import "./styles.css";

const root = document.querySelector("#app");

if (!root) {
  throw new Error("#app element was not found.");
}

ReactDOM.createRoot(root).render(
  React.createElement(
    React.StrictMode,
    null,
    React.createElement(App)
  )
);
