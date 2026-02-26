#!/usr/bin/env python3
import requests, json, time, os, csv, random, sys
import numpy as np
from datetime import datetime

OPENWEATHER_API_KEY = os.environ.get("OPENWEATHER_KEY", "")
OUTPUT_DIR = "data"
os.makedirs(OUTPUT_DIR, exist_ok=True)
N_SIMS = 50000
REQUEST_DELAY = 1.0
HEADERS = {"User-Agent": "Mozilla/5.0 Chrome/122.0.0.0 Safari/537.36", "Accept": "application/json"}

COURSES = {
    "tpc sawgrass":       {"name":"TPC Sawgrass (Stadium)","par":72,"yards":7215,"lat":30.197,"lon":-81.396,"grassType":"Bermuda","weights":{"sgOTT":0.22,"sgAPP":0.35,"sgATG":0.24,"sgPUTT":0.19},"traits":["Accuracy over distance","Short game essential","Island green 17th","Atlantic wind"]},
    "pga national":       {"name":"PGA National (Champion)","par":70,"yards":7110,"lat":26.852,"lon":-80.115,"grassType":"Bermuda","weights":{"sgOTT":0.20,"sgAPP":0.34,"sgATG":0.24,"sgPUTT":0.22},"traits":["The Bear Trap 15-16-17","Accuracy critical","Bermuda putting","Wind off the water"]},
    "augusta national":   {"name":"Augusta National Golf Club","par":72,"yards":7510,"lat":33.503,"lon":-82.023,"grassType":"Bermuda","weights":{"sgOTT":0.28,"sgAPP":0.38,"sgATG":0.16,"sgPUTT":0.18},"traits":["Long iron precision","Draw preferred","Par-5 reachability","Amen Corner wind"]},
    "pebble beach":       {"name":"Pebble Beach Golf Links","par":72,"yards":7075,"lat":36.568,"lon":-121.951,"grassType":"Poa Annua","weights":{"sgOTT":0.20,"sgAPP":0.32,"sgATG":0.24,"sgPUTT":0.24},"traits":["Wind management critical","Coastal exposure","Poa Annua variability"]},
    "torrey pines":       {"name":"Torrey Pines (South)","par":72,"yards":7765,"lat":32.900,"lon":-117.254,"grassType":"Poa/Kikuyu","weights":{"sgOTT":0.32,"sgAPP":0.40,"sgATG":0.13,"sgPUTT":0.15},"traits":["Ball-striking dominant","Long approaches","Distance advantage"]},
    "muirfield village":  {"name":"Muirfield Village Golf Club","par":72,"yards":7392,"lat":40.099,"lon":-83.161,"grassType":"Bentgrass","weights":{"sgOTT":0.24,"sgAPP":0.38,"sgATG":0.18,"sgPUTT":0.20},"traits":["Precision driving","Mid-iron accuracy","Bentgrass putting"]},
    "riviera":            {"name":"Riviera Country Club","par":71,"yards":7322,"lat":34.049,"lon":-118.516,"grassType":"Poa/Kikuyu","weights":{"sgOTT":0.25,"sgAPP":0.36,"sgATG":0.20,"sgPUTT":0.19},"traits":["Kikuyu rough penalty","Creative shot-making","Low scoring typical"]},
    "bay hill":           {"name":"Bay Hill Club & Lodge","par":72,"yards":7466,"lat":28.508,"lon":-81.497,"grassType":"Bermuda","weights":{"sgOTT":0.27,"sgAPP":0.37,"sgATG":0.16,"sgPUTT":0.20},"traits":["Length advantage","Bermuda putting","Wind factor"]},
    "quail hollow":       {"name":"Quail Hollow Club","par":71,"yards":7521,"lat":35.430,"lon":-80.816,"grassType":"Bermuda","weights":{"sgOTT":0.30,"sgAPP":0.36,"sgATG":0.16,"sgPUTT":0.18},"traits":["Power golf rewarded","The Green Mile","Distance advantage"]},
    "harbour town":       {"name":"Harbour Town Golf Links","par":71,"yards":7099,"lat":32.128,"lon":-80.677,"grassType":"Bermuda","weights":{"sgOTT":0.16,"sgAPP":0.34,"sgATG":0.26,"sgPUTT":0.24},"traits":["Accuracy over length","Short game premium","Coastal wind"]},
    "tpc scottsdale":     {"name":"TPC Scottsdale (Stadium)","par":71,"yards":7261,"lat":33.660,"lon":-111.890,"grassType":"Bermuda","weights":{"sgOTT":0.26,"sgAPP":0.35,"sgATG":0.20,"sgPUTT":0.19},"traits":["Desert surrounds punishing","Low scoring typical","Bermuda putting"]},
    "kapalua":            {"name":"Kapalua Plantation Course","par":73,"yards":7596,"lat":20.999,"lon":-156.670,"grassType":"Bermuda","weights":{"sgOTT":0.34,"sgAPP":0.35,"sgATG":0.14,"sgPUTT":0.17},"traits":["Distance dominant","Strong trade winds","Very low scoring"]},
    "east lake":          {"name":"East Lake Golf Club","par":70,"yards":7346,"lat":33.726,"lon":-84.328,"grassType":"Bermuda","weights":{"sgOTT":0.25,"sgAPP":0.38,"sgATG":0.17,"sgPUTT":0.20},"traits":["Elite-only field","Starters scoring","Ball-striking premium"]},
    "colonial":           {"name":"Colonial Country Club","par":70,"yards":7209,"lat":32.741,"lon":-97.371,"grassType":"Bermuda","weights":{"sgOTT":0.20,"sgAPP":0.36,"sgATG":0.22,"sgPUTT":0.22},"traits":["Accuracy essential","Iron play critical","Wind from the south"]},
    "bethpage black":     {"name":"Bethpage Black","par":71,"yards":7459,"lat":40.738,"lon":-73.454,"grassType":"Bentgrass","weights":{"sgOTT":0.24,"sgAPP":0.39,"sgATG":0.19,"sgPUTT":0.18},"traits":["Notoriously difficult","Thick rough penalizes","Ball-striking paramount"]},
    "southern hills":     {"name":"Southern Hills Country Club","par":70,"yards":7556,"lat":36.099,"lon":-95.953,"grassType":"Bermuda","weights":{"sgOTT":0.26,"sgAPP":0.40,"sgATG":0.17,"sgPUTT":0.17},"traits":["Demanding approach shots","Oklahoma wind","Ball-striking dominant"]},
    "tpc river highlands":{"name":"TPC River Highlands","par":70,"yards":6841,"lat":41.641,"lon":-72.612,"grassType":"Bentgrass","weights":{"sgOTT":0.22,"sgAPP":0.33,"sgATG":0.22,"sgPUTT":0.23},"traits":["Birdie-fest conditions","Short course","Bentgrass putting"]},
    "waialae":            {"name":"Waialae Country Club","par":70,"yards":7044,"lat":21.276,"lon":-157.797,"grassType":"Bermuda","weights":{"sgOTT":0.24,"sgAPP":0.34,"sgATG":0.20,"sgPUTT":0.22},"traits":["Trade winds variable","Low scoring typical"]},
}

