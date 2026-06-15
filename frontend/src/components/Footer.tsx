import * as React from "react";
import { Footer as BulmaFooter, Content } from "react-bulma-components";

export const Footer = () => (
  <BulmaFooter className="mt-6">
    <Content className="content has-text-centered">
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
    </Content>
  </BulmaFooter>
);
