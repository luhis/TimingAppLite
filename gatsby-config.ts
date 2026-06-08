import dotenv from "dotenv";
import type { GatsbyConfig } from "gatsby";

dotenv.config({ path: `.env.${process.env.NODE_ENV ?? "development"}` });
dotenv.config();

const config: GatsbyConfig = {
  siteMetadata: {
    title: "Timing App Lite",
    description: "Gatsby TypeScript leaderboard app backed by the Sapphire Solutions autotest API.",
    siteUrl: "https://timingapplite.mccorry.dev",
  },
  graphqlTypegen: true,
  plugins: [
    `gatsby-plugin-preact`,
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
        start_url: "/",
        icon: "static/favicon.svg",
      },
    },
  ],
};

export default config;
