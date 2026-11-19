/** @jest-environment node */

import { resolveSapphireSiteName } from "./sapphire-site-name";

beforeEach(() => {
  jest.replaceProperty(process, "env", {
    ...process.env,
    GATSBY_BACKEND_URL: "https://timingapplive.co.uk/",
  });
});

afterEach(() => jest.restoreAllMocks());

const getRequestedUrl = (input: RequestInfo | URL): string => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
};

test("extracts a site name using the configured base URL", async () => {
  jest.replaceProperty(process, "env", {
    ...process.env,
    GATSBY_BACKEND_URL: "https://events.example.test/base/",
  });
  const request = jest
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(
      new Response(
        '<a href="eventlist.php?sitename=MyTrack&other=1">Enter</a>',
      ),
    );
  await expect(resolveSapphireSiteName("1495")).resolves.toBe("MyTrack");
  expect(getRequestedUrl(request.mock.calls[0][0])).toBe(
    "https://events.example.test/base/eventlist.php?event=1495",
  );
});

test("reports a missing configured base URL", async () => {
  jest.replaceProperty(process, "env", {
    ...process.env,
    GATSBY_BACKEND_URL: undefined,
  });
  const request = jest.spyOn(globalThis, "fetch");
  await expect(resolveSapphireSiteName("1")).rejects.toThrow(
    "GATSBY_BACKEND_URL is not set",
  );
  expect(request).not.toHaveBeenCalled();
});

test("reports an upstream error or a missing site name", async () => {
  const request = jest.spyOn(globalThis, "fetch");
  request.mockResolvedValueOnce(new Response("", { status: 500 }));
  request.mockResolvedValueOnce(new Response("<html>No site name</html>"));
  await expect(resolveSapphireSiteName("1")).rejects.toThrow("(500)");
  await expect(resolveSapphireSiteName("2")).rejects.toThrow(
    "sitename not found",
  );
});

test("stops reading the response after finding the site name", async () => {
  const encoder = new TextEncoder();
  const pullCount = jest.fn();
  const cancel = jest.fn();
  const body = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        pullCount();
        if (pullCount.mock.calls.length === 1) {
          controller.enqueue(encoder.encode('<a href="?site'));
        } else if (pullCount.mock.calls.length === 2) {
          controller.enqueue(encoder.encode('name=MyTrack&other=1">'));
        } else {
          controller.enqueue(encoder.encode("unused response content"));
        }
      },
      cancel,
    },
    { highWaterMark: 0 },
  );
  jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(body));

  await expect(resolveSapphireSiteName("1499")).resolves.toBe("MyTrack");
  expect(pullCount).toHaveBeenCalledTimes(2);
  expect(cancel).toHaveBeenCalled();
});

test("follows the redirect with the Sapphire session cookie", async () => {
  const request = jest
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: {
          location: "eventdetails.php",
          "set-cookie": "PHPSESSID=test-session; path=/",
        },
      }),
    )
    .mockResolvedValueOnce(
      new Response('<a href="?sitename=MyTrack&other=1">Enter</a>'),
    );

  await expect(resolveSapphireSiteName("1496")).resolves.toBe("MyTrack");
  expect(getRequestedUrl(request.mock.calls[0][0])).toBe(
    "https://timingapplive.co.uk/eventlist.php?event=1496",
  );
  expect(request).toHaveBeenCalledTimes(2);
  expect(request.mock.calls[0][1]).toEqual(
    expect.objectContaining({ redirect: "manual" }),
  );
  expect(getRequestedUrl(request.mock.calls[1][0])).toBe(
    "https://timingapplive.co.uk/eventdetails.php",
  );
  expect(request.mock.calls[1][1]).toEqual(
    expect.objectContaining({
      redirect: "manual",
      headers: { Cookie: "PHPSESSID=test-session" },
    }),
  );
});

test("does not send the session cookie to another origin", async () => {
  const request = jest.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(null, {
      status: 302,
      headers: {
        location: "https://example.com/eventdetails.php",
        "set-cookie": "PHPSESSID=test-session; path=/",
      },
    }),
  );

  await expect(resolveSapphireSiteName("1471")).rejects.toThrow(
    "different origin",
  );
  expect(request).toHaveBeenCalledTimes(1);
});

test("reports invalid or excessive redirects", async () => {
  const request = jest.spyOn(globalThis, "fetch");
  request.mockResolvedValueOnce(new Response(null, { status: 302 }));
  await expect(resolveSapphireSiteName("1497")).rejects.toThrow(
    "missing a location",
  );

  request.mockImplementation(() =>
    Promise.resolve(
      new Response(null, {
        status: 302,
        headers: { location: "eventdetails.php" },
      }),
    ),
  );
  await expect(resolveSapphireSiteName("1498")).rejects.toThrow(
    "Too many Sapphire redirects",
  );
  expect(request).toHaveBeenCalledTimes(7);
});
