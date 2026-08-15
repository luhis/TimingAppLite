import { getSeoMetadata } from "./seo";

describe("getSeoMetadata", () => {
  test("returns correct metadata for basic page", () => {
    const result = getSeoMetadata({
      title: "My Page",
      description: "A test page",
      path: "/my-page",
    });

    expect(result.title).toBe("My Page");
    expect(result.description).toBe("A test page");
    expect(result.canonicalUrl).toBe(
      "https://timingapplite.mccorry.dev/my-page",
    );
    expect(result.siteName).toBe("Timing App Lite");
    expect(result.twitterCard).toBe("summary_large_image");
    expect(result.type).toBe("website");
  });

  test("uses type when provided", () => {
    const result = getSeoMetadata({
      title: "Article",
      description: "An article",
      path: "/article",
      type: "article",
    });

    expect(result.type).toBe("article");
  });

  test("constructs image URL from socialImagePath", () => {
    const result = getSeoMetadata({
      title: "Test",
      description: "Test",
      path: "/",
    });

    expect(result.imageUrl).toBe(
      "https://timingapplite.mccorry.dev/social-mini-autotest-512.svg",
    );
    expect(result.imageAlt).toBe(
      "Timing App Lite cartoon mini grass autotest illustration",
    );
  });

  test("handles root path", () => {
    const result = getSeoMetadata({
      title: "Home",
      description: "Home page",
      path: "/",
    });

    expect(result.canonicalUrl).toBe("https://timingapplite.mccorry.dev/");
  });
});
