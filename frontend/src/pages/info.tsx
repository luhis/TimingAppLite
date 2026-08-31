import * as React from "react";
import { type HeadFC } from "gatsby";
import {
  Container,
  Content,
  Heading,
  Hero,
  Section,
} from "react-bulma-components";

import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";
import { SeoHead } from "../components/SeoHead";

const InfoPage = () => {
  return (
    <>
      <Navbar />
      <Section>
        <Container>
          <Hero className="is-info is-small">
            <Hero.Body>
              <Heading renderAs="h2" size={3} className="mb-2">
                How It Works
              </Heading>
              <p>Learn about real-time streaming and notifications.</p>
            </Hero.Body>
          </Hero>

          <Content>
            <h3>Result Streaming</h3>
            <p>
              Timing App Lite uses <strong>SignalR</strong> over WebSockets to
              receive live leaderboard updates directly from the server. When
              you open a competition page, the app connects to the backend and
              subscribes to row, column, and competition-level updates.
            </p>
            <p>
              Streaming is enabled automatically when all of the following are
              true:
            </p>
            <ul>
              <li>
                The <strong>&quot;Live stream results&quot;</strong> checkbox is
                toggled on in the sidebar.
              </li>
              <li>
                The competition status is <strong>Live</strong>.
              </li>
              <li>
                The event date is <strong>today</strong> (or you are running in
                development mode).
              </li>
            </ul>
            <p>
              When streaming is active, incoming results are merged into the
              existing table. New entries are appended, and existing entries are
              updated in place. The table stays sorted by the original result
              order.
            </p>
            <p>
              If you prefer not to stream, you can disable the checkbox and use
              the <strong>&quot;Refresh now&quot;</strong> button to fetch the
              latest results on demand.
            </p>

            <h3>Notifications</h3>
            <p>
              Timing App Lite can send browser notifications when a{" "}
              <strong>favourited entrant</strong> receives a new result while
              streaming is active.
            </p>
            <h4>How to enable notifications</h4>
            <ol>
              <li>
                Open a live competition and click the <strong>star icon</strong>{" "}
                next to an entrant to mark them as a favourite.
              </li>
              <li>When prompted, allow notifications in your browser.</li>
              <li>
                As new results stream in, you will receive a notification for
                each favourited entrant&apos;s update.
              </li>
            </ol>
            <h4>Notification details</h4>
            <ul>
              <li>
                <strong>Title:</strong> Shows the entrant number, driver name,
                and position (e.g. &quot;42 - John Smith (P3)&quot;).
              </li>
              <li>
                <strong>Body:</strong> Includes the competition name and the
                latest test result when available.
              </li>
              <li>
                Duplicate notifications for the same entrant are automatically
                collapsed.
              </li>
            </ul>
            <p>
              Favourites are stored in memory for the current session. If you
              reload the page, you will need to re-select your favourites.
            </p>

            <h3>Privacy</h3>
            <p>
              No data is stored on external servers. Streaming connections are
              made directly to the Timing App Lite backend, and notification
              preferences are handled entirely by your browser.
            </p>
          </Content>
        </Container>
        <Footer />
      </Section>
    </>
  );
};

export default InfoPage;

export const Head: HeadFC = () => (
  <SeoHead
    title="How It Works · Timing App Lite"
    description="Learn how real-time result streaming and browser notifications work in Timing App Lite."
    path="/info"
  />
);
