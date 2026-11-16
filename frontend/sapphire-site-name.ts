const MAX_REDIRECTS = 5;

export const resolveSapphireSiteName = async (
  competitionId: string,
): Promise<string> => {
  const url = new URL(
    "https://autotest.sapphire-solutions.co.uk/eventlist.php",
  );
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

    const html = await response.text();
    const match = /sitename=([^"&]+)/.exec(html);
    if (!match) {
      throw new Error("sitename not found in event list");
    }
    return match[1];
  };

  return fetchPage(url, 0);
};
