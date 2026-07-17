export const onSetResponseHeaders = ({ setHeader }) => {
  setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' https://www.googletagmanager.com https://js.monitor.azure.com",
      "style-src 'self'",
      "img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com",
      "connect-src 'self' https://timingapplite.purplesea-f465acb7.uksouth.azurecontainerapps.io wss://timingapplite.purplesea-f465acb7.uksouth.azurecontainerapps.io https://westeurope-5.in.applicationinsights.azure.com https://js.monitor.azure.com https://www.google-analytics.com",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  );
};
