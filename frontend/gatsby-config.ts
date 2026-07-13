// @ts-expect-error: TS2304: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node`.
import dotenv from "dotenv";

import type { GatsbyConfig } from "gatsby";

// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
dotenv.config({ path: `.env.${process.env.NODE_ENV ?? "development"}` });

// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
dotenv.config();

const isProd = process.env.NODE_ENV === "production";

const config: GatsbyConfig = {
  siteMetadata: {
    title: "Timing App Lite",
    description: "Gatsby TypeScript leaderboard app backed by the Sapphire Solutions autotest API.",
    siteUrl: "https://timingapplite.mccorry.dev",
  },
  graphqlTypegen: true,
  plugins: [
    `gatsby-plugin-preact`,
    ...(isProd
      ? [
          {
            resolve: `gatsby-plugin-google-gtag`,
            options: {
              trackingIds: ["G-W4H1SJZHT3"],
            },
          },
          {
            resolve: `gatsby-plugin-manifest`,
            options: {
              name: "Timing App Lite",
              short_name: "Timing App",
              description: "Install Timing App Lite for quick access to leaderboard results.",
              start_url: "/",
              background_color: "#ffffff",
              theme_color: "#1f2937",
              display: "standalone",
              orientation: "portrait",
              icon: "static/favicon.svg",
              icons: [
                { src: "icons/icon-48x48.png", sizes: "48x48", type: "image/png", purpose: "any" },
                { src: "icons/icon-72x72.png", sizes: "72x72", type: "image/png", purpose: "any" },
                { src: "icons/icon-96x96.png", sizes: "96x96", type: "image/png", purpose: "any" },
                { src: "icons/icon-144x144.png", sizes: "144x144", type: "image/png", purpose: "any" },
                { src: "icons/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
                { src: "icons/icon-256x256.png", sizes: "256x256", type: "image/png", purpose: "any" },
                { src: "icons/icon-384x384.png", sizes: "384x384", type: "image/png", purpose: "any" },
                { src: "icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
              ],
            },
          },
          {
            resolve: `gatsby-plugin-offline`,
          },
        ]
      : []),
  ],
};

export default config;
