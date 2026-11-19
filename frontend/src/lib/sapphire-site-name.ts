const MAX_REDIRECTS = 5;
const SITE_NAME_MARKER = "sitename=";

const fetchSapphireSiteName = async (
  competitionId: string,
): Promise<string> => {
  const baseUrl = process.env.GATSBY_BACKEND_URL;
  if (!baseUrl) throw new Error("GATSBY_BACKEND_URL is not set");
  const url = new URL(`${baseUrl.replace(/\/+$/, "")}/eventlist.php`);
  url.searchParams.set("event", competitionId);

  const origin = url.origin;
  const signal = AbortSignal.timeout(30_000);

  const fetchPage = async (
    currentUrl: URL,
    redirects: number,
    sessionCookie?: string,
  ): Promise<string> => {
    // Node's fetch does not retain Sapphire's session cookie across redirects.
    const response = await fetch(currentUrl, {
      signal,
      redirect: "manual",
      headers: sessionCookie ? { Cookie: sessionCookie } : undefined,
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      const cookie = response.headers
        .getSetCookie()
        .find((value) => value.startsWith("PHPSESSID="));
      await response.body?.cancel();
      if (!location) {
        throw new Error("Sapphire redirect is missing a location");
      }
      if (redirects === MAX_REDIRECTS) {
        throw new Error("Too many Sapphire redirects");
      }
      const nextUrl = new URL(location, currentUrl);
      if (nextUrl.origin !== origin) {
        throw new Error("Sapphire redirected to a different origin");
      }
      return fetchPage(
        nextUrl,
        redirects + 1,
        cookie ? cookie.split(";", 1)[0] : sessionCookie,
      );
    }

    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(
        `Unable to load Sapphire event page (${response.status})`,
      );
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("sitename not found in event list");

    const decoder = new TextDecoder();
    const readSiteName = async (text: string): Promise<string> => {
      const { value, done } = await reader.read();
      const nextText = text + decoder.decode(value, { stream: !done });
      const markerIndex = nextText.indexOf(SITE_NAME_MARKER);

      if (markerIndex >= 0) {
        const valueStart = markerIndex + SITE_NAME_MARKER.length;
        const siteName = nextText.slice(valueStart);
        const terminatorIndex = /[&"]/.exec(siteName)?.index;
        if (terminatorIndex !== undefined) {
          if (terminatorIndex > 0) {
            await reader.cancel();
            return siteName.slice(0, terminatorIndex);
          }
          return readSiteName(siteName.slice(1));
        }
        if (done && siteName.length > 0) return siteName;
        if (done) throw new Error("sitename not found in event list");
        return readSiteName(`${SITE_NAME_MARKER}${siteName}`);
      }

      if (done) throw new Error("sitename not found in event list");
      return readSiteName(nextText.slice(-(SITE_NAME_MARKER.length - 1)));
    };

    return readSiteName("").finally(() => reader.releaseLock());
  };

  return fetchPage(url, 0);
};

export const resolveSapphireSiteName = (
  competitionId: string,
): Promise<string> => fetchSapphireSiteName(competitionId);
