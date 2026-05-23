import * as React from "react"

const LEADERBOARD_URL = "https://autotest.sapphire-solutions.co.uk/Leaderboard"

const cardStyle = {
  width: "100%",
  maxWidth: "1100px",
  margin: "2rem auto",
  padding: "1.25rem",
  border: "1px solid #ddd",
  borderRadius: "8px",
  boxSizing: "border-box",
}

const inputStyle = {
  border: "1px solid #ccc",
  borderRadius: "6px",
  padding: "0.5rem 0.75rem",
  minWidth: "220px",
}

const buttonStyle = {
  border: "1px solid #0b5fff",
  borderRadius: "6px",
  backgroundColor: "#0b5fff",
  color: "#fff",
  padding: "0.5rem 0.9rem",
  cursor: "pointer",
}

const buildLeaderboardUrl = (sitename, fragment) => {
  const params = new URLSearchParams({ sitename: sitename.trim() })
  const safeFragment = fragment.trim().replace(/^#*/, "")
  const hash = safeFragment ? `#${encodeURIComponent(safeFragment)}` : ""

  return `${LEADERBOARD_URL}?${params.toString()}${hash}`
}

const IndexPage = () => {
  const [sitenameInput, setSitenameInput] = React.useState("autotest")
  const [fragmentInput, setFragmentInput] = React.useState("")
  const [activeUrl, setActiveUrl] = React.useState(
    buildLeaderboardUrl("autotest", "")
  )

  const handleLoadResults = event => {
    event.preventDefault()
    setActiveUrl(buildLeaderboardUrl(sitenameInput, fragmentInput))
  }

  return (
    <main style={{ fontFamily: "Arial, sans-serif", padding: "0 1rem 2rem" }}>
      <div style={cardStyle}>
        <h1 style={{ marginTop: 0 }}>TimingAppLite Leaderboard Browser</h1>
        <p>
          Browse event results hosted by Sapphire Leaderboard. Enter a site name
          and optional result fragment, then load results below.
        </p>
        <form
          onSubmit={handleLoadResults}
          style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}
        >
          <label style={{ display: "grid", gap: "0.25rem" }}>
            Site name
            <input
              aria-label="Site name"
              value={sitenameInput}
              onChange={event => setSitenameInput(event.target.value)}
              style={inputStyle}
              required
            />
          </label>
          <label style={{ display: "grid", gap: "0.25rem" }}>
            Fragment (optional)
            <input
              aria-label="Fragment"
              value={fragmentInput}
              onChange={event => setFragmentInput(event.target.value)}
              placeholder="event-1"
              style={inputStyle}
            />
          </label>
          <div style={{ alignSelf: "end" }}>
            <button type="submit" style={buttonStyle}>
              Load results
            </button>
          </div>
        </form>
        <p style={{ marginBottom: 0 }}>
          If embedding is blocked by browser policy, open directly:{" "}
          <a href={activeUrl} target="_blank" rel="noreferrer">
            {activeUrl}
          </a>
        </p>
      </div>

      <iframe
        title="Sapphire leaderboard event results"
        src={activeUrl}
        style={{
          width: "100%",
          minHeight: "70vh",
          border: "1px solid #ddd",
          borderRadius: "8px",
          backgroundColor: "#fff",
        }}
      />
    </main>
  )
}

export default IndexPage
