import * as React from "react"
import type { HeadFC, PageProps } from "gatsby"
import { useEffect, useMemo, useState } from "react"
import "../styles/site.css"

type Competition = {
  id: string
  active: string
  name: string
  dateddmmyyyy: string
  provisional: string | null
  finalised: string | null
}

type LeaderboardSummary = {
  id: string | number
  name: string
}

type LeaderboardColumn = {
  name: string
  label: string
}

type LeaderboardItem = Record<string, string | number | null | undefined>

type LeaderboardPayload = {
  columns: LeaderboardColumn[]
  items: LeaderboardItem[]
}

type FilterState = {
  query: string
  driver: string
  club: string
  className: string
}

const API_BASE = "https://autotest.sapphire-solutions.co.uk/API/1"

const initialFilters: FilterState = {
  query: "",
  driver: "",
  club: "",
  className: "",
}

const competitionStatusLabel = (active: string) => {
  switch (active) {
    case "0":
      return "Live"
    case "1":
      return "Scheduled"
    case "2":
      return "Finalised"
    case "3":
      return "Provisional"
    default:
      return "Open"
  }
}

const stringifyCell = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") {
    return "-"
  }

  return String(value)
}

const rowSearchText = (item: LeaderboardItem) =>
  Object.values(item)
    .map(value => stringifyCell(value).toLowerCase())
    .join(" ")

const isSectionRow = (item: LeaderboardItem) => {
  const meaningfulValues = Object.entries(item).filter(([, value]) => stringifyCell(value) !== "-")

  return meaningfulValues.length === 1 && Object.prototype.hasOwnProperty.call(item, "classname")
}

const formatMeta = (competition: Competition | null) => {
  if (!competition) {
    return "Waiting for live data"
  }

  if (competition.finalised) {
    return `Finalised ${competition.finalised}`
  }

  if (competition.provisional) {
    return `Provisional ${competition.provisional}`
  }

  return `${competition.dateddmmyyyy} event feed`
}

