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
const siteUrl = "https://timingapplite.mccorry.dev";
const socialImagePath = "/icons/icon-512x512.png";

export const getSeoMetadata = ({
  description,
  path,
  title,
  type = "website",
}: SeoOptions): SeoMetadata => ({
  canonicalUrl: new URL(path, siteUrl).toString(),
  description,
  imageAlt: `${siteName} icon`,
  imageUrl: new URL(socialImagePath, siteUrl).toString(),
  siteName,
  title,
  twitterCard: "summary_large_image",
  type,
});
