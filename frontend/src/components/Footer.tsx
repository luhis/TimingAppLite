import * as React from "react";
import { Footer as BulmaFooter } from "react-bulma-components";

export const Footer = () => (
  <BulmaFooter className="has-background-light mt-6">
    <div className="content has-text-centered">
      <p>
        <strong>Timing App Lite</strong> by Matt McCorry.{" "}
        <a
          href="https://github.com/luhis/TimingAppLite"
          target="_blank"
          rel="noopener noreferrer"
          className="has-text-link"
        >
          View on GitHub
        </a>
      </p>
    </div>
  </BulmaFooter>
);