const IndexPage: React.FC<PageProps> = ({ location }) => {
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [leaderboards, setLeaderboards] = useState<LeaderboardSummary[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardPayload | null>(null)
  const [competitionId, setCompetitionId] = useState("")
  const [leaderboardId, setLeaderboardId] = useState("")
  const [filters, setFilters] = useState<FilterState>(initialFilters)
  const [loadingCompetitions, setLoadingCompetitions] = useState(true)
  const [loadingLeaderboards, setLoadingLeaderboards] = useState(false)
  const [loadingResults, setLoadingResults] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const requestedCompetitionId = queryParams.get("competitionid") ?? ""
  const requestedLeaderboardId = queryParams.get("leaderboardid") ?? ""

  useEffect(() => {
    let cancelled = false

    const loadCompetitions = async () => {
      setLoadingCompetitions(true)
      setError(null)

      try {
        const response = await fetch(`${API_BASE}/LiveCompetitions/`)

        if (!response.ok) {
          throw new Error(`Unable to load competitions (${response.status})`)
        }

        const data = (await response.json()) as Competition[]

        if (cancelled) {
          return
        }

        setCompetitions(data)

        const preferredCompetition = data.find(item => item.id === requestedCompetitionId) ?? data[0]

        setCompetitionId(preferredCompetition?.id ?? "")
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : "Unable to load competitions")
        }
      } finally {
        if (!cancelled) {
          setLoadingCompetitions(false)
        }
      }
    }

    loadCompetitions()

    return () => {
      cancelled = true
    }
  }, [requestedCompetitionId])

  useEffect(() => {
    if (!competitionId) {
      setLeaderboards([])
      setLeaderboard(null)
      return
    }

    let cancelled = false
    const controller = new AbortController()

    const loadLeaderboards = async () => {
      setLoadingLeaderboards(true)
      setError(null)

      try {
        const response = await fetch(`${API_BASE}/Competitions/${competitionId}/Leaderboards/`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`Unable to load leaderboard list (${response.status})`)
        }

        const data = (await response.json()) as LeaderboardSummary[]

        if (cancelled) {
          return
        }

        setLeaderboards(data)

        const preferredLeaderboard = data.find(item => String(item.id) === requestedLeaderboardId) ?? data[0]
        setLeaderboardId(preferredLeaderboard ? String(preferredLeaderboard.id) : "")
      } catch (fetchError) {
        if (!cancelled && !(fetchError instanceof DOMException && fetchError.name === "AbortError")) {
          setError(fetchError instanceof Error ? fetchError.message : "Unable to load leaderboards")
        }
      } finally {
        if (!cancelled) {
          setLoadingLeaderboards(false)
        }
      }
    }

    loadLeaderboards()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [competitionId, requestedLeaderboardId])

  useEffect(() => {
    if (!competitionId || !leaderboardId) {
      setLeaderboard(null)
      return
    }

    let cancelled = false
    const controller = new AbortController()

    const loadLeaderboard = async () => {
      setLoadingResults(true)
      setError(null)

      try {
        const response = await fetch(`${API_BASE}/Competitions/${competitionId}/Leaderboards/${leaderboardId}`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`Unable to load results (${response.status})`)
        }

        const data = (await response.json()) as LeaderboardPayload

        if (!cancelled) {
          setLeaderboard(data)
        }
      } catch (fetchError) {
        if (!cancelled && !(fetchError instanceof DOMException && fetchError.name === "AbortError")) {
          setError(fetchError instanceof Error ? fetchError.message : "Unable to load results")
        }
      } finally {
        if (!cancelled) {
          setLoadingResults(false)
        }
      }
    }

    loadLeaderboard()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [competitionId, leaderboardId])

  const selectedCompetition = competitions.find(item => item.id === competitionId) ?? null
  const selectedLeaderboard = leaderboards.find(item => String(item.id) === leaderboardId) ?? null

  const visibleRows = useMemo(() => {
    if (!leaderboard) {
      return []
    }

    const query = filters.query.trim().toLowerCase()
    const driver = filters.driver.trim().toLowerCase()
    const club = filters.club.trim().toLowerCase()
    const className = filters.className.trim().toLowerCase()

    return leaderboard.items.filter(item => {
      const matchesQuery = !query || rowSearchText(item).includes(query)
      const matchesDriver = !driver || stringifyCell(item.driver).toLowerCase().includes(driver)
      const matchesClub = !club || stringifyCell(item.club).toLowerCase().includes(club)
      const matchesClass = !className || stringifyCell(item.classname).toLowerCase().includes(className)

      return matchesQuery && matchesDriver && matchesClub && matchesClass
    })
  }, [filters, leaderboard])

  const sectionCount = useMemo(() => visibleRows.filter(isSectionRow).length, [visibleRows])
  const dataRowCount = visibleRows.length - sectionCount
  const isBusy = loadingCompetitions || loadingLeaderboards || loadingResults
  const resultColumns = leaderboard?.columns ?? []

  const handleCompetitionChange = (value: string) => {
    setCompetitionId(value)
    setLeaderboardId("")
    setLeaderboard(null)
  }

  const handleFilterChange = (field: keyof FilterState) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(current => ({ ...current, [field]: event.target.value }))
  }

  const resetFilters = () => {
    setFilters(initialFilters)
  }

  return (
    <main className="page-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Gatsby TypeScript leaderboard app</p>
          <h1>Live autotest results without scraping the page.</h1>
          <p className="hero-text">
            This app talks directly to the Sapphire Solutions API behind the leaderboard site, surfaces the live event
            feed, and lets you filter results quickly without leaving the page.
          </p>
          <div className="hero-stats">
            <div>
              <span>Events</span>
              <strong>{competitions.length || "--"}</strong>
            </div>
            <div>
              <span>Boards</span>
              <strong>{leaderboards.length || "--"}</strong>
            </div>
            <div>
              <span>Visible rows</span>
              <strong>{leaderboard ? dataRowCount : "--"}</strong>
            </div>
          </div>
        </div>

        <aside className="hero-card">
          <span className={`status-pill status-${selectedCompetition?.active ?? "x"}`}>
            {competitionStatusLabel(selectedCompetition?.active ?? "")}
          </span>
          <h2>{selectedCompetition?.name ?? "Loading current event"}</h2>
          <p>{formatMeta(selectedCompetition)}</p>
          <dl>
            <div>
              <dt>Board</dt>
              <dd>{selectedLeaderboard?.name ?? "Waiting for leaderboard"}</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>autotest.sapphire-solutions.co.uk/API/1</dd>
            </div>
          </dl>
        </aside>
      </section>

      <section className="workspace-grid">
        <aside className="control-panel">
          <div className="panel-heading">
            <p className="eyebrow">Controls</p>
            <h2>Choose an event and refine the results.</h2>
          </div>

          <label>
            <span>Competition</span>
            <select value={competitionId} onChange={event => handleCompetitionChange(event.target.value)} disabled={loadingCompetitions}>
              <option value="">Select a competition</option>
              {competitions.map(item => (
                <option key={item.id} value={item.id}>
                  {item.dateddmmyyyy} · {item.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Leaderboard</span>
            <select value={leaderboardId} onChange={event => setLeaderboardId(event.target.value)} disabled={loadingLeaderboards || leaderboards.length === 0}>
              <option value="">Select a leaderboard</option>
              {leaderboards.map(item => (
                <option key={item.id} value={String(item.id)}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Global search</span>
            <input value={filters.query} onChange={handleFilterChange("query")} placeholder="Search any result field" />
          </label>

          <label>
            <span>Driver</span>
            <input value={filters.driver} onChange={handleFilterChange("driver")} placeholder="Filter by driver" />
          </label>

          <label>
            <span>Club</span>
            <input value={filters.club} onChange={handleFilterChange("club")} placeholder="Filter by club" />
          </label>

          <label>
            <span>Class</span>
            <input value={filters.className} onChange={handleFilterChange("className")} placeholder="Filter by class" />
          </label>

          <div className="panel-actions">
            <button type="button" className="button-secondary" onClick={resetFilters}>
              Reset filters
            </button>
          </div>
        </aside>

        <section className="results-panel">
          <div className="results-header">
            <div>
              <p className="eyebrow">Results</p>
              <h2>{selectedLeaderboard?.name ?? "Leaderboard results"}</h2>
            </div>
            <div className="results-summary">
              <span>{isBusy ? "Loading live data" : `${dataRowCount} result rows`}</span>
              <span>{leaderboard ? `${sectionCount} section breaks` : "No board loaded"}</span>
            </div>
          </div>

          {error ? <div className="message-error">{error}</div> : null}

          {isBusy ? <div className="message-muted">Fetching competition and leaderboard data.</div> : null}

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {resultColumns.map(column => (
                    <th key={column.name}>{column.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.length > 0 ? (
                  visibleRows.map((item, index) => {
                    if (isSectionRow(item)) {
                      return (
                        <tr key={`section-${index}`} className="section-row">
                          <td colSpan={Math.max(resultColumns.length, 1)}>{stringifyCell(item.classname)}</td>
                        </tr>
                      )
                    }

                    return (
                      <tr key={`${stringifyCell(item.entry)}-${stringifyCell(item.driver)}-${index}`}>
                        {resultColumns.map(column => (
                          <td key={column.name}>{stringifyCell(item[column.name])}</td>
                        ))}
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={Math.max(resultColumns.length, 1)} className="empty-state">
                      {leaderboard ? "No rows match the current filters." : "Select a competition and leaderboard to load the live results list."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  )
}

export default IndexPage

export const Head: HeadFC = () => (
  <>
    <title>Timing App Lite</title>
    <meta
      name="description"
      content="Gatsby TypeScript leaderboard app powered by the Sapphire Solutions autotest API."
    />
  </>
)
