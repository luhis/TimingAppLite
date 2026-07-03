import * as React from "react";
import { Link, HeadFC, PageProps } from "gatsby";

const NotFoundPage = ({}: PageProps) => {
  return (
    <section className="section">
      <div className="container">
        <h1 className="title">Page not found</h1>
        <p className="subtitle">
          Sorry, we couldn&apos;t find what you were looking for.
        </p>
        <Link to="/" className="button is-primary">
          Go home
        </Link>
      </div>
    </section>
  );
};

export default NotFoundPage;

export const Head: HeadFC = () => <title>Not found</title>;
