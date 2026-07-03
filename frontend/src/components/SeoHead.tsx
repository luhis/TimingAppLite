import * as React from "react";

import { getSeoMetadata, type SeoOptions } from "../lib/seo";

export const SeoHead = ({
  description,
  path,
  title,
  type,
}: SeoOptions) => {
  const seo = getSeoMetadata({
    description,
    path,
    title,
    type,
  });

  return (
    <>
      <title>{seo.title}</title>
      <meta name="description" content={seo.description} />
      <meta property="og:title" content={seo.title} />
      <meta property="og:description" content={seo.description} />
      <meta property="og:type" content={seo.type} />
      <meta property="og:url" content={seo.canonicalUrl} />
      <meta property="og:site_name" content={seo.siteName} />
      <meta property="og:image" content={seo.imageUrl} />
      <meta property="og:image:alt" content={seo.imageAlt} />
      <meta name="twitter:card" content={seo.twitterCard} />
      <meta name="twitter:title" content={seo.title} />
      <meta name="twitter:description" content={seo.description} />
      <meta name="twitter:image" content={seo.imageUrl} />
      <meta name="twitter:image:alt" content={seo.imageAlt} />
      <link rel="canonical" href={seo.canonicalUrl} />
    </>
  );
};
