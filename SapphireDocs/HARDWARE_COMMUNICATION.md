# TimingAppLive v2.36 - Hardware Communication (BLE/USB Timing Beams)

## Overview

The app connects to **FDS-TBOX** timing hardware (manufactured by Forward Data Solutions) via three transport methods:

1. **Bluetooth Low Energy (BLE)** - Primary wireless connection
2. **USB Serial** - Wired connection via FTDI/CP210x/CH34x/PL2303 chips
3. **Manual/GPS** - No hardware, uses phone clock with GPS sync

The TBOX is a physical timing beam controller that has infrared start/finish beams and a small LCD display. The phone acts as the remote control and data logger.

---

## Architecture

```
┌──────────────┐       BLE (GATT)        ┌──────────────┐
│              │◄────────────────────────►│              │
│  FDS-TBOX    │   Service: 09830001-...  │  Phone App   │
│  (Timing     │   TX:      09830002-...  │  (TimingApp  │
│   Hardware)  │   RX:      09830003-...  │   Live)      │
│              │                          │              │
│  Infrared    │       USB Serial         │              │
│  Beams ──────┤   9600 baud, 8N1         │              │
│  LCD Display │   DLE/STX/ETX framing    │              │
└──────────────┘                          └──────┬───────┘
                                                  │
                                                  │ HTTPS POST
                                                  ▼
                                         ┌──────────────┐
                                         │  Sapphire     │
                                         │  Server       │
                                         │  (PHP + DB)   │
                                         └──────────────┘
```

---

## BLE UUIDs

Defined in `common.java:411-413`:

| Role | UUID | Direction |
|------|------|-----------|
| **Service** | `09830001-a35c-11e5-bf7f-feff819cdc9f` | - |
| **TX** (Phone → TBOX) | `09830002-a35c-11e5-bf7f-feff819cdc9f` | Write |
| **RX** (TBOX → Phone) | `09830003-a35c-11e5-bf7f-feff819cdc9f` | Notify |

---

## BLE Connection Flow

### 1. Device Discovery

```
User taps "Start" on timing screen
    │
    ▼
Check USB devices first (UsbManager.GetDevices().length > 0)
    │
    ├── USB found → Skip BLE, init USB serial
    │
    └── No USB → Check BLE adapter state
                    │
                    ├── STATE_POWERED_ON → Start BLE scan
                    │
                    └── Other → Show "Bluetooth Not On"
```

**BLE Scan (`starter.java:937`):**
- Calls `_manager.Scan2(null, false)` for unfiltered scan
- 10-second timeout via `_scantimer`
- Filters devices by name prefix: `"FDS-TBOX"`
- Stores up to 10 devices in `_stboxname[]` / `_stboxid[]` arrays
- Rejects duplicate names

**Permissions (Android 12+):**
```
BLUETOOTH_SCAN
BLUETOOTH_CONNECT
ACCESS_FINE_LOCATION
```

### 2. Connection & Service Discovery

```
User selects TBOX from discovered list
    │
    ▼
_manager.Connect2(deviceId, false)    // Direct connect, no auto-connect
    │
    ▼
_manager_connected callback
    │
    ├── Log "Bluetooth Connected"
    ├── Set _connected = true
    ├── Log RX characteristic properties
    ├── Enable notifications: _manager.SetNotify(svid, rxid, true)
    └── Send BT Login packets (_btlogin)
```

### 3. BT Login Protocol

Two BLE packets are sent sequentially to the TX characteristic:

**Packet 1 - Mode Set:**
```
Offset  Value   Description
0       0x02    Command type (2 = mode set)
1       0xXX    Sequence number (incremented per packet)
2       0x06    Sub-command
3       0x00    Reserved
4       0x00    Reserved
5       0x00    Reserved
```

**Packet 2 - Login:**
```
Offset  Value   Description
0       0x07    Command type (7 = login)
1       0xXX    Sequence number
2       0x01    Sub-command
```

**Login Response (TBOX → Phone):**
```
Offset  Value   Description
0       0x02    Message type (2 = login response)
1       0xXX    Sequence number
2       0x04    Status: 0x04 = success, 0x05 = failure
```

### 4. ACK Protocol

After receiving any timing data via BLE, the phone sends an ACK:

```
Offset  Value   Description
0       0x01    Command type (1 = ACK)
1       0xXX    Sequence number to acknowledge
2       0x00    Reserved
3       0x00    Reserved
```

---

## USB Serial Connection

### Initialization (`starter.java:937-992`)

When a USB device is detected:

