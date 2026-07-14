import "bulma/css/bulma.min.css";
import "@creativebulma/bulma-tooltip/dist/bulma-tooltip.min.css";

import { initAppInsights } from "./src/lib/appInsights";

export const onClientEntry = () => {
  initAppInsights();
};
