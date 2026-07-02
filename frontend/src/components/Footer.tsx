import { Footer as BulmaFooter, Content } from "react-bulma-components";

export const Footer = () => (
  <BulmaFooter className="mt-6">
    <Content className="content has-text-centered">
      <p>
        <strong>Timing App Lite</strong> by{" "}
        <a
          href="https://mccorry.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="has-text-link"
        >
          Mangaji LTD
        </a>
        .{" "}
        <a
          href="https://github.com/luhis/TimingAppLite"
          target="_blank"
          rel="noopener noreferrer"
          className="has-text-link"
        >
          View on GitHub
        </a>
      </p>
      <p>
        App is currently in Beta and may experience ~20sec backend server boot
        times due to cost constraints.
      </p>
    </Content>
  </BulmaFooter>
);