```java
_usbmanager.GetDevices()[0]                    // Take first USB device
_usbserial.Initialize("serial", device, -1)    // Init with event prefix "serial"
_usbserial.setBaudRate(9600)
_usbserial.setDataBits(8)
_usbserial.StartReading()                      // Begin async reads
_usbconnected = true
```

**Parameters:** 9600 baud, 8 data bits, default stop bits

**Supported USB-Serial Chips** (via FELHR library):
- FTDI FT232/FT2232
- Silicon Labs CP2102/CP2104
- WCH CH340/CH341
- Prolific PL2303
- CDC ACM (generic)
- Silicon Labs BLED112 (BLE-to-Serial bridge)

### USB Serial Framing

Data sent TO the TBOX over USB is wrapped in a binary frame:

```
Byte 0:     0x10    DLE (Data Link Escape)
Byte 1:     0x02    STX (Start of Text)
Byte 2:     0x00    Reserved
Byte 3:     0x00    Reserved
Bytes 4..N:         Raw payload
Byte N+1:   0x10    DLE
Byte N+2:   0x03    ETX (End of Text)
Byte N+3:           LRC2 (double checksum)
Byte N+4:           LRC1 (single checksum)
```

**LRC Checksum Calculation:**
```
LRC1 = 0
LRC2 = 0
For each byte in payload:
    LRC1 = LRC1 + byte
    LRC2 = LRC2 + LRC1
```

---

## Binary Timing Message Protocol

### Message Type Identification

The first byte (`data[0]`) determines the message type:

| Byte 0 | Type | Source |
|--------|------|--------|
| `0x01` | ACK | Phone → TBOX (ignored when received) |
| `0x02` | Login response | TBOX → Phone |
| `0x10` | USB binary timing | TBOX → Phone (USB) |
| `0x20` | BLE timing data | TBOX → Phone (BLE) |
| `0x29` | Display command | Phone → TBOX |
| `0x54` | USB text timing ('T') | TBOX → Phone (USB) |

### Format 1: BLE Timing (`data[0] = 0x20`)

Parsed by `common._time()` (`common.java:543-570`):

```
Offset  Bits    Description
0       8       Message type (0x20)
1       8       Sequence number
2-3     16      Reserved
4       8       Seconds low byte
5       8       Seconds high byte
6-9     32      Reserved
10      8       Milliseconds low byte
11      8       Milliseconds high (masked: & 0x0F)
12      8       Reserved
13      8       Beam trigger indicator
14-15   16      Reserved
```

**Time calculation:**
```
seconds_raw  = (byte5 << 8) | byte4         // Unsigned 16-bit
millis_raw   = ((byte11 & 0x0F) << 8) | byte10  // 12-bit max
total_ms     = (seconds_raw * 1000) + millis_raw
```

### Format 2: USB Binary Timing (`data[0] = 0x10`)

Parsed by `common._usbbinarytime()` (`common.java:615-642`):

```
Offset  Bits    Description
0       8       Message type (0x10)
1-5     40      Reserved
6       8       Seconds low byte
7       8       Seconds high byte
8-11    32      Reserved
12      8       Milliseconds low byte
13      8       Milliseconds high (masked: & 0x0F)
14      8       Reserved
15      8       Beam trigger indicator
```

**Time calculation:** Same as BLE format.

### Format 3: USB Text Timing (`data[0] = 0x54` = ASCII 'T')

Parsed by `common._usbtime()` (`common.java:644-661`):

```
Offset  Char    Description
0       'T'     Message type
1-13            Reserved / header
14      char    Beam trigger indicator
15      ':'     Separator
16-17   digits  Minutes (2 ASCII digits)
18      ':'     Separator
19-20   digits  Seconds (2 ASCII digits)
21      ':'     Separator
22-23   digits  Sub-seconds (2 ASCII digits)
24      '.'     Decimal point
25-27   digits  Milliseconds (3 ASCII digits)
```

**Time calculation:**
```
minutes = int(chars[16..17])
seconds = int(chars[19..20])
subsec  = int(chars[22..23])
millis  = int(chars[25..27])
total_ms = ((minutes * 60 + seconds) * 60 + subsec) * 1000 + millis
```

### Beam Trigger Indicator (byte 13/15/14)

| Value | Meaning |
|-------|---------|
| 1 | Start beam triggered first |
| 2 | Finish beam triggered first |
| 3 | Start beam (alternate channel) |
| 4 | Finish beam (alternate channel) |
| 5 | Start beam (third channel) |
| 6 | Finish beam (third channel) |
| 7 | Both beams triggered simultaneously |
| 8 | Both beams triggered (fast pass-through) |

---

## Display Protocol (Phone → TBOX LCD)

The phone can write text to the TBOX's LCD display via command `0x29`.

