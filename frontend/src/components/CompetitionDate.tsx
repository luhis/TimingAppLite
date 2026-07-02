import { Icon } from "react-bulma-components";
import { newValidDate, type ValidDate } from "ts-date";

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type CompetitionDateProps = {
  readonly date: ValidDate | null;
};

export const CompetitionDate = ({ date }: CompetitionDateProps) => {
  if (!date) return null;

  const today = newValidDate();

  if (date.toDateString() === today.toDateString()) {
    return (
      <Icon className="is-size-4" title="Today">
        🗓️
      </Icon>
    );
  }

  if (date > today && date.getTime() - today.getTime() < ONE_WEEK_MS) {
    return (
      <Icon className="is-size-4" title="Soon">
        🔜
      </Icon>
    );
  }

  return null;
};
