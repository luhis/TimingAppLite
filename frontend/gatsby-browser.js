import "bulma/css/bulma.min.css";
import "@creativebulma/bulma-tooltip/dist/bulma-tooltip.min.css";

import React from "react";
import { initAppInsights, trackException } from "./src/lib/appInsights";
import { ErrorBoundary } from "./src/components/ErrorBoundary";

export const onClientEntry = () => {
  initAppInsights();

  window.addEventListener("error", (event) => {
    trackException(event.error ?? new Error(event.message), {
      filename: event.filename,
      lineno: String(event.lineno),
      colno: String(event.colno),
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const error =
      event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason));
    trackException(error, { type: "unhandledrejection" });
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.update();

      setInterval(() => {
        registration.update();
      }, 24 * 60 * 60 * 1000);

      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    });
  }
};

export const wrapRootElement = ({ element }) => (
  <ErrorBoundary>{element}</ErrorBoundary>
);
