import { ApplicationInsights } from "@microsoft/applicationinsights-web";

const connectionString = process.env.GATSBY_APPINSIGHTS_CONNECTION_STRING;
const appInsights =
  typeof window === "undefined" || !connectionString
    ? null
    : new ApplicationInsights({
        config: {
          connectionString,
          enableAutoRouteTracking: true,
          disableAjaxTracking: false,
          enableCorsCorrelation: true,
        },
      });

const getAppInsights = (): ApplicationInsights | null => appInsights;

export const initAppInsights = (): void => {
  const insights = getAppInsights();

  if (!insights) {
    if (connectionString) {
      console.warn("[AppInsights] Not running in browser, skipping init.");
    } else {
      console.warn(
        "[AppInsights] No connection string configured, skipping init.",
      );
    }
    return;
  }

  insights.loadAppInsights();
  insights.trackPageView();
};

export const trackException = (
  error: Error,
  properties?: Record<string, string>,
): void => {
  const insights = getAppInsights();
  insights?.trackException({ error, properties });
};

export const trackEvent = (
  name: string,
  properties?: Record<string, string>,
): void => {
  const insights = getAppInsights();
  insights?.trackEvent({ name, properties });
};

export const trackTrace = (
  message: string,
  properties?: Record<string, string>,
): void => {
  const insights = getAppInsights();
  insights?.trackTrace({ message, properties });
};

export { appInsights };