EVENT_TO_COURSE = {
    "cognizant":"pga national","palm beach":"pga national","players":"tpc sawgrass",
    "masters":"augusta national","pebble":"pebble beach","farmers":"torrey pines",
    "memorial":"muirfield village","genesis":"riviera","arnold palmer":"bay hill",
    "bay hill":"bay hill","wells fargo":"quail hollow","rbc heritage":"harbour town",
    "wm phoenix":"tpc scottsdale","phoenix":"tpc scottsdale","sentry":"kapalua",
    "tour championship":"east lake","charles schwab":"colonial","travelers":"tpc river highlights",
    "sony":"waialae",
}

BASELINE = {
    "Scottie Scheffler":{"sgOTT":0.85,"sgAPP":1.24,"sgATG":0.36,"sgPUTT":0.20,"dist":309},
    "Xander Schauffele":{"sgOTT":0.72,"sgAPP":1.01,"sgATG":0.43,"sgPUTT":0.44,"dist":303},
    "Rory McIlroy":{"sgOTT":1.08,"sgAPP":0.89,"sgATG":0.24,"sgPUTT":0.33,"dist":328},
    "Collin Morikawa":{"sgOTT":0.43,"sgAPP":1.21,"sgATG":0.30,"sgPUTT":0.20,"dist":296},
    "Ludvig Aberg":{"sgOTT":0.93,"sgAPP":0.91,"sgATG":0.31,"sgPUTT":0.22,"dist":314},
    "Viktor Hovland":{"sgOTT":0.80,"sgAPP":0.93,"sgATG":0.20,"sgPUTT":0.37,"dist":313},
    "Jon Rahm":{"sgOTT":0.70,"sgAPP":0.96,"sgATG":0.41,"sgPUTT":0.49,"dist":305},
    "Patrick Cantlay":{"sgOTT":0.53,"sgAPP":0.90,"sgATG":0.33,"sgPUTT":0.60,"dist":297},
    "Wyndham Clark":{"sgOTT":0.86,"sgAPP":0.76,"sgATG":0.23,"sgPUTT":0.46,"dist":319},
    "Brian Harman":{"sgOTT":0.23,"sgAPP":0.73,"sgATG":0.50,"sgPUTT":0.64,"dist":279},
    "Max Homa":{"sgOTT":0.49,"sgAPP":0.84,"sgATG":0.38,"sgPUTT":0.31,"dist":300},
    "Tommy Fleetwood":{"sgOTT":0.46,"sgAPP":0.95,"sgATG":0.35,"sgPUTT":0.29,"dist":298},
    "Shane Lowry":{"sgOTT":0.32,"sgAPP":0.81,"sgATG":0.46,"sgPUTT":0.40,"dist":290},
    "Tyrrell Hatton":{"sgOTT":0.40,"sgAPP":0.87,"sgATG":0.44,"sgPUTT":0.35,"dist":292},
    "Tony Finau":{"sgOTT":0.90,"sgAPP":0.71,"sgATG":0.30,"sgPUTT":0.20,"dist":319},
    "Russell Henley":{"sgOTT":0.42,"sgAPP":0.79,"sgATG":0.34,"sgPUTT":0.53,"dist":293},
    "Hideki Matsuyama":{"sgOTT":0.56,"sgAPP":0.90,"sgATG":0.21,"sgPUTT":0.42,"dist":299},
    "Matt Fitzpatrick":{"sgOTT":0.37,"sgAPP":0.93,"sgATG":0.40,"sgPUTT":0.24,"dist":292},
    "Keegan Bradley":{"sgOTT":0.53,"sgAPP":0.70,"sgATG":0.33,"sgPUTT":0.45,"dist":302},
    "Adam Scott":{"sgOTT":0.45,"sgAPP":0.74,"sgATG":0.27,"sgPUTT":0.43,"dist":294},
    "Sahith Theegala":{"sgOTT":0.81,"sgAPP":0.73,"sgATG":0.37,"sgPUTT":0.16,"dist":313},
    "Tom Kim":{"sgOTT":0.63,"sgAPP":0.76,"sgATG":0.31,"sgPUTT":0.37,"dist":301},
    "Cameron Young":{"sgOTT":0.98,"sgAPP":0.73,"sgATG":0.24,"sgPUTT":0.14,"dist":322},
    "Akshay Bhatia":{"sgOTT":0.74,"sgAPP":0.64,"sgATG":0.43,"sgPUTT":0.21,"dist":309},
    "Will Zalatoris":{"sgOTT":0.62,"sgAPP":0.86,"sgATG":0.22,"sgPUTT":0.13,"dist":304},
    "Justin Thomas":{"sgOTT":0.59,"sgAPP":0.84,"sgATG":0.30,"sgPUTT":0.20,"dist":305},
    "Jordan Spieth":{"sgOTT":0.32,"sgAPP":0.73,"sgATG":0.53,"sgPUTT":0.57,"dist":290},
    "Jason Day":{"sgOTT":0.42,"sgAPP":0.71,"sgATG":0.40,"sgPUTT":0.50,"dist":292},
    "Denny McCarthy":{"sgOTT":0.29,"sgAPP":0.63,"sgATG":0.31,"sgPUTT":0.73,"dist":283},
    "Eric Cole":{"sgOTT":0.45,"sgAPP":0.75,"sgATG":0.40,"sgPUTT":0.38,"dist":295},
    "Taylor Moore":{"sgOTT":0.36,"sgAPP":0.69,"sgATG":0.42,"sgPUTT":0.32,"dist":292},
    "Austin Eckroat":{"sgOTT":0.47,"sgAPP":0.72,"sgATG":0.35,"sgPUTT":0.24,"dist":297},
    "Davis Thompson":{"sgOTT":0.54,"sgAPP":0.66,"sgATG":0.33,"sgPUTT":0.30,"dist":301},
    "Jake Knapp":{"sgOTT":0.84,"sgAPP":0.60,"sgATG":0.31,"sgPUTT":0.29,"dist":320},
    "Byeong Hun An":{"sgOTT":0.43,"sgAPP":0.74,"sgATG":0.35,"sgPUTT":0.37,"dist":295},
    "Si Woo Kim":{"sgOTT":0.39,"sgAPP":0.70,"sgATG":0.33,"sgPUTT":0.44,"dist":293},
    "Corey Conners":{"sgOTT":0.53,"sgAPP":0.76,"sgATG":0.24,"sgPUTT":0.26,"dist":300},
    "Nick Taylor":{"sgOTT":0.45,"sgAPP":0.64,"sgATG":0.40,"sgPUTT":0.40,"dist":295},
    "Sungjae Im":{"sgOTT":0.52,"sgAPP":0.71,"sgATG":0.29,"sgPUTT":0.38,"dist":299},
    "Chris Kirk":{"sgOTT":0.34,"sgAPP":0.71,"sgATG":0.43,"sgPUTT":0.46,"dist":287},
    "Sepp Straka":{"sgOTT":0.48,"sgAPP":0.73,"sgATG":0.30,"sgPUTT":0.39,"dist":296},
    "Harris English":{"sgOTT":0.59,"sgAPP":0.68,"sgATG":0.35,"sgPUTT":0.31,"dist":303},
    "Billy Horschel":{"sgOTT":0.30,"sgAPP":0.70,"sgATG":0.44,"sgPUTT":0.41,"dist":285},
    "Robert MacIntyre":{"sgOTT":0.56,"sgAPP":0.73,"sgATG":0.38,"sgPUTT":0.30,"dist":302},
    "Rickie Fowler":{"sgOTT":0.45,"sgAPP":0.73,"sgATG":0.37,"sgPUTT":0.30,"dist":297},
    "Matthieu Pavon":{"sgOTT":0.63,"sgAPP":0.66,"sgATG":0.33,"sgPUTT":0.24,"dist":305},
    "Nicolai Hojgaard":{"sgOTT":0.67,"sgAPP":0.71,"sgATG":0.32,"sgPUTT":0.24,"dist":307},
    "Rasmus Hojgaard":{"sgOTT":0.65,"sgAPP":0.69,"sgATG":0.34,"sgPUTT":0.26,"dist":306},
    "Min Woo Lee":{"sgOTT":0.71,"sgAPP":0.68,"sgATG":0.36,"sgPUTT":0.23,"dist":309},
    "Sam Burns":{"sgOTT":0.55,"sgAPP":0.71,"sgATG":0.31,"sgPUTT":0.28,"dist":300},
    "K.H. Lee":{"sgOTT":0.48,"sgAPP":0.63,"sgATG":0.32,"sgPUTT":0.38,"dist":296},
    "Kurt Kitayama":{"sgOTT":0.44,"sgAPP":0.67,"sgATG":0.35,"sgPUTT":0.35,"dist":295},
    "Alex Noren":{"sgOTT":0.28,"sgAPP":0.65,"sgATG":0.42,"sgPUTT":0.38,"dist":283},
    "Ben Griffin":{"sgOTT":0.35,"sgAPP":0.62,"sgATG":0.37,"sgPUTT":0.36,"dist":291},
    "Justin Rose":{"sgOTT":0.34,"sgAPP":0.68,"sgATG":0.32,"sgPUTT":0.32,"dist":289},
    "David Lipsky":{"sgOTT":0.46,"sgAPP":0.62,"sgATG":0.30,"sgPUTT":0.31,"dist":296},
    "Beau Hossler":{"sgOTT":0.37,"sgAPP":0.63,"sgATG":0.35,"sgPUTT":0.33,"dist":292},
    "Patrick Reed":{"sgOTT":0.32,"sgAPP":0.67,"sgATG":0.50,"sgPUTT":0.42,"dist":289},
    "Dustin Johnson":{"sgOTT":0.74,"sgAPP":0.63,"sgATG":0.20,"sgPUTT":0.31,"dist":320},
    "Brooks Koepka":{"sgOTT":0.68,"sgAPP":0.76,"sgATG":0.24,"sgPUTT":0.28,"dist":313},
    "Abraham Ancer":{"sgOTT":0.44,"sgAPP":0.63,"sgATG":0.36,"sgPUTT":0.28,"dist":295},
    "Harold Varner III":{"sgOTT":0.51,"sgAPP":0.59,"sgATG":0.29,"sgPUTT":0.25,"dist":299},
    "J.T. Poston":{"sgOTT":0.28,"sgAPP":0.61,"sgATG":0.33,"sgPUTT":0.41,"dist":286},
    "Taylor Pendrith":{"sgOTT":0.71,"sgAPP":0.58,"sgATG":0.26,"sgPUTT":0.18,"dist":318},
    "Hayden Buckley":{"sgOTT":0.44,"sgAPP":0.60,"sgATG":0.31,"sgPUTT":0.29,"dist":295},
    "Emiliano Grillo":{"sgOTT":0.40,"sgAPP":0.60,"sgATG":0.34,"sgPUTT":0.28,"dist":293},
    "Scott Stallings":{"sgOTT":0.40,"sgAPP":0.57,"sgATG":0.33,"sgPUTT":0.34,"dist":293},
    "Mark Hubbard":{"sgOTT":0.33,"sgAPP":0.58,"sgATG":0.36,"sgPUTT":0.34,"dist":290},
    "Brendon Todd":{"sgOTT":0.22,"sgAPP":0.60,"sgATG":0.35,"sgPUTT":0.48,"dist":281},
    "Adam Hadwin":{"sgOTT":0.36,"sgAPP":0.64,"sgATG":0.31,"sgPUTT":0.42,"dist":290},
    "Charley Hoffman":{"sgOTT":0.47,"sgAPP":0.58,"sgATG":0.31,"sgPUTT":0.31,"dist":296},
    "J.J. Spaun":{"sgOTT":0.44,"sgAPP":0.59,"sgATG":0.32,"sgPUTT":0.28,"dist":296},
    "Nick Hardy":{"sgOTT":0.38,"sgAPP":0.57,"sgATG":0.31,"sgPUTT":0.30,"dist":292},
    "Callum Tarren":{"sgOTT":0.42,"sgAPP":0.58,"sgATG":0.30,"sgPUTT":0.26,"dist":295},
    "Chez Reavie":{"sgOTT":0.18,"sgAPP":0.59,"sgATG":0.40,"sgPUTT":0.44,"dist":279},
    "Stewart Cink":{"sgOTT":0.24,"sgAPP":0.57,"sgATG":0.31,"sgPUTT":0.42,"dist":282},
    "Kevin Streelman":{"sgOTT":0.27,"sgAPP":0.55,"sgATG":0.33,"sgPUTT":0.44,"dist":284},
    "Scott Brown":{"sgOTT":0.38,"sgAPP":0.54,"sgATG":0.30,"sgPUTT":0.31,"dist":292},
    "Brendan Steele":{"sgOTT":0.36,"sgAPP":0.55,"sgATG":0.31,"sgPUTT":0.32,"dist":291},
    "Nate Lashley":{"sgOTT":0.41,"sgAPP":0.61,"sgATG":0.38,"sgPUTT":0.34,"dist":293},
    "Tyler Duncan":{"sgOTT":0.30,"sgAPP":0.56,"sgATG":0.34,"sgPUTT":0.37,"dist":288},
    "Doc Redman":{"sgOTT":0.39,"sgAPP":0.61,"sgATG":0.34,"sgPUTT":0.33,"dist":292},
    "Will Gordon":{"sgOTT":0.36,"sgAPP":0.55,"sgATG":0.32,"sgPUTT":0.31,"dist":291},
    "Adam Schenk":{"sgOTT":0.38,"sgAPP":0.58,"sgATG":0.32,"sgPUTT":0.31,"dist":292},
    "Luke List":{"sgOTT":0.71,"sgAPP":0.55,"sgATG":0.26,"sgPUTT":0.19,"dist":314},
    "Camilo Villegas":{"sgOTT":0.33,"sgAPP":0.56,"sgATG":0.37,"sgPUTT":0.35,"dist":289},
    "Danny Willett":{"sgOTT":0.32,"sgAPP":0.61,"sgATG":0.34,"sgPUTT":0.33,"dist":289},
    "Sergio Garcia":{"sgOTT":0.48,"sgAPP":0.65,"sgATG":0.38,"sgPUTT":0.36,"dist":296},
    "Bubba Watson":{"sgOTT":0.82,"sgAPP":0.55,"sgATG":0.28,"sgPUTT":0.30,"dist":325},
    "Luke Donald":{"sgOTT":0.21,"sgAPP":0.58,"sgATG":0.36,"sgPUTT":0.47,"dist":278},
    "Webb Simpson":{"sgOTT":0.20,"sgAPP":0.61,"sgATG":0.33,"sgPUTT":0.49,"dist":279},
}

