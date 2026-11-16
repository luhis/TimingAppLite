/** @jest-environment node */

import { resolveSapphireSiteName } from "./sapphire-site-name";

afterEach(() => jest.restoreAllMocks());

test("extracts a site name from the direct Sapphire event page", async () => {
  const request = jest
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(
      new Response(
        '<a href="eventlist.php?sitename=MyTrack&other=1">Enter</a>',
      ),
    );
  await expect(resolveSapphireSiteName("1495")).resolves.toBe("MyTrack");
  expect(request.mock.calls[0][0].toString()).toBe(
    "https://autotest.sapphire-solutions.co.uk/eventlist.php?event=1495",
  );
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

  await expect(resolveSapphireSiteName("1495")).resolves.toBe("MyTrack");
  expect(request.mock.calls[0][0].toString()).toBe(
    "https://autotest.sapphire-solutions.co.uk/eventlist.php?event=1495",
  );
  expect(request).toHaveBeenCalledTimes(2);
  expect(request.mock.calls[0][1]).toEqual(
    expect.objectContaining({ redirect: "manual" }),
  );
  expect(request.mock.calls[1][0].toString()).toBe(
    "https://autotest.sapphire-solutions.co.uk/eventdetails.php",
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
  await expect(resolveSapphireSiteName("1495")).rejects.toThrow(
    "missing a location",
  );

  request.mockImplementation(
    async () =>
      new Response(null, {
        status: 302,
        headers: { location: "eventdetails.php" },
      }),
  );
  await expect(resolveSapphireSiteName("1495")).rejects.toThrow(
    "Too many Sapphire redirects",
  );
  expect(request).toHaveBeenCalledTimes(7);
});
