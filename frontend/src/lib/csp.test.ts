import * as fs from "fs";
import * as path from "path";

// Hosts that SignalR connects to over WebSockets must expose a wss:// entry
// in connect-src, not just https://, otherwise the browser blocks the
// upgrade (this happened for the azurewebsites.net backend previously).
const WEBSOCKET_HOST_PATTERN = /(azurewebsites\.net|azurecontainerapps\.io)$/;

interface StaticWebAppConfig {
  globalHeaders: { "Content-Security-Policy": string };
}

function extractConnectSrcOrigins(csp: string): string[] {
  const match = csp.match(/connect-src([^;]*)/);
  const directive = match?.[1] ?? "";
  return directive
    .trim()
    .split(/\s+/)
    .filter((token) => token !== "" && token !== "'self'");
}

function readGatsbySsrConnectSrc(): string[] {
  const content = fs.readFileSync(
    path.join(__dirname, "../../gatsby-ssr.js"),
    "utf-8",
  );
  const arrayMatch = content.match(/\[([\s\S]*?)\]\s*\.join/);
  const directives = [...(arrayMatch?.[1] ?? "").matchAll(/"([^"]*)"/g)].map(
    (m) => m[1],
  );
  return extractConnectSrcOrigins(directives.join("; "));
}

function readStaticWebAppConnectSrc(file: string): string[] {
  const config = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../..", file), "utf-8"),
  ) as StaticWebAppConfig;
  return extractConnectSrcOrigins(
    config.globalHeaders["Content-Security-Policy"],
  );
}

function assertWssCounterpartForEachHttpsBackend(origins: string[]) {
  const httpsBackendHosts = origins
    .filter(
      (origin) =>
        origin.startsWith("https://") && WEBSOCKET_HOST_PATTERN.test(origin),
    )
    .map((origin) => origin.replace("https://", ""));

  httpsBackendHosts.forEach((host) => {
    expect(origins).toContain(`wss://${host}`);
  });
}

describe("Content-Security-Policy connect-src", () => {
  it("allows a wss:// upgrade for every azurewebsites.net/azurecontainerapps.io backend in gatsby-ssr.js", () => {
    assertWssCounterpartForEachHttpsBackend(readGatsbySsrConnectSrc());
  });

  it("allows a wss:// upgrade for every azurewebsites.net/azurecontainerapps.io backend in static/staticwebapp.config.json", () => {
    assertWssCounterpartForEachHttpsBackend(
      readStaticWebAppConnectSrc("static/staticwebapp.config.json"),
    );
  });

  it("keeps gatsby-ssr.js and static/staticwebapp.config.json connect-src origins in sync", () => {
    const ssrOrigins = [...readGatsbySsrConnectSrc()].sort();
    const swaOrigins = [...readStaticWebAppConnectSrc(
      "static/staticwebapp.config.json",
    )].sort();
    expect(swaOrigins).toEqual(ssrOrigins);
  });
});
