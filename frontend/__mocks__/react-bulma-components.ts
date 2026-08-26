import * as React from "react";

const passthrough = ({ children, ...props }: any) => React.createElement("div", props, children);

module.exports = {
  Footer: passthrough,
  Content: passthrough,
  Navbar: Object.assign(passthrough, {
    Brand: passthrough,
    Item: passthrough,
    Burger: passthrough,
    Menu: passthrough,
  }),
};
