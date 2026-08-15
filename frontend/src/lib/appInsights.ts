import { ApplicationInsights } from "@microsoft/applicationinsights-web";

const connectionString = process.env.GATSBY_APPINSIGHTS_CONNECTION_STRING;

const appInsights = new ApplicationInsights({
  config: {
    connectionString,
    enableAutoRouteTracking: true,
    disableAjaxTracking: false,
    enableCorsCorrelation: true,
  },
});

export const initAppInsights = (): void => {
  if (!connectionString) {
    console.warn(
      "[AppInsights] No connection string configured, skipping init.",
    );
    return;
  }

  appInsights.loadAppInsights();
  appInsights.trackPageView();
};

export const trackException = (
  error: Error,
  properties?: Record<string, string>,
): void => {
  appInsights.trackException({ error, properties });
};

export const trackEvent = (
  name: string,
  properties?: Record<string, string>,
): void => {
  appInsights.trackEvent({ name, properties });
};

export const trackTrace = (
  message: string,
  properties?: Record<string, string>,
): void => {
  appInsights.trackTrace({ message, properties });
};

export { appInsights };