### Display Init
```
Byte 0: 0x29    Display command
Byte 1: 0x00
Byte 2: 0x00
Byte 3: 0x00
```

### Set Driver Name (Line 2)
```
Byte 0: 0x29
Byte 1: 0x00
Byte 2: 0x0A    Sub-command (10 = display control)
Byte 3: 0x02    Set driver name
Byte 4: length  Name length (max 15)
Byte 5+:        UTF-8 driver name
```

### Set Two-Line Display
```
Byte 0: 0x29
Byte 1: 0x00
Byte 2: 0x0A
Byte 3: 0x03    Two-line mode
Byte 4: length  Text length (max 15)
Byte 5+:        UTF-8 text
```

### Set Single-Line Display
```
Byte 0: 0x29
Byte 1: 0x00
Byte 2: 0x0A
Byte 3: 0x01    Single-line mode
Byte 4: length  Text length (max 8)
Byte 5+:        UTF-8 text
```

### Auto-Clear

A 15-second `_displaytimer` clears the TBOX display after inactivity by sending:
1. Sub-command 2 (clear data)
2. Sub-command 3 (clear name)
3. Sub-command 1 (clear display)

---

## Timing Data Flow

### Standard Timing (frmtiming)

```
┌─────────────────────────────────────────────────────────┐
│                    TIMING SCREEN                         │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Select Driver from list                        │   │
│  └─────────────────────────────────────────────────┘   │
│                        │                                │
│                        ▼                                │
│  ┌─────────────────────────────────────────────────┐   │
│  │  _startstop() called                            │   │
│  │  ├── Not connected? → Scan/Connect BLE or USB   │   │
│  │  ├── Connected but not logged in? → BT Login    │   │
│  │  └── Connected & logged in? → Ready             │   │
│  └─────────────────────────────────────────────────┘   │
│                        │                                │
│                        ▼                                │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Waiting for beam triggers...                   │   │
│  │                                                 │   │
│  │  Start beam triggered:                          │   │
│  │    data[0]=0x20, data[13]∈{1,3,5,7}            │   │
│  │    → _lstarttime = parsed time                  │   │
│  │    → Start countdown on screen                  │   │
│  │                                                 │   │
│  │  Finish beam triggered:                         │   │
│  │    data[0]=0x20, data[13]∈{2,4,6,8}            │   │
│  │    → _lfinishtime = parsed time                 │   │
│  │    → Calculate: time = finish - start            │   │
│  │    → Display result                             │   │
│  │    → Write result to TBOX display               │   │
│  └─────────────────────────────────────────────────┘   │
│                        │                                │
│                        ▼                                │
│  ┌─────────────────────────────────────────────────┐   │
│  │  User enters penalties (cones, lines, extras)   │   │
│  │  Taps "Save"                                    │   │
│  │  → POST to /testadd.php with all timing data    │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Start/Finish Line Mode

When `_bstart=true` or `_bfinish=true`, the app only listens for one beam type:
- **Start mode:** Only processes `data[13] ∈ {1,3,5,7}` (start beams)
- **Finish mode:** Only processes `data[13] ∈ {2,4,6,8}` (finish beams)

### Multi-Stage Mode (`_bmulti=true`)

Handles multiple stages per run, accumulating times across stages.

### Lap Timer Mode (`_blaptimer=true`)

Records lap times by detecting repeated finish beam triggers.

---

## GPS Time Synchronization

### Purpose

The phone's system clock may drift or be set incorrectly. GPS provides a stratum-0 time reference.

### Sync Process (`frmsync.java`)

```
┌────────────────────────────────────────────┐
│  GPS Fix Received                          │
│  → _lgpstime = location.getTime()          │
│  (GPS time in ms since epoch)              │
└────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────┐
│  User taps "Reset"                         │
│  → system_now = System.currentTimeMillis() │
│  → gps_now = _lgpstime                     │
│  → diff = system_now - gps_now             │
│                                            │
│  If |diff| > 100 seconds:                  │
│    Try timezone correction (±N hours)      │
│    If still wrong → Warning toast          │
│                                            │
│  → _dtimediff = diff                       │
│  → Save to DB: UPDATE settings SET         │
│                timediff = <value>          │
└────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────┐
│  Applied everywhere:                       │
│  adjusted_time = DateTime.getNow()         │
│                  - common._dtimediff       │
└────────────────────────────────────────────┘
```

### Manual Adjustment

- **Advance:** `_dtimediff -= 100` (makes clock 100ms faster)
- **Delay:** `_dtimediff += 100` (makes clock 100ms slower)
- Persisted in SQLite `settings.timediff` column

---

## WiFi Connectivity

**File:** `wifi/MLwifi.java`

The app checks connectivity before any server call:

```java
MLwifi wifi = new MLwifi();
if (wifi.isWifiConnected() && wifi.isOnline()) {
    return true;    // WiFi OK
}
if (Phone.GetDataState().equals("CONNECTED")) {
    return true;    // Mobile data OK
}
// Show "Data Connection Unavailable" toast
return false;
```

**Key methods:**
| Method | Purpose |
|--------|---------|
| `isWifiConnected()` | Checks `ConnectivityManager` for WIFI type + connected |
| `isOnline()` | Any active network connected |
| `isOnlinePing()` | Pings `8.8.8.8` via system ping |
| `WifiSignal()` / `WifiStrength()` | Signal strength info |
| `WifiAPDistance()` | Estimates distance to AP from RSSI |
| `holdWifiOn()` / `releaseWifiOn()` | WiFi lock to prevent sleep |

---

## Mode Selection

The user chooses a timing mode from the main screen, which sets flags that control the entire flow:

| Mode | Flag | Hardware | Description |
|------|------|----------|-------------|
| FDS Timing | `_btbox = true` | BLE/USB TBOX | Full hardware timing |
| App Timing | `_btbox = false`, `_bmanual = false` | None | Phone-based timing |
| Manual Timing | `_bmanual = true` | None | Manual start/stop buttons |
| Start Line | `_bstart = true` | TBOX or manual | Start beam only |
| Finish Line | `_bfinish = true` | TBOX or manual | Finish beam only |
| Multi-Stage | `_bmulti = true` | TBOX or manual | Multiple stages |
| Lap Timer | `_blaptimer = true` | TBOX or manual | Repeated laps |
| Marshal Checks | `_bchecks = true` | None | Entry scrutineering |
| Penalties | `_bpenalty = true` | None | Penalty management |
| Locations | `_blocations = true` | None | Location/stage mgmt |

### Data Dispatch Logic (`starter.java:460-625`)

When timing data arrives from BLE or USB:

```
data received
    │
    ├── data[0] == 0x01 → Ignore (ACK from TBOX)
    ├── data[0] == 0x02 → Handle login response
    ├── data[0] == 0x20 → Timing data (BLE)
    ├── data[0] == 0x10 → Timing data (USB binary)
    ├── data[0] == 0x54 → Timing data (USB text)
    │
    └── Route to active screen:
        ├── !_bstart && !_bfinish && !_bmulti → frmtiming.AddTime(data)
        ├── _bstart → frmstart.AddTime(data)
        ├── _bfinish → frmfinish.AddTime(data)
        ├── _bmulti → frmmulti.AddTime(data)
        └── _blaptimer → frmlaptimer.AddTime(data)
