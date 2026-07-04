export type SeoOptions = {
  readonly description: string;
  readonly path: string;
  readonly title: string;
  readonly type?: "article" | "website";
};

export type SeoMetadata = {
  readonly canonicalUrl: string;
  readonly description: string;
  readonly imageAlt: string;
  readonly imageUrl: string;
  readonly siteName: string;
  readonly title: string;
  readonly twitterCard: "summary_large_image";
  readonly type: "article" | "website";
};

const siteName = "Timing App Lite";
// Keep in sync with siteMetadata.siteUrl in gatsby-config.ts
const siteUrl = "https://timingapplite.mccorry.dev";
const socialImagePath = "/social-mini-autotest-512.svg";

export const getSeoMetadata = ({
  description,
  path,
  title,
  type = "website",
}: SeoOptions): SeoMetadata => ({
  canonicalUrl: new URL(path, siteUrl).toString(),
  description,
  imageAlt: `${siteName} cartoon mini grass autotest illustration`,
  imageUrl: new URL(socialImagePath, siteUrl).toString(),
  siteName,
  title,
  twitterCard: "summary_large_image",
  type,
});
