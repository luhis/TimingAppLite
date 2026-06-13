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
        description: "Install Timing App Lite for quick access to leaderboard results.",
        start_url: "/",
        background_color: "#ffffff",
        theme_color: "#1f2937",
        display: "standalone",
        orientation: "portrait",
        icon: "static/favicon.svg",
      },
    },
  ],
};

export default config;
