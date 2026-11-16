type CompetitionForSiteName = {
  readonly competitionId: string;
  readonly name: string;
  readonly dateddmmyyyy: string | null;
};

type CompetitionSiteName = {
  readonly competitionId: string;
  readonly siteName: string;
};

export const createCompetitionSiteNameMap = (
  siteNames: readonly CompetitionSiteName[],
) =>
  new Map(
    siteNames.map(({ competitionId, siteName }) => [competitionId, siteName]),
  );

export const createEventSiteNameLookup = (
  competitions: readonly CompetitionForSiteName[],
  siteNames: readonly CompetitionSiteName[],
) => {
  const namesById = createCompetitionSiteNameMap(siteNames);
  return (name: unknown, date: unknown): string | null => {
    if (
      typeof name !== "string" ||
      !name ||
      typeof date !== "string" ||
      !date
    ) {
      return null;
    }

    const matches = competitions.filter(
      (competition) =>
        competition.name === name && competition.dateddmmyyyy === date,
    );
    return matches.length === 1
      ? (namesById.get(matches[0].competitionId) ?? null)
      : null;
  };
};
