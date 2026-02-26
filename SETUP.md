# GOLF ORACLE — Complete Setup Guide
## Fully Automated · Live PGA Tour Data · Zero Manual Steps

---

## What You Have

| File | What It Does |
|------|-------------|
| `golf-oracle-v3.jsx` | The dashboard — auto-loads live data or falls back to built-in 120-player DB |
| `pga_scraper_v2.py` | Automated pipeline — detects current event, scrapes real SG data, runs simulation |

---

## One-Time Setup (10 minutes)

### 1. Install Python dependencies
```bash
pip install requests beautifulsoup4 numpy pandas
```

### 2. Get a free weather API key
- Go to openweathermap.org → Sign Up (free)
- Copy your API key
- Set it as an environment variable:
```bash
# Mac/Linux
export OPENWEATHER_KEY="your_key_here"

# Windows (Command Prompt)
set OPENWEATHER_KEY=your_key_here

# Windows (PowerShell)
$env:OPENWEATHER_KEY="your_key_here"
```

### 3. Put the files in a folder
```
golf-oracle/
  pga_scraper_v2.py
  golf-oracle-v3.jsx   ← rename to index.html or load via React
  data/                ← created automatically by scraper
```

---

## Every Week (2 commands, ~2 minutes)

```bash
# Step 1: Run the scraper (auto-detects current event via ESPN)
python pga_scraper_v2.py

# Step 2: Serve the dashboard locally
python -m http.server 8080

# Open http://localhost:8080 — dashboard auto-loads live data
```

That's it. The scraper:
- Detects this week's PGA Tour event automatically
- Scrapes real SG data from pgatour.com for every player
- Blends 3 seasons of data (2025 = 60%, 2024 = 30%, 2023 = 10%)
- Fetches weather forecast for the course location
- Runs 50,000 Monte Carlo simulations
- Saves results.json which the dashboard reads on load

---

## Automate It Completely (Run Every Monday)

### Mac/Linux (cron)
```bash
crontab -e
# Add this line (runs every Monday at 9am):
0 9 * * 1 cd /path/to/golf-oracle && python pga_scraper_v2.py >> logs/scraper.log 2>&1
```

### Windows (Task Scheduler)
1. Open Task Scheduler
2. Create Basic Task → Weekly → Monday → 9:00 AM
3. Action: Start a program
4. Program: `python`
5. Arguments: `C:\path\to\golf-oracle\pga_scraper_v2.py`
6. Start in: `C:\path\to\golf-oracle\`

---

## Manual Course Override
If ESPN doesn't detect the right course, override it:
```bash
python pga_scraper_v2.py "Augusta National"
python pga_scraper_v2.py "TPC Sawgrass"
python pga_scraper_v2.py "Pebble Beach" --sims 100000
```

---

## How the Data Pipeline Works

```
ESPN API (free)
    ↓
Current event name + full field (120-156 players)
    ↓
PGA Tour Stats (scraped)
    ↓
Real SG data for every player in field (3 seasons blended)
    ↓
OpenWeatherMap (free tier)
    ↓
4-day wind forecast for course location
    ↓
Monte Carlo Simulation (50,000 iterations)
    ↓
data/results.json (auto-loaded by dashboard)
```

---

## If the PGA Tour Site Changes Structure

The scraper uses 3 parsing strategies in order:
1. Next.js `__NEXT_DATA__` JSON (most reliable)
2. HTML table parsing (fallback)
3. Direct JSON API endpoint (second fallback)

If all three fail, check:
- `pgatour.com/stats/detail/02567` (SG:OTT stat page)
- Right-click → Inspect → look for `__NEXT_DATA__` in the page source
- Update the JSON path in `scrape_stat_page()` accordingly

---

## Data Sources (All Free)

| Source | URL | Data | Rate Limit |
|--------|-----|------|------------|
| ESPN Golf API | site.api.espn.com | Field, results | None |
| PGA Tour Stats | pgatour.com/stats | Real SG data | Be polite |
| OpenWeatherMap | openweathermap.org | Weather | 1,000/day free |
| Wikipedia API | en.wikipedia.org/api | Historical results | None |

---

## Upgrading to Paid Data (Optional, when ready)

**DataGolf API (~$20-40/month)**
- Clean JSON API — no scraping needed
- Real-time SG ratings updated after every round
- Course fit scores already computed
- Replace `build_multi_season_profiles()` with their `/skill-ratings` endpoint

The scraper is architected so the data source is swappable — everything downstream (simulation, dashboard) stays the same.
