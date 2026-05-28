import dotenv from "dotenv";
import type { GatsbyConfig } from "gatsby"

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
    "gatsby-plugin-image",
    "gatsby-plugin-sharp",
    "gatsby-transformer-sharp",
    {
      resolve: "gatsby-source-filesystem",
      options: {
        name: "images",
        path: "./src/images/",
      },
      __key: "images",
    },
  ],
}

export default config