def fetch(url, params=None, retries=3):
    for i in range(retries):
        try:
            time.sleep(REQUEST_DELAY + random.uniform(0,0.5))
            r = requests.get(url, headers=HEADERS, params=params, timeout=15)
            if r.status_code == 200: return r
            if r.status_code in (401,403): print(f"  blocked: {url}"); return None
        except Exception as e:
            if i == retries-1: print(f"  failed: {url} — {e}")
        if i < retries-1: time.sleep(3*(i+1))
    return None

def save_json(data, filename):
    path = os.path.join(OUTPUT_DIR, filename)
    with open(path,"w",encoding="utf-8") as f: json.dump(data, f, indent=2)
    print(f"  saved {path} ({os.path.getsize(path):,} bytes)")

def load_csv_sg(filepath):
    if not os.path.exists(filepath): return {}
    results = {}
    try:
        with open(filepath, newline="", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            headers = list(reader.fieldnames or [])
            # Find name column — prefer exact PLAYER match
            name_col = None
            for h in headers:
                if h.strip().upper() == "PLAYER": name_col = h; break
            if not name_col:
                name_col = next((h for h in headers if "player" in h.lower() or "name" in h.lower()), headers[0])
            # Find value column — prefer exact AVG match
            val_col = None
            for h in headers:
                if h.strip().upper() == "AVG": val_col = h; break
            if not val_col:
                val_col = next((h for h in headers if any(k in h.lower() for k in ["avg","value","gained"])), headers[-1])
            for row in reader:
                name = row.get(name_col,"").strip()
                val  = row.get(val_col,"").strip().replace("+","").replace(",","")
                if name and val:
                    try: results[name] = float(val)
                    except ValueError: pass
        if results: print(f"  loaded {len(results)} from {os.path.basename(filepath)}")
    except Exception as e: print(f"  csv error: {e}")
    return results

def build_profiles():
    csv_files = {k:os.path.join(OUTPUT_DIR,f) for k,f in [("sgOTT","sg_ott.csv"),("sgAPP","sg_app.csv"),("sgATG","sg_atg.csv"),("sgPUTT","sg_putt.csv")]}
    has_csv = any(os.path.exists(p) for p in csv_files.values())
    if has_csv:
        print("\n loading CSV SG data...")
        csv_data = {}
        for key, path in csv_files.items():
            for name, val in load_csv_sg(path).items():
                if name not in csv_data: csv_data[name] = {}
                csv_data[name][key] = val
        profiles = {}
        for name, stats in csv_data.items():
            if not any(k in stats for k in ["sgOTT","sgAPP","sgATG","sgPUTT"]): continue
            base = BASELINE.get(name, {})
            profiles[name] = {"name":name,"sgOTT":round(stats.get("sgOTT",base.get("sgOTT",0.0)),3),"sgAPP":round(stats.get("sgAPP",base.get("sgAPP",0.0)),3),"sgATG":round(stats.get("sgATG",base.get("sgATG",0.0)),3),"sgPUTT":round(stats.get("sgPUTT",base.get("sgPUTT",0.0)),3),"dist":base.get("dist",295),"dataSource":"csv_2026"}
        print(f"  {len(profiles)} players from CSV")
        print(f"  sample profile keys: {list(profiles.keys())[:3]}")
        return profiles
    else:
        print("\n using built-in baseline (2024-25, 90 players)")
        print("  drop sg_ott.csv / sg_app.csv / sg_atg.csv / sg_putt.csv into data/ for real 2026 numbers")
        return {n:{"name":n,"sgOTT":s["sgOTT"],"sgAPP":s["sgAPP"],"sgATG":s["sgATG"],"sgPUTT":s["sgPUTT"],"dist":s.get("dist",295),"dataSource":"baseline_2025"} for n,s in BASELINE.items()}

def get_event():
    print("\n detecting event via ESPN...")
    resp = fetch("https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard")
    if not resp: return None
    try:
        data = resp.json(); events = data.get("events",[])
        if not events: return None
        ev = events[0]; t_name = ev.get("name","")
        comp = (ev.get("competitions") or [{}])[0]
        venue = comp.get("venue",{}); v_name = venue.get("fullName","")
        field = []
        for c in comp.get("competitors",[]):
            ath = c.get("athlete",{}); name = ath.get("displayName","")
            if name: field.append({"name":name,"espnId":ath.get("id",""),"country":(ath.get("flag") or {}).get("alt",""),"worldRank":999})
        print(f"  event: {t_name}  ({len(field)} players)")
        return {"tournamentName":t_name,"venueName":v_name,"week":datetime.now().strftime("%Y-%m-%d"),"field":field,"fieldSize":len(field)}
    except Exception as e: print(f"  espn error: {e}"); return None

def match_course(event, override=None):
    if override:
        key = override.lower()
        c = next((c for k,c in COURSES.items() if k in key or key in k), None)
        if c: print(f"  course override: {c['name']}"); return c
    t = event.get("tournamentName","").lower()
    v = event.get("venueName","").lower()
    for key,course in COURSES.items():
        if key in v or (v and v in key): print(f"  venue match: {course['name']}"); return course
    for kw,ck in EVENT_TO_COURSE.items():
        if kw in t: print(f"  event match: {COURSES[ck]['name']}"); return COURSES[ck]
    print(f"  no match for '{event.get('tournamentName')}' — defaulting to TPC Sawgrass")
    return COURSES["tpc sawgrass"]

def get_weather(lat, lon, name):
    if not OPENWEATHER_API_KEY:
        print("  no weather key — using 10mph default (set OPENWEATHER_KEY for real data)")
        return {"source":"none","avgWindMph":10.0,"days":[]}
    print(f"  fetching weather for {name}...")
    resp = fetch("https://api.openweathermap.org/data/2.5/forecast",{"lat":lat,"lon":lon,"appid":OPENWEATHER_API_KEY,"units":"imperial","cnt":40})
    if not resp: return {"source":"unavailable","avgWindMph":10.0,"days":[]}
    try:
        daily = {}
        for item in resp.json().get("list",[]):
            d = item["dt_txt"][:10]
            if d not in daily: daily[d] = {"winds":[],"temps":[],"pop":0}
            daily[d]["winds"].append(item["wind"]["speed"]); daily[d]["temps"].append(item["main"]["temp"]); daily[d]["pop"] = max(daily[d]["pop"],item.get("pop",0)*100)
        days = [{"day":f"R{i+1}","date":dt,"windMph":round(sum(v["winds"])/len(v["winds"]),1),"tempF":round(sum(v["temps"])/len(v["temps"]),1),"precipChance":round(v["pop"])} for i,(dt,v) in enumerate(list(daily.items())[:4])]
        avg = round(sum(d["windMph"] for d in days)/len(days),1) if days else 10.0
        print(f"  weather: {avg}mph avg"); return {"source":"openweathermap","avgWindMph":avg,"days":days}
    except: return {"source":"error","avgWindMph":10.0,"days":[]}

def estimate_form(sg):
    base=sg*0.55; prev=base; form=[]
    for _ in range(10):
        v=0.6*base+0.2*prev+0.2*random.gauss(0,0.9); form.append(round(max(-3.0,min(4.0,v)),2)); prev=v
    return form

def form_boost(form):
    if not form: return 0.0
    wts=[0.35,0.25,0.18,0.11,0.06,0.03,0.015,0.008,0.004,0.003]; w=wts[:len(form)]; tw=sum(w)
    return round((sum(v*wt for v,wt in zip(form,w))/tw-0.5)*0.24,4)

def consistency(form):
    if len(form)<3: return 0.75
    m=sum(form)/len(form); std=(sum((v-m)**2 for v in form)/len(form))**0.5
    return round(max(0.50,min(0.95,1.0-std*0.28)),3)

def course_fit(p, course, wind=10.0):
    w=course["weights"]; v=(p["sgOTT"]*w["sgOTT"]+p["sgAPP"]*w["sgAPP"]+p["sgATG"]*w["sgATG"]+p["sgPUTT"]*w["sgPUTT"])
    if wind>14: ws=min(0.10,(wind-14)*0.007); v+=(p["sgOTT"]+p["sgAPP"])*ws-p["sgPUTT"]*ws*0.6
    return round(v,4)

def american_odds(dec):
    if dec>=2.0: return f"+{round((dec-1)*100)}"
    elif dec>1.0: return f"-{round(100/(dec-1))}"
    return "+9999"

def simulate(players, n_sims):
    n=len(players); print(f"\n simulating {n_sims:,} x {n} players...")
    mus=np.array([p["mu"] for p in players]); sigmas=np.array([p["sigma"] for p in players])
    wins=np.zeros(n,dtype=np.int64); t5=np.zeros(n,dtype=np.int64); t10=np.zeros(n,dtype=np.int64); t20=np.zeros(n,dtype=np.int64); mc=np.zeros(n,dtype=np.int64); pos=np.zeros(n,dtype=np.float64)
    rng=np.random.default_rng(seed=int(datetime.now().timestamp())%100000); cut_size=max(2,int(n*0.65)); batch=2000
    for start in range(0,n_sims,batch):
        b=min(batch,n_sims-start)
        r12=rng.normal(mus,sigmas,(b,n))+rng.normal(mus,sigmas,(b,n))+rng.normal(0,0.5,(b,1))
        cut_line=np.sort(r12,axis=1)[:,::-1][:,min(cut_size-1,n-1)]; cm=r12>=cut_line[:,np.newaxis]
        r34=rng.normal(mus,sigmas,(b,n))+rng.normal(mus,sigmas,(b,n))+rng.normal(0,0.5,(b,1))
        final=np.where(cm,r12+r34,-9999.0); ranks=np.argsort(np.argsort(-final,axis=1),axis=1)
        mc+=cm.sum(axis=0).astype(np.int64); wins+=(ranks==0).sum(axis=0).astype(np.int64); t5+=(ranks<5).sum(axis=0).astype(np.int64); t10+=(ranks<10).sum(axis=0).astype(np.int64); t20+=(ranks<20).sum(axis=0).astype(np.int64); pos+=ranks.sum(axis=0)
    print("  simulation done")
    results=[]
    for i,p in enumerate(players):
        dec=n_sims/max(1,wins[i])
        results.append({**{k:v for k,v in p.items() if k not in("mu","sigma")},"winPct":round(wins[i]/n_sims*100,2),"top5Pct":round(t5[i]/n_sims*100,2),"top10Pct":round(t10[i]/n_sims*100,2),"top20Pct":round(t20[i]/n_sims*100,2),"makeCutPct":round(mc[i]/n_sims*100,2),"avgFinish":round(pos[i]/n_sims+1,1),"impliedOdds":american_odds(dec),"decimalOdds":round(dec,1)})
    return sorted(results,key=lambda x:x["winPct"],reverse=True)

def run(course_override=None, n_sims=N_SIMS):
    t0=datetime.now()
    print("="*58)
    print(f"  GOLF ORACLE  {t0.strftime('%Y-%m-%d %H:%M')}")
    print("="*58)
    event=get_event()
    if not event: print("could not get event — check internet"); return
    save_json(event,"field.json")
    course=match_course(event,course_override); save_json(course,"course.json")
    weather=get_weather(course["lat"],course["lon"],course["name"]); save_json(weather,"weather.json")
    avg_wind=weather["avgWindMph"]
    profiles=build_profiles(); save_json(list(profiles.values()),"players.json")
    print(f"\n matching {event['fieldSize']} players to profiles...")
    sim_players=[]; unmatched=[]
    for fp in event["field"]:
        name=fp["name"]; profile=profiles.get(name)
        if not profile:
            last=name.split()[-1].lower()
            profile=next((p for pn,p in profiles.items() if pn.split()[-1].lower()==last),None)
        if not profile:
            unmatched.append(name); sg_est=max(-0.3,1.5-len(unmatched)*0.008)
            profile={"name":name,"sgOTT":sg_est*0.7,"sgAPP":sg_est*0.8,"sgATG":sg_est*0.6,"sgPUTT":sg_est*0.4,"dist":295,"dataSource":"estimated"}
        form=estimate_form(profile["sgOTT"]+profile["sgAPP"]+profile["sgATG"]+profile["sgPUTT"])
        fit=course_fit(profile,course,avg_wind); fb=form_boost(form); cons=consistency(form)
        sim_players.append({**profile,"country":fp.get("country",""),"recentForm":form,"courseFit":round(fit,3),"formBoost":round(fb,3),"consistency":round(cons,3),"mu":fit+fb,"sigma":max(1.5,4.0-cons*2.2)})
    matched=len(sim_players)-len(unmatched)
    print(f"  {matched}/{event['fieldSize']} matched   {len(unmatched)} estimated")
    results=simulate(sim_players,n_sims)
    elapsed=(datetime.now()-t0).total_seconds()
    save_json({"meta":{"generatedAt":datetime.now().isoformat(),"tournamentName":event["tournamentName"],"courseName":course["name"],"fieldSize":len(sim_players),"playersMatched":matched,"simulations":n_sims,"avgWindMph":avg_wind,"elapsedSeconds":round(elapsed,1),"dataSource":sim_players[0].get("dataSource","baseline") if sim_players else "unknown"},"course":course,"weather":weather,"results":results},"results.json")
    print("\n"+"="*58)
    print(f"  DONE in {elapsed:.1f}s")
    print(f"  {event['tournamentName']}")
    print(f"  {course['name']}  |  {avg_wind}mph wind")
    print(f"  {matched}/{event['fieldSize']} players matched")
    print(f"\n  TOP 5:")
    for i,p in enumerate(results[:5]):
        print(f"    {i+1}. {p['name']:<24} {p['winPct']:5.1f}%  {p['impliedOdds']:>6}  T10: {p['top10Pct']:.1f}%")
    print("="*58)
    print(f"\n  run: python3 -m http.server 8080  then open http://localhost:8080\n")

if __name__=="__main__":
    args=[a for a in sys.argv[1:] if not a.startswith("--")]
    sims=next((int(sys.argv[i+1]) for i,a in enumerate(sys.argv) if a=="--sims" and i+1<len(sys.argv)),N_SIMS)
    run(course_override=args[0] if args else None,n_sims=sims)