```

---

## Error Handling

| Condition | Message |
|-----------|---------|
| BLE not powered on | "Bluetooth Not On" |
| No BLE permission | "No Bluetooth Permission" |
| No USB devices | Falls back to BLE scan |
| USB device not supported | "USB Device not supported" |
| USB permission needed | "Please allow connection and click again" |
| No TBOX found after 10s scan | "No TBox Found" |
| BT login failure | "Login Failed, Check Password" |
| BLE disconnected | "Bluetooth Disconnected" |
| USB disconnected | "USB Disconnected" |
| No data connection | "Data Connection Unavailable" |
| Time sync drift > 100s | "Time on this device is not accurate" |

**No automatic reconnection** - user must manually reconnect.

**Minimum time gap:** Finish time must be ≥ 2000ms after start time to prevent false triggers.

---

## File Reference

| File | Role |
|------|------|
| `common.java:411-413` | BLE UUID definitions |
| `common.java:543-570` | `_time()` - BLE time parsing |
| `common.java:615-642` | `_usbbinarytime()` - USB binary time parsing |
| `common.java:644-661` | `_usbtime()` - USB text time parsing |
| `starter.java:204-229` | `_btlogin()` - BLE login packets |
| `starter.java:195-201` | `_ack()` - BLE ACK packet |
| `starter.java:336-458` | BLE connection & service discovery |
| `starter.java:460-625` | BLE data receive handler |
| `starter.java:627-643` | BLE device discovery filter |
| `starter.java:700` | BLE state change handler |
| `starter.java:737-893` | USB serial data receive handler |
| `starter.java:937-992` | USB serial initialization |
| `starter.java:1008-1122` | USB serial write with LRC framing |
| `starter.java:1124-1338` | TBOX display protocol |
| `frmtiming.java:3030+` | BLE scan start + permissions |
| `frmsync.java` | GPS time synchronization |
| `wifi/MLwifi.java` | WiFi connectivity checking |
| `com/felhr/usbserial/` | USB serial driver library |
