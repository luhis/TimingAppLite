import { Icon } from "react-bulma-components";
import { newValidDate, ValidDate } from "ts-date";
import * as React from "react";

export const CompetitionDate: React.FC<{ date: ValidDate | null }> = ({
  date,
}) => {
  if (date === null) {
    return null;
  }
  const today = newValidDate();
  const isToday = date.toDateString() === today.toDateString();
  if (isToday) {
    return (
      <Icon className="is-size-3" size="large" title="Today">
        🗓️
      </Icon>
    );
  }
  const isSoon =
    date > today && date.getTime() - today.getTime() < 7 * 24 * 60 * 60 * 1000; // within the next week
  if (isSoon) {
    return (
      <Icon className="is-size-3" size="large" title="Soon">
        🔜
      </Icon>
    );
  }
  return null;
};
