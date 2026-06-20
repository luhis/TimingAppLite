# TimingAppLive v2.36 - Server Communication Analysis

## Overview

**App:** TimingAppLive (package: `autotest.sapphire`)  
**Version:** 02.36 (versionCode 84)  
**Developer:** Sapphire Solutions (sales@sapphire-solutions.co.uk)  
**Framework:** B4A (Basic4Android) - decompiled with JADX  
**HTTP Client:** OkHttp3 (via B4A's `OkHttpClientWrapper`)

---

## Base URL

All API calls go to a single hardcoded server:

```
https://autotest.sapphire-solutions.co.uk
```

Defined in `common.java:285-286`:
```java
_stotalurl = "https://autotest.sapphire-solutions.co.uk";
_sweburl   = "autotest.sapphire-solutions.co.uk";
```

The web URL is used when constructing browser links and email parameters.

---

## Authentication Flow

### Login (`/logincheck.php`)

**Method:** POST  
**Parameters:** `code={6-digit passcode}`  
**Response:** JSON object

```json
{
  "site": "sitename_string",
  "admincode": "admin_code_string"
}
```

**Flow:**
1. User enters a 6-digit numeric passcode via on-screen keypad (`main.java:1109-1129`)
2. Passcode is sent to `/logincheck.php` as POST body (`main.java:614-624`)
3. Server returns a `site` name and optional `admincode`
4. If `site` is empty/invalid, login fails with "Invalid Passcode" (`main.java:698-709`)
5. If valid, the site name is stored in `common._ssitename` and used for **all subsequent API calls**
6. The `admincode` controls access to penalty editing - if non-empty, user must re-enter it to access penalties (`frmcompetition.java:1170-1183`)
7. After login, the app fetches translation strings for localization (`/translationlist.php`)

**Key insight:** The passcode is essentially a "site code" - it identifies which venue/club's data the app should access. There is no user account system - the passcode IS the identity.

---

## Core Data Model (SQLite: `autotest.db`)

```
settings        (version, timediff)
competitions    (competitionid, name, tests, runs, penalty1-4, countdown, accuracy, leaderboard1-4, date, site)
testnames       (test, name)
entry           (entryid, competition, entry, driver, car, colour, class, checked)
test            (entryid, number, run, starttime, finishtime, seconds, cones, stops, extras, options, wt, datetime)
locations       (locationid, competitionid, name)
leaderboards    (leaderboardid, name)
translations    (translationid, english, native)
starttimes      (starttime)
finishtimes     (finishtime)
laptimes        (laptime)
```

---

## API Endpoints

### 1. Site/Competition Data

#### `/translationlist.php` - Get Localisation Strings
- **Method:** POST
- **Parameters:** `site={sitename}`
- **Response:** JSON array of `{translationid, english, native}`
- **Called from:** `main.java` (after successful login)
- **Purpose:** Downloads UI translations for the site's locale

#### `/entryselect.php` - Get All Entries for Site
- **Method:** POST
- **Parameters:** `site={sitename}`
- **Response:** JSON array of entries

```json
[
  {
    "entryid": "123",
    "competitionname": "Event Name",
    "entry": "42",
    "drivername": "John Smith",
    "carname": "Ford Escort",
    "colour": "Red",
    "classname": "ModProd",
    "checked": "0"
  }
]
```

- **Called from:** `frmcompetition.java`, `frmchecks.java`
- **Purpose:** Downloads all entries across all competitions for the logged-in site. Local DB is cleared and repopulated.

#### `/locationselect.php` - Get Locations for Site
- **Method:** POST
- **Parameters:** `site={sitename}`
- **Response:** JSON array of `{locationid, competitionid, name}`
- **Called from:** `frmcompetition.java`
- **Purpose:** Downloads location/stage names linked to competitions

---

### 2. Competition Entry Selection

When the user selects a competition from the list (`frmcompetition.java`), the app loads the full dataset:
1. Calls `/entryselect.php` to get all entries
2. Calls `/locationselect.php` to get locations
3. Shows the competition list, filtered and sorted by date

**Competition selection flow (`frmcompetition.java:519-557`):**
- User taps a competition in the list
- App sets `common._icurrentcompetition` and `common._scurrentcompetitionname`
- Navigates to the appropriate timing mode screen (start/finish/both/multi/lap/penalty/checks)

---

### 3. Timing Operations

#### `/checkruns.php` - Check Run Count for Entry
- **Method:** POST
- **Parameters:** `entryid={id}&number={test_number}`
- **Response:** JSON (run count data)
- **Called from:** `frmtiming.java`, `frmstart.java`, `frmfinish.java`, `frmmulti.java`, `frmlaptimer.java`, `frmpenalty.java`, `frmlocation.java`
- **Purpose:** Gets how many runs an entry has completed for a given test

#### `/runsleft.php` - Entries with Remaining Runs
- **Method:** POST
- **Parameters:** `competitionid={id}&number={test_number}`
- **Response:** JSON array of entries
- **Called from:** All timing screens
- **Purpose:** Gets list of entries that still have runs remaining

#### `/testselect.php` - Select Existing Test Data
- **Method:** POST
- **Parameters:** `entryid={id}&number={test_number}`
- **Response:** JSON array of test run data
- **Called from:** `frmfinish.java`, `frmpenalty.java`
- **Purpose:** Gets existing timing data for an entry's test

#### `/startedonly.php` - Get Started Entries
- **Method:** POST
- **Parameters:** `competitionid={id}&number={test_number}`
- **Response:** JSON array of entry IDs
- **Called from:** `frmfinish.java`
- **Purpose:** Gets list of entries that have started but not finished

---

### 4. Submitting Timing Data

All three submission endpoints accept the same parameter set:

#### `/testadd.php` - Submit Combined Start+Finish Time
- **Method:** POST
- **Called from:** `frmtiming.java`, `frmmulti.java`, `frmlaptimer.java`

#### `/teststart.php` - Submit Start Time Only
- **Method:** POST
- **Called from:** `frmstart.java`

#### `/testfinish.php` - Submit Finish Time Only
- **Method:** POST
- **Called from:** `frmfinish.java`

**Common Parameters:**
```
entryid={entry_id}
number={test_number}
run={run_number}
starttime={milliseconds}
finishtime={milliseconds}
seconds={total_seconds}
cones={cone_count}
lines={line_count}
extras={extras_count}
options={options_count}
wt={wrong_test_flag}
datetime={iso_datetime}
```

- Times are in milliseconds since midnight (e.g., 45321 = 0:00:45.321)
- `cones` = penalty cones hit
- `lines` = line/obstacle penalties
- `extras` = additional penalties
- `options` = optional penalty flags
- `wt` = wrong test indicator (0 or 1)
- `datetime` = timestamp of the run

#### `/testupdate.php` - Update Existing Timing Data
- **Method:** POST
- **Parameters:** Same as above
- **Called from:** `frmtest.java`
- **Purpose:** Modifies an existing run record

---

### 5. Penalty Management

#### `/listruns.php` - List All Runs for Entry
- **Method:** POST
- **Parameters:** `entryid={id}&number={test_number}`
- **Response:** JSON array of run records
- **Called from:** `frmpenalty.java`

#### `/removerun.php` - Remove a Specific Run
- **Method:** POST
- **Parameters:** `entryid={id}&run={run_number}`
- **Called from:** `frmpenalty.java`

#### `/penaltyupdate.php` - Update Penalty Data
- **Method:** POST
- **Parameters:** `entryid={id}&number={test_number}&run={run_number}&...` (plus penalty fields)
- **Called from:** `frmpenalty.java`

---

### 6. Marshal Checks

#### `/entryupdate.php` - Update Check Status
- **Method:** POST
- **Parameters:** `entryid={id}&checked={0|1}`
- **Called from:** `frmchecks.java`
- **Purpose:** Toggles scrutineering/noise check status for an entry

---

### 7. Location Management

#### `/locationupdate.php` - Update Location Data
- **Method:** POST
- **Parameters:** (location-specific fields)
- **Called from:** `frmlocation.java`

---

### 8. Leaderboard

#### `/API/1/Competitions/{id}/Leaderboards/` - Get Leaderboard Definitions
- **Method:** GET (uses `_download` instead of `_poststring`)
- **Response:** JSON array of `{id, name}`
- **Called from:** `frmleaderboard.java:700-708`
- **Purpose:** Gets list of available leaderboards for a competition

This is the **only REST-style endpoint** in the app. All others use PHP scripts with POST.

#### Leaderboard HTML Loading
- Leaderboard content is loaded from `aleaderboard.html` (asset) + server-provided HTML fragments
- The HTML is stored in `common._swebshow[]` (5 slots) and displayed in a WebView
- Leaderboards auto-refresh on a timer

#### `/email.php` - Send Leaderboard via Email
- **Method:** POST
- **Parameters:** `competitionid={id}&To={email}&server={weburl}&site={sitename}`
- **Called from:** `frmleaderboard.java:865-893`

#### `/eventlist.php` - Open Event List in Browser
- **Method:** GET (browser intent)
- **URL:** `{baseurl}/eventlist.php?sitename={sitename}`
- **Called from:** `frmleaderboard.java:593-600`

---

## Site Code / Competition / Club Relationship

### How the "Site Code" Works

```
Passcode (6 digits)
    |
    v
/logincheck.php
    |
    v
site = "ClubOrVenueName"   (returned by server)
    |
    v
All subsequent API calls pass site={sitename}
    |
    v
Server filters competitions/entries by site
```

**The passcode IS the site code.** There is no username/password system. The 6-digit code maps directly to a site on the server. The server returns the site name, which is then used as a filter key for all data queries.

### Where "Club" Fits In (or Doesn't)

The app's data model is:

```
Site (identified by passcode/site code)
  └── Competition (competitionid, name, date, etc.)
        └── Entry (entryid, driver, car, class, etc.)
              └── Test/Run (timing data, penalties)
```

**There is no explicit "club" entity in the data model.** The closest concept is:

1. **`site`** - The venue/organizer identifier (returned from login). This is the closest thing to a "club" - it's the organizational unit that owns competitions.
2. **`competitions.site`** - Each competition record has a `site` column, linking it back to the site that created it.
3. **`entry.competition`** - Each entry has a competition name (not ID), linking it to a competition.

### The Site-Competition Association Problem

Based on the decompiled code, here's what can be determined:

- **Competitions are associated with sites server-side.** The app never creates competitions - it only reads them.
- **The association is implicit in the API.** When you call `/entryselect.php?sitename=X`, the server returns only entries for that site. The app doesn't know HOW the server filters - it just trusts the response.
- **The `competitions` table has a `site` column** (`common.java:188`), suggesting the server returns the site name with each competition record.
- **The `entry` table has a `competition` column** that stores the competition **name** (not ID), which is unusual and suggests the competition-to-entry relationship is name-based on the server side.

### What the App Cannot Do

The decompiled app:
- Cannot create new competitions (no endpoint for this)
- Cannot create new sites/clubs (no endpoint for this)
- Cannot associate a competition with a different site
- Cannot manage site membership or access control beyond the passcode

**All site/competition/entry management must be done through the Sapphire Solutions web admin panel**, which is not part of this mobile app. The app is purely a timing client.

---

## Network Stack

```
App Code (B4A Java)
    │
    ├── httpjob.java          (HTTP request wrapper)
    │     └── _poststring()   (POST with form-encoded body)
    │     └── _download()     (GET for file/download)
    │
    ├── httputils2service.java (Async HTTP service manager)
    │     └── OkHttpClientWrapper (B4A wrapper)
    │
    └── OkHttp3               (Underlying HTTP library)
          └── OkHttpClient
          └── Request / RequestBody
          └── Response / ResponseBody
```

**Request pattern:**
1. Create `httpjob` instance
2. Initialize with job name and callback activity
3. Call `_poststring(url, body)` or `_download(url)`
4. `WaitFor("jobdone", ...)` suspends until response
5. Check `_job._success`, read `_job._getstring()`
6. Parse JSON with `JSONParser`
7. Process data, update local SQLite DB
8. Release job with `_job._release()`

**All POST requests use form-encoded bodies** (`application/x-www-form-urlencoded`), not JSON. Parameters are URL-encoded key=value pairs.

---

## Error Handling

- **Connection failures:** Toast message "Data Connection Unavailable" (`common.java:130-141`)
- **HTTP failures:** Toast message with connection check prompt (`common.java:143-150`)
- **Invalid passcode:** Toast message "Invalid Passcode" (`main.java:698-709`)
- **Wrong admin code:** Toast message "Wrong Admin Code" (`frmcompetition.java:1230-1231`)
- **No entries:** Toast message "No Entries" (`frmcompetition.java:728-731`)
- **Database version mismatch:** Full database reset (`common.java:299-303`)

The app has basic retry logic - on comms failure, it checks if all data flags are set and clears data if not (`common.java:126-128`).

---

## Summary

| Aspect | Detail |
|--------|--------|
| **Server** | `https://autotest.sapphire-solutions.co.uk` |
| **Protocol** | HTTPS, form-encoded POST (except leaderboard GET) |
| **Auth** | 6-digit numeric passcode → site name |
| **Data format** | JSON responses, PHP backend |
| **Local storage** | SQLite (`autotest.db`) |
| **Site/Club** | No explicit "club" - the `site` field returned from login is the organizational unit |
| **Competition→Club** | Server-side association via the `site` filter; competition table has a `site` column |
| **Admin** | Separate web panel (not in this app) manages sites, competitions, entries |
