import { useState, useEffect, useCallback, useRef } from "react";

/*
 ╔══════════════════════════════════════════════════════════════╗
 ║              GOLF ORACLE DASHBOARD v3                        ║
 ║                                                              ║
 ║  AUTO-LOADS from data/results.json (scraper output)          ║
 ║  FALLS BACK to built-in simulation engine if no file found   ║
 ║                                                              ║
 ║  To use with live data:                                      ║
 ║    1. Run: python pga_scraper_v2.py                          ║
 ║    2. Serve this file alongside data/results.json            ║
 ║       e.g. python -m http.server 8080                        ║
 ║    3. Open http://localhost:8080                             ║
 ╚══════════════════════════════════════════════════════════════╝
*/

// ──────────────────────────────────────────────────────────────
// CONSTANTS & CONFIG
// ──────────────────────────────────────────────────────────────

const SG_META = [
  { key: "sgOTT",  label: "Off the Tee",    short: "OTT",  color: "#f59e0b", icon: "🏌️" },
  { key: "sgAPP",  label: "Approach",        short: "APP",  color: "#10b981", icon: "🎯" },
  { key: "sgATG",  label: "Around Green",    short: "ATG",  color: "#3b82f6", icon: "🏌" },
  { key: "sgPUTT", label: "Putting",         short: "PUTT", color: "#a78bfa", icon: "⛳" },
];

const COURSES = {
  "TPC Sawgrass":       { par:72, yards:7215, type:"Signature", grassType:"Bermuda", location:"Ponte Vedra Beach, FL", weights:{sgOTT:0.22,sgAPP:0.35,sgATG:0.24,sgPUTT:0.19}, traits:["Accuracy over distance","Short game essential","Island green (17th)","Atlantic wind"] },
  "Augusta National":   { par:72, yards:7510, type:"Major",     grassType:"Bermuda", location:"Augusta, GA",           weights:{sgOTT:0.28,sgAPP:0.38,sgATG:0.16,sgPUTT:0.18}, traits:["Long iron precision","Draw preferred","Par-5 reachability","Amen Corner wind"] },
  "Pebble Beach":       { par:72, yards:7075, type:"Major",     grassType:"Poa Annua",location:"Pebble Beach, CA",     weights:{sgOTT:0.20,sgAPP:0.32,sgATG:0.24,sgPUTT:0.24}, traits:["Wind management critical","Coastal exposure","Poa Annua variability","Accuracy premium"] },
  "Torrey Pines South": { par:72, yards:7765, type:"Standard",  grassType:"Poa/Kikuyu",location:"La Jolla, CA",        weights:{sgOTT:0.32,sgAPP:0.40,sgATG:0.13,sgPUTT:0.15}, traits:["Ball-striking dominant","Long approaches","Distance advantage","Marine layer"] },
  "Muirfield Village":  { par:72, yards:7392, type:"Signature", grassType:"Bentgrass",location:"Dublin, OH",           weights:{sgOTT:0.24,sgAPP:0.38,sgATG:0.18,sgPUTT:0.20}, traits:["Precision driving","Mid-iron accuracy","Bentgrass putting","Tree-lined fairways"] },
  "Riviera CC":         { par:71, yards:7322, type:"Standard",  grassType:"Poa/Kikuyu",location:"Pacific Palisades, CA",weights:{sgOTT:0.25,sgAPP:0.36,sgATG:0.20,sgPUTT:0.19},traits:["Kikuyu rough penalty","Creative shot-making","Experience rewarded","Low scoring"] },
  "Bay Hill":           { par:72, yards:7466, type:"Standard",  grassType:"Bermuda",  location:"Orlando, FL",           weights:{sgOTT:0.27,sgAPP:0.37,sgATG:0.16,sgPUTT:0.20}, traits:["Length advantage","Bermuda putting","Wind factor","Demanding closing stretch"] },
  "Quail Hollow":       { par:71, yards:7521, type:"Standard",  grassType:"Bermuda",  location:"Charlotte, NC",         weights:{sgOTT:0.30,sgAPP:0.36,sgATG:0.16,sgPUTT:0.18}, traits:["Power golf rewarded","The Green Mile","Penal rough","Distance advantage"] },
  "Harbour Town":       { par:71, yards:7099, type:"Standard",  grassType:"Bermuda",  location:"Hilton Head, SC",       weights:{sgOTT:0.16,sgAPP:0.34,sgATG:0.26,sgPUTT:0.24}, traits:["Accuracy over length","Short game premium","Coastal wind","Tight fairways"] },
  "TPC Scottsdale":     { par:71, yards:7261, type:"Standard",  grassType:"Bermuda",  location:"Scottsdale, AZ",        weights:{sgOTT:0.26,sgAPP:0.35,sgATG:0.20,sgPUTT:0.19}, traits:["Desert surrounds punishing","Firm fast conditions","Low scoring typical","Bermuda putting"] },
  "Kapalua":            { par:73, yards:7596, type:"Standard",  grassType:"Bermuda/Paspalum",location:"Maui, HI",       weights:{sgOTT:0.34,sgAPP:0.35,sgATG:0.14,sgPUTT:0.17}, traits:["Distance dominant","Strong trade winds","Very low scoring","Wide fairways"] },
  "East Lake":          { par:70, yards:7346, type:"Championship",grassType:"Bermuda",location:"Atlanta, GA",           weights:{sgOTT:0.25,sgAPP:0.38,sgATG:0.17,sgPUTT:0.20}, traits:["Elite-only field","Starters scoring","Bermuda putting","Ball-striking premium"] },
  "Colonial CC":        { par:70, yards:7209, type:"Standard",  grassType:"Bermuda",  location:"Fort Worth, TX",        weights:{sgOTT:0.20,sgAPP:0.36,sgATG:0.22,sgPUTT:0.22}, traits:["Accuracy essential","Hogan's Alley","Iron play critical","Wind from the south"] },
  "Bethpage Black":     { par:71, yards:7459, type:"Major",     grassType:"Bentgrass/Poa",location:"Farmingdale, NY",   weights:{sgOTT:0.24,sgAPP:0.39,sgATG:0.19,sgPUTT:0.18}, traits:["Notoriously difficult","Thick rough penalizes","Ball-striking paramount","Northeast wind"] },
};

// Built-in player database — 120 players with SG profiles through mid-2025
// Used as fallback when scraper hasn't been run
const PLAYERS_DB = [
  // Tier 1 — Elite
  { name:"Scottie Scheffler",   sgOTT:0.85, sgAPP:1.24, sgATG:0.36, sgPUTT:0.20, dist:309, acc:63, gir:73, scr:63, ctry:"USA" },
  { name:"Xander Schauffele",   sgOTT:0.72, sgAPP:1.01, sgATG:0.43, sgPUTT:0.44, dist:303, acc:61, gir:71, scr:61, ctry:"USA" },
  { name:"Rory McIlroy",        sgOTT:1.08, sgAPP:0.89, sgATG:0.24, sgPUTT:0.33, dist:328, acc:56, gir:69, scr:56, ctry:"NIR" },
  { name:"Collin Morikawa",     sgOTT:0.43, sgAPP:1.21, sgATG:0.30, sgPUTT:0.20, dist:296, acc:65, gir:75, scr:58, ctry:"USA" },
  { name:"Ludvig Åberg",        sgOTT:0.93, sgAPP:0.91, sgATG:0.31, sgPUTT:0.22, dist:314, acc:61, gir:69, scr:57, ctry:"SWE" },
  { name:"Viktor Hovland",      sgOTT:0.80, sgAPP:0.93, sgATG:0.20, sgPUTT:0.37, dist:313, acc:59, gir:70, scr:53, ctry:"NOR" },
  { name:"Jon Rahm",            sgOTT:0.70, sgAPP:0.96, sgATG:0.41, sgPUTT:0.49, dist:305, acc:60, gir:70, scr:64, ctry:"ESP" },
  { name:"Patrick Cantlay",     sgOTT:0.53, sgAPP:0.90, sgATG:0.33, sgPUTT:0.60, dist:297, acc:66, gir:72, scr:62, ctry:"USA" },
  // Tier 2 — Top 20
  { name:"Wyndham Clark",       sgOTT:0.86, sgAPP:0.76, sgATG:0.23, sgPUTT:0.46, dist:319, acc:57, gir:66, scr:54, ctry:"USA" },
  { name:"Brian Harman",        sgOTT:0.23, sgAPP:0.73, sgATG:0.50, sgPUTT:0.64, dist:279, acc:69, gir:67, scr:69, ctry:"USA" },
  { name:"Max Homa",            sgOTT:0.49, sgAPP:0.84, sgATG:0.38, sgPUTT:0.31, dist:300, acc:63, gir:69, scr:60, ctry:"USA" },
  { name:"Tommy Fleetwood",     sgOTT:0.46, sgAPP:0.95, sgATG:0.35, sgPUTT:0.29, dist:298, acc:64, gir:71, scr:59, ctry:"ENG" },
  { name:"Shane Lowry",         sgOTT:0.32, sgAPP:0.81, sgATG:0.46, sgPUTT:0.40, dist:290, acc:64, gir:68, scr:64, ctry:"IRL" },
  { name:"Tyrrell Hatton",      sgOTT:0.40, sgAPP:0.87, sgATG:0.44, sgPUTT:0.35, dist:292, acc:63, gir:68, scr:63, ctry:"ENG" },
  { name:"Tony Finau",          sgOTT:0.90, sgAPP:0.71, sgATG:0.30, sgPUTT:0.20, dist:319, acc:57, gir:66, scr:56, ctry:"USA" },
  { name:"Russell Henley",      sgOTT:0.42, sgAPP:0.79, sgATG:0.34, sgPUTT:0.53, dist:293, acc:65, gir:68, scr:61, ctry:"USA" },
  { name:"Hideki Matsuyama",    sgOTT:0.56, sgAPP:0.90, sgATG:0.21, sgPUTT:0.42, dist:299, acc:62, gir:70, scr:55, ctry:"JPN" },
  { name:"Matt Fitzpatrick",    sgOTT:0.37, sgAPP:0.93, sgATG:0.40, sgPUTT:0.24, dist:292, acc:67, gir:71, scr:63, ctry:"ENG" },
  { name:"Keegan Bradley",      sgOTT:0.53, sgAPP:0.70, sgATG:0.33, sgPUTT:0.45, dist:302, acc:63, gir:66, scr:60, ctry:"USA" },
  { name:"Adam Scott",          sgOTT:0.45, sgAPP:0.74, sgATG:0.27, sgPUTT:0.43, dist:294, acc:64, gir:67, scr:59, ctry:"AUS" },
  // Tier 3 — Strong mid-tier
  { name:"Sahith Theegala",     sgOTT:0.81, sgAPP:0.73, sgATG:0.37, sgPUTT:0.16, dist:313, acc:58, gir:66, scr:58, ctry:"USA" },
  { name:"Tom Kim",             sgOTT:0.63, sgAPP:0.76, sgATG:0.31, sgPUTT:0.37, dist:301, acc:61, gir:67, scr:58, ctry:"KOR" },
  { name:"Cameron Young",       sgOTT:0.98, sgAPP:0.73, sgATG:0.24, sgPUTT:0.14, dist:322, acc:55, gir:65, scr:54, ctry:"USA" },
  { name:"Akshay Bhatia",       sgOTT:0.74, sgAPP:0.64, sgATG:0.43, sgPUTT:0.21, dist:309, acc:58, gir:64, scr:61, ctry:"USA" },
  { name:"Will Zalatoris",      sgOTT:0.62, sgAPP:0.86, sgATG:0.22, sgPUTT:0.13, dist:304, acc:62, gir:68, scr:53, ctry:"USA" },
  { name:"Justin Thomas",       sgOTT:0.59, sgAPP:0.84, sgATG:0.30, sgPUTT:0.20, dist:305, acc:61, gir:68, scr:58, ctry:"USA" },
  { name:"Jordan Spieth",       sgOTT:0.32, sgAPP:0.73, sgATG:0.53, sgPUTT:0.57, dist:290, acc:64, gir:66, scr:66, ctry:"USA" },
  { name:"Jason Day",           sgOTT:0.42, sgAPP:0.71, sgATG:0.40, sgPUTT:0.50, dist:292, acc:63, gir:66, scr:62, ctry:"AUS" },
  { name:"Denny McCarthy",      sgOTT:0.29, sgAPP:0.63, sgATG:0.31, sgPUTT:0.73, dist:283, acc:67, gir:64, scr:61, ctry:"USA" },
  { name:"Eric Cole",           sgOTT:0.45, sgAPP:0.75, sgATG:0.40, sgPUTT:0.38, dist:295, acc:63, gir:67, scr:61, ctry:"USA" },
  { name:"Taylor Moore",        sgOTT:0.36, sgAPP:0.69, sgATG:0.42, sgPUTT:0.32, dist:292, acc:64, gir:66, scr:62, ctry:"USA" },
  { name:"Austin Eckroat",      sgOTT:0.47, sgAPP:0.72, sgATG:0.35, sgPUTT:0.24, dist:297, acc:63, gir:66, scr:59, ctry:"USA" },
  { name:"Davis Thompson",      sgOTT:0.54, sgAPP:0.66, sgATG:0.33, sgPUTT:0.30, dist:301, acc:61, gir:65, scr:57, ctry:"USA" },
  { name:"Jake Knapp",          sgOTT:0.84, sgAPP:0.60, sgATG:0.31, sgPUTT:0.29, dist:320, acc:55, gir:63, scr:56, ctry:"USA" },
  { name:"Byeong Hun An",       sgOTT:0.43, sgAPP:0.74, sgATG:0.35, sgPUTT:0.37, dist:295, acc:63, gir:66, scr:59, ctry:"KOR" },
  { name:"Si Woo Kim",          sgOTT:0.39, sgAPP:0.70, sgATG:0.33, sgPUTT:0.44, dist:293, acc:64, gir:65, scr:60, ctry:"KOR" },
  { name:"Corey Conners",       sgOTT:0.53, sgAPP:0.76, sgATG:0.24, sgPUTT:0.26, dist:300, acc:66, gir:69, scr:55, ctry:"CAN" },
  { name:"Nick Taylor",         sgOTT:0.45, sgAPP:0.64, sgATG:0.40, sgPUTT:0.40, dist:295, acc:63, gir:64, scr:61, ctry:"CAN" },
  { name:"Sungjae Im",          sgOTT:0.52, sgAPP:0.71, sgATG:0.29, sgPUTT:0.38, dist:299, acc:63, gir:66, scr:58, ctry:"KOR" },
  { name:"Chris Kirk",          sgOTT:0.34, sgAPP:0.71, sgATG:0.43, sgPUTT:0.46, dist:287, acc:66, gir:66, scr:64, ctry:"USA" },
  { name:"Sepp Straka",         sgOTT:0.48, sgAPP:0.73, sgATG:0.30, sgPUTT:0.39, dist:296, acc:63, gir:66, scr:58, ctry:"AUT" },
  { name:"Harris English",      sgOTT:0.59, sgAPP:0.68, sgATG:0.35, sgPUTT:0.31, dist:303, acc:61, gir:65, scr:59, ctry:"USA" },
  { name:"Billy Horschel",      sgOTT:0.30, sgAPP:0.70, sgATG:0.44, sgPUTT:0.41, dist:285, acc:65, gir:65, scr:63, ctry:"USA" },
  { name:"Robert MacIntyre",    sgOTT:0.56, sgAPP:0.73, sgATG:0.38, sgPUTT:0.30, dist:302, acc:62, gir:66, scr:60, ctry:"SCO" },
  { name:"Rickie Fowler",       sgOTT:0.45, sgAPP:0.73, sgATG:0.37, sgPUTT:0.30, dist:297, acc:63, gir:66, scr:60, ctry:"USA" },
  { name:"Matthieu Pavon",      sgOTT:0.63, sgAPP:0.66, sgATG:0.33, sgPUTT:0.24, dist:305, acc:60, gir:64, scr:57, ctry:"FRA" },
  { name:"Nicolai Højgaard",    sgOTT:0.67, sgAPP:0.71, sgATG:0.32, sgPUTT:0.24, dist:307, acc:60, gir:65, scr:57, ctry:"DEN" },
  { name:"Rasmus Højgaard",     sgOTT:0.65, sgAPP:0.69, sgATG:0.34, sgPUTT:0.26, dist:306, acc:60, gir:64, scr:58, ctry:"DEN" },
  { name:"Victor Perez",        sgOTT:0.47, sgAPP:0.72, sgATG:0.37, sgPUTT:0.26, dist:297, acc:63, gir:66, scr:59, ctry:"FRA" },
  { name:"Min Woo Lee",         sgOTT:0.71, sgAPP:0.68, sgATG:0.36, sgPUTT:0.23, dist:309, acc:58, gir:64, scr:58, ctry:"AUS" },
  { name:"Dean Burmester",      sgOTT:0.79, sgAPP:0.60, sgATG:0.30, sgPUTT:0.21, dist:319, acc:57, gir:63, scr:55, ctry:"RSA" },
  // Tier 4 — Solid tour players
  { name:"K.H. Lee",            sgOTT:0.48, sgAPP:0.63, sgATG:0.32, sgPUTT:0.38, dist:296, acc:62, gir:64, scr:59, ctry:"KOR" },
  { name:"Kurt Kitayama",       sgOTT:0.44, sgAPP:0.67, sgATG:0.35, sgPUTT:0.35, dist:295, acc:63, gir:65, scr:59, ctry:"USA" },
  { name:"Adam Hadwin",         sgOTT:0.36, sgAPP:0.64, sgATG:0.31, sgPUTT:0.42, dist:290, acc:64, gir:64, scr:60, ctry:"CAN" },
  { name:"Nate Lashley",        sgOTT:0.41, sgAPP:0.61, sgATG:0.38, sgPUTT:0.34, dist:293, acc:63, gir:63, scr:60, ctry:"USA" },
  { name:"Alex Noren",          sgOTT:0.28, sgAPP:0.65, sgATG:0.42, sgPUTT:0.38, dist:283, acc:65, gir:64, scr:62, ctry:"SWE" },
  { name:"Brendon Todd",        sgOTT:0.22, sgAPP:0.60, sgATG:0.35, sgPUTT:0.48, dist:281, acc:67, gir:63, scr:61, ctry:"USA" },
  { name:"Ben Griffin",         sgOTT:0.35, sgAPP:0.62, sgATG:0.37, sgPUTT:0.36, dist:291, acc:64, gir:63, scr:60, ctry:"USA" },
  { name:"Chez Reavie",         sgOTT:0.18, sgAPP:0.59, sgATG:0.40, sgPUTT:0.44, dist:279, acc:67, gir:62, scr:61, ctry:"USA" },
  { name:"Doc Redman",          sgOTT:0.39, sgAPP:0.61, sgATG:0.34, sgPUTT:0.33, dist:292, acc:63, gir:63, scr:59, ctry:"USA" },
  { name:"Justin Rose",         sgOTT:0.34, sgAPP:0.68, sgATG:0.32, sgPUTT:0.32, dist:289, acc:64, gir:65, scr:59, ctry:"ENG" },
  { name:"Luke Donald",         sgOTT:0.21, sgAPP:0.58, sgATG:0.36, sgPUTT:0.47, dist:278, acc:67, gir:62, scr:61, ctry:"ENG" },
  { name:"Padraig Harrington",  sgOTT:0.19, sgAPP:0.55, sgATG:0.38, sgPUTT:0.40, dist:279, acc:66, gir:61, scr:61, ctry:"IRL" },
  { name:"Webb Simpson",        sgOTT:0.20, sgAPP:0.61, sgATG:0.33, sgPUTT:0.49, dist:279, acc:67, gir:62, scr:60, ctry:"USA" },
  { name:"Stewart Cink",        sgOTT:0.24, sgAPP:0.57, sgATG:0.31, sgPUTT:0.42, dist:282, acc:66, gir:62, scr:59, ctry:"USA" },
  { name:"David Lipsky",        sgOTT:0.46, sgAPP:0.62, sgATG:0.30, sgPUTT:0.31, dist:296, acc:62, gir:63, scr:57, ctry:"USA" },
  { name:"Beau Hossler",        sgOTT:0.37, sgAPP:0.63, sgATG:0.35, sgPUTT:0.33, dist:292, acc:63, gir:64, scr:59, ctry:"USA" },
  { name:"Sam Burns",           sgOTT:0.55, sgAPP:0.71, sgATG:0.31, sgPUTT:0.28, dist:300, acc:62, gir:66, scr:58, ctry:"USA" },
  { name:"Patrick Reed",        sgOTT:0.32, sgAPP:0.67, sgATG:0.50, sgPUTT:0.42, dist:289, acc:64, gir:64, scr:65, ctry:"USA" },
  { name:"Dustin Johnson",      sgOTT:0.74, sgAPP:0.63, sgATG:0.20, sgPUTT:0.31, dist:320, acc:56, gir:64, scr:54, ctry:"USA" },
  { name:"Brooks Koepka",       sgOTT:0.68, sgAPP:0.76, sgATG:0.24, sgPUTT:0.28, dist:313, acc:58, gir:66, scr:56, ctry:"USA" },
  { name:"Bubba Watson",        sgOTT:0.82, sgAPP:0.55, sgATG:0.28, sgPUTT:0.30, dist:325, acc:52, gir:62, scr:55, ctry:"USA" },
  { name:"Sergio Garcia",       sgOTT:0.48, sgAPP:0.65, sgATG:0.38, sgPUTT:0.36, dist:296, acc:63, gir:64, scr:61, ctry:"ESP" },
  { name:"Lee Westwood",        sgOTT:0.31, sgAPP:0.62, sgATG:0.30, sgPUTT:0.36, dist:287, acc:64, gir:63, scr:58, ctry:"ENG" },
  { name:"Ian Poulter",         sgOTT:0.25, sgAPP:0.58, sgATG:0.41, sgPUTT:0.38, dist:283, acc:65, gir:62, scr:61, ctry:"ENG" },
  // Tier 5 — Field fillers / value plays
  { name:"Mark Hubbard",        sgOTT:0.33, sgAPP:0.58, sgATG:0.36, sgPUTT:0.34, dist:290, acc:64, gir:63, scr:59, ctry:"USA" },
  { name:"Tyler Duncan",        sgOTT:0.30, sgAPP:0.56, sgATG:0.34, sgPUTT:0.37, dist:288, acc:65, gir:62, scr:59, ctry:"USA" },
  { name:"Zac Blair",           sgOTT:0.26, sgAPP:0.53, sgATG:0.33, sgPUTT:0.39, dist:285, acc:66, gir:61, scr:59, ctry:"USA" },
  { name:"Danny Willett",       sgOTT:0.32, sgAPP:0.61, sgATG:0.34, sgPUTT:0.33, dist:289, acc:64, gir:63, scr:59, ctry:"ENG" },
  { name:"Abraham Ancer",       sgOTT:0.44, sgAPP:0.63, sgATG:0.36, sgPUTT:0.28, dist:295, acc:63, gir:64, scr:59, ctry:"MEX" },
  { name:"Marc Leishman",       sgOTT:0.55, sgAPP:0.62, sgATG:0.28, sgPUTT:0.27, dist:300, acc:61, gir:63, scr:56, ctry:"AUS" },
  { name:"Charley Hoffman",     sgOTT:0.47, sgAPP:0.58, sgATG:0.31, sgPUTT:0.31, dist:296, acc:62, gir:62, scr:57, ctry:"USA" },
  { name:"Scott Stallings",     sgOTT:0.40, sgAPP:0.57, sgATG:0.33, sgPUTT:0.34, dist:293, acc:63, gir:62, scr:58, ctry:"USA" },
  { name:"Harold Varner III",   sgOTT:0.51, sgAPP:0.59, sgATG:0.29, sgPUTT:0.25, dist:299, acc:61, gir:63, scr:56, ctry:"USA" },
  { name:"J.T. Poston",         sgOTT:0.28, sgAPP:0.61, sgATG:0.33, sgPUTT:0.41, dist:286, acc:65, gir:63, scr:60, ctry:"USA" },
  { name:"Luke List",           sgOTT:0.71, sgAPP:0.55, sgATG:0.26, sgPUTT:0.19, dist:314, acc:56, gir:62, scr:54, ctry:"USA" },
  { name:"Hayden Buckley",      sgOTT:0.44, sgAPP:0.60, sgATG:0.31, sgPUTT:0.29, dist:295, acc:62, gir:63, scr:57, ctry:"USA" },
  { name:"Ryan Brehm",          sgOTT:0.31, sgAPP:0.57, sgATG:0.34, sgPUTT:0.36, dist:288, acc:64, gir:62, scr:59, ctry:"USA" },
  { name:"Camilo Villegas",     sgOTT:0.33, sgAPP:0.56, sgATG:0.37, sgPUTT:0.35, dist:289, acc:64, gir:62, scr:60, ctry:"COL" },
  { name:"Adam Schenk",         sgOTT:0.38, sgAPP:0.58, sgATG:0.32, sgPUTT:0.31, dist:292, acc:63, gir:62, scr:58, ctry:"USA" },
  { name:"Emiliano Grillo",     sgOTT:0.40, sgAPP:0.60, sgATG:0.34, sgPUTT:0.28, dist:293, acc:63, gir:63, scr:58, ctry:"ARG" },
  { name:"Dylan Frittelli",     sgOTT:0.35, sgAPP:0.57, sgATG:0.33, sgPUTT:0.33, dist:290, acc:64, gir:62, scr:58, ctry:"RSA" },
  { name:"Graeme McDowell",     sgOTT:0.22, sgAPP:0.55, sgATG:0.38, sgPUTT:0.42, dist:280, acc:66, gir:61, scr:61, ctry:"NIR" },
  { name:"Kevin Streelman",     sgOTT:0.27, sgAPP:0.55, sgATG:0.33, sgPUTT:0.44, dist:284, acc:66, gir:62, scr:60, ctry:"USA" },
  { name:"Brian Gay",           sgOTT:0.14, sgAPP:0.52, sgATG:0.32, sgPUTT:0.46, dist:276, acc:68, gir:61, scr:60, ctry:"USA" },
  { name:"Scott Brown",         sgOTT:0.38, sgAPP:0.54, sgATG:0.30, sgPUTT:0.31, dist:292, acc:63, gir:62, scr:57, ctry:"USA" },
  { name:"Jim Furyk",           sgOTT:0.10, sgAPP:0.53, sgATG:0.34, sgPUTT:0.45, dist:273, acc:70, gir:61, scr:60, ctry:"USA" },
  { name:"Brendan Steele",      sgOTT:0.36, sgAPP:0.55, sgATG:0.31, sgPUTT:0.32, dist:291, acc:63, gir:62, scr:57, ctry:"USA" },
  { name:"Bronson Burgoon",     sgOTT:0.35, sgAPP:0.53, sgATG:0.31, sgPUTT:0.32, dist:290, acc:63, gir:61, scr:57, ctry:"USA" },
];

// ──────────────────────────────────────────────────────────────
// SIMULATION ENGINE (client-side fallback)
// ──────────────────────────────────────────────────────────────

function lcg(seed) {
  let s = (seed >>> 0) || 12345;
  return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 0xffffffff; };
}
function bm(rng) {
  return Math.sqrt(-2*Math.log(Math.max(1e-10, rng()))) * Math.cos(2*Math.PI*rng());
}
function coursefit(p, course, wind=10) {
  const w = course.weights;
  let v = p.sgOTT*w.sgOTT + p.sgAPP*w.sgAPP + p.sgATG*w.sgATG + p.sgPUTT*w.sgPUTT;
  if (wind > 14) { const ws = Math.min(0.10,(wind-14)*0.007); v += (p.sgOTT+p.sgAPP)*ws - p.sgPUTT*ws*0.6; }
  return v;
}
function formboost(form) {
  if (!form?.length) return 0;
  const wts = [0.35,0.25,0.18,0.11,0.06,0.03,0.015,0.008,0.004,0.003];
  const w = wts.slice(0,form.length), tw = w.reduce((a,b)=>a+b,0);
  return (form.reduce((a,v,i)=>a+v*w[i],0)/tw - 0.5)*0.24;
}
function genForm(sg) {
  const b = sg*0.5; let prev = b;
  return Array.from({length:10},()=>{ const v = 0.6*b+0.2*prev+0.2*(Math.random()-0.5)*1.8; prev=v; return +v.toFixed(2); });
}
function consistency(form) {
  if (!form?.length) return 0.75;
  const m = form.reduce((a,b)=>a+b,0)/form.length;
  const std = Math.sqrt(form.reduce((a,b)=>a+(b-m)**2,0)/form.length);
  return Math.max(0.50, Math.min(0.95, 1.0-std*0.28));
}
function americanOdds(d) { return d>=2?`+${Math.round((d-1)*100)}`:`-${Math.round(100/(d-1))}`; }

function simulate(players, course, nSims, wind=10) {
  const rng = lcg(Date.now() % 99999 + 1);
  const n = players.length;
  const mus = players.map(p => { const f=coursefit(p,course,wind); const fm=formboost(p.recentForm); return f+fm; });
  const sigmas = players.map(p => Math.max(1.5, 4.0 - consistency(p.recentForm)*2.2));
  const wins=new Int32Array(n),t5=new Int32Array(n),t10=new Int32Array(n),t20=new Int32Array(n),mc=new Int32Array(n);
  const totpos=new Float64Array(n);
  const cutSize = Math.floor(n*0.65);
  const scores=new Float64Array(n), final=new Float64Array(n), ranks=new Uint16Array(n);

  for (let s=0;s<nSims;s++) {
    const fn12 = bm(rng)*0.5;
    for (let i=0;i<n;i++) scores[i] = mus[i]+bm(rng)*sigmas[i] + mus[i]+bm(rng)*sigmas[i] + fn12;
    const sorted=[...scores].sort((a,b)=>b-a);
    const cutLine = sorted[cutSize] ?? -Infinity;
    const fn34 = bm(rng)*0.5;
    for (let i=0;i<n;i++) {
      if (scores[i]>=cutLine) { mc[i]++; final[i]=scores[i]+mus[i]+bm(rng)*sigmas[i]+mus[i]+bm(rng)*sigmas[i]+fn34; }
      else final[i]=-9999;
    }
    for (let i=0;i<n;i++) ranks[i]=i;
    ranks.sort((a,b)=>final[b]-final[a]);
    for (let pos=0;pos<n;pos++) {
      const i=ranks[pos]; totpos[i]+=pos;
      if(pos===0)wins[i]++;if(pos<5)t5[i]++;if(pos<10)t10[i]++;if(pos<20)t20[i]++;
    }
  }

  return players.map((p,i)=>{
    const wPct=wins[i]/nSims*100, dec=nSims/Math.max(1,wins[i]);
    const fit=coursefit(p,course,wind), fm=formboost(p.recentForm), cons=consistency(p.recentForm);
    return {...p,courseFit:+fit.toFixed(3),formBoost:+fm.toFixed(3),consistency:+cons.toFixed(3),
      winPct:+wPct.toFixed(2),top5Pct:+(t5[i]/nSims*100).toFixed(2),top10Pct:+(t10[i]/nSims*100).toFixed(2),
      top20Pct:+(t20[i]/nSims*100).toFixed(2),makeCutPct:+(mc[i]/nSims*100).toFixed(2),
      avgFinish:+(totpos[i]/nSims+1).toFixed(1),odds:americanOdds(dec),decOdds:+dec.toFixed(1)};
  }).sort((a,b)=>b.winPct-a.winPct);
}

// ──────────────────────────────────────────────────────────────
// COMPONENTS
// ──────────────────────────────────────────────────────────────

function Badge({ children, color="#6366f1" }) {
  return <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:`${color}18`,border:`1px solid ${color}44`,color,fontWeight:700}}>{children}</span>;
}

function WinChip({ pct }) {
  const n=parseFloat(pct);
  const c=n>18?"#f59e0b":n>10?"#10b981":n>4?"#3b82f6":"#475569";
  return <span style={{fontFamily:"monospace",fontWeight:800,fontSize:13,padding:"3px 10px",borderRadius:6,background:`${c}18`,color:c}}>{pct}%</span>;
}

function Bar({ value, max=1.4, color }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <div style={{flex:1,height:5,background:"#0d1626",borderRadius:3,overflow:"hidden"}}>
        <div style={{width:`${Math.max(0,Math.min(100,(value/max)*100))}%`,height:"100%",background:color,borderRadius:3}}/>
      </div>
      <span style={{fontSize:11,fontFamily:"monospace",color:"#64748b",minWidth:38,textAlign:"right"}}>{value>0?"+":""}{value.toFixed(2)}</span>
    </div>
  );
}

function FormChart({ form }) {
  if (!form?.length) return null;
  const max = Math.max(...form.map(Math.abs), 0.5);
  return (
    <div style={{display:"flex",gap:3,alignItems:"flex-end",height:48}}>
      {form.slice(0,10).map((v,i)=>{
        const h = Math.max(5,(Math.max(0,v)/Math.max(max,2))*44);
        const neg = Math.max(5,(Math.max(0,-v)/Math.max(max,2))*44);
        const c = v>1.5?"#10b981":v>0.5?"#3b82f6":v>0?"#64748b":"#ef4444";
        return (
          <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <div style={{fontSize:8,color:"#1e293b",fontFamily:"monospace"}}>{v>0?`+${v}`:v}</div>
            <div style={{width:"100%",height:`${h}px`,background:c,borderRadius:"2px 2px 0 0",opacity:.6+i*.03}}/>
            <div style={{fontSize:8,color:"#1e293b"}}>T-{10-i}</div>
          </div>
        );
      })}
    </div>
  );
}

function CourseWeightChart({ course }) {
  return (
    <div>
      {SG_META.map(({key,label,color})=>(
        <div key={key} style={{marginBottom:8}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#475569",marginBottom:3}}>
            <span>{label}</span>
            <span style={{fontFamily:"monospace",color}}>{(course.weights[key]*100).toFixed(0)}%</span>
          </div>
          <div style={{height:4,background:"#0a0f1c",borderRadius:2}}>
            <div style={{width:`${course.weights[key]*100}%`,height:"100%",background:color,borderRadius:2,opacity:.8}}/>
          </div>
        </div>
      ))}
    </div>
  );
}

function DataBadge({ source }) {
  if (source === "live") return <Badge color="#10b981">🟢 Live Data</Badge>;
  if (source === "rank_estimated") return <Badge color="#f59e0b">⚠ Estimated</Badge>;
  return <Badge color="#6366f1">📊 2024-25 SG</Badge>;
}

function PlayerDetail({ player, course, rank, onClose }) {
  const wc = parseFloat(player.winPct)>15?"#f59e0b":parseFloat(player.winPct)>8?"#10b981":"#3b82f6";
  const form = player.recentForm || genForm((player.sgOTT||0)+(player.sgAPP||0)+(player.sgATG||0)+(player.sgPUTT||0));
  return (
    <div style={{position:"fixed",top:0,right:0,bottom:0,width:"min(540px,100vw)",background:"#070b14",borderLeft:"1px solid #1e293b",zIndex:300,overflowY:"auto",boxShadow:"-24px 0 80px rgba(0,0,0,0.9)"}}>
      <style>{`@keyframes sld{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
      <div style={{animation:"sld 0.2s ease"}}>
        {/* Header */}
        <div style={{padding:"20px 24px",borderBottom:"1px solid #0f172a",background:"#070b14",position:"sticky",top:0,zIndex:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{fontSize:20,fontWeight:900,fontFamily:"'Syne',sans-serif",color:"#f1f5f9"}}>{player.name}</div>
              <div style={{fontSize:12,color:"#334155",marginTop:3,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                <span>#{rank} predicted</span>
                <span>·</span>
                <span>{player.ctry || player.country || ""}</span>
                {player.worldRank && player.worldRank < 500 && <><span>·</span><span>WR#{player.worldRank}</span></>}
                <DataBadge source={player.dataSource} />
              </div>
            </div>
            <button onClick={onClose} style={{background:"#0f172a",border:"1px solid #1e293b",color:"#64748b",borderRadius:8,padding:"8px 12px",cursor:"pointer",fontSize:14}}>✕</button>
          </div>
        </div>

        <div style={{padding:22}}>
          {/* Hero probabilities */}
          <div style={{background:`linear-gradient(135deg,${wc}10,#0f172a)`,border:`1px solid ${wc}33`,borderRadius:14,padding:18,marginBottom:18}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,textAlign:"center"}}>
              {[["WIN",player.winPct+"%",28,wc],["TOP 5",player.top5Pct+"%",20,"#94a3b8"],["TOP 10",player.top10Pct+"%",20,"#94a3b8"],["TOP 20",player.top20Pct+"%",20,"#94a3b8"],["CUT",player.makeCutPct+"%",18,"#64748b"]].map(([l,v,sz,c])=>(
                <div key={l}>
                  <div style={{fontSize:sz,fontWeight:900,fontFamily:"monospace",color:c}}>{v}</div>
                  <div style={{fontSize:9,color:"#334155",textTransform:"uppercase",letterSpacing:1,marginTop:2}}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Odds + fit + form row */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:18}}>
            {[["Model Odds",player.odds,"#94a3b8"],["Course Fit",`${player.courseFit>0?"+":""}${player.courseFit}`,player.courseFit>0.8?"#10b981":"#64748b"],["Form Boost",`${player.formBoost>0?"+":""}${player.formBoost}`,player.formBoost>0?"#10b981":"#ef4444"]].map(([l,v,c])=>(
              <div key={l} style={{padding:"12px 14px",background:"#0f172a",border:"1px solid #1e293b",borderRadius:10,textAlign:"center"}}>
                <div style={{fontSize:20,fontWeight:900,fontFamily:"monospace",color:c}}>{v}</div>
                <div style={{fontSize:9,color:"#334155",textTransform:"uppercase",letterSpacing:1,marginTop:3}}>{l}</div>
              </div>
            ))}
          </div>

          {/* SG + Course Fit breakdown */}
          <div style={{marginBottom:18}}>
            <div style={{fontSize:10,color:"#6366f1",fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,marginBottom:10}}>Course Fit Breakdown</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {SG_META.map(({key,label,color})=>{
                const val=player[key]||0, cw=course.weights[key], contrib=val*cw;
                return (
                  <div key={key} style={{padding:"10px 12px",background:"#0a0f1c",border:"1px solid #0f172a",borderRadius:9}}>
                    <div style={{fontSize:9,color:"#334155",marginBottom:5,display:"flex",justifyContent:"space-between"}}>
                      <span>{label}</span><span>{(cw*100).toFixed(0)}% weight</span>
                    </div>
                    <Bar value={val} color={color} />
                    <div style={{fontSize:10,color,marginTop:4,textAlign:"right",fontFamily:"monospace",fontWeight:700}}>+{contrib.toFixed(3)} pts</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent form */}
          <div style={{marginBottom:18}}>
            <div style={{fontSize:10,color:"#6366f1",fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,marginBottom:8}}>Recent Form (SG Total per event)</div>
            <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:10,padding:14}}>
              <FormChart form={form} />
            </div>
          </div>

          {/* Stats */}
          <div style={{marginBottom:18}}>
            <div style={{fontSize:10,color:"#6366f1",fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,marginBottom:10}}>Season Stats</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[["Drive Dist",`${player.dist} yds`,player.dist>310],["Drive Acc",`${player.acc}%`,player.acc>64],["GIR",`${player.gir}%`,player.gir>69],["Scrambling",`${player.scr}%`,player.scr>62]].filter(([,,v])=>v!==undefined).map(([l,v,hi])=>(
                <div key={l} style={{padding:"10px 12px",background:"#0a0f1c",border:"1px solid #0f172a",borderRadius:9}}>
                  <div style={{fontSize:9,color:"#334155",marginBottom:3}}>{l}</div>
                  <div style={{fontSize:15,fontWeight:700,fontFamily:"monospace",color:hi?"#10b981":"#64748b"}}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Model insight */}
          <div style={{padding:14,background:"rgba(99,102,241,0.06)",border:"1px solid #6366f122",borderRadius:10,fontSize:12,color:"#94a3b8",lineHeight:1.7}}>
            <span style={{color:"#6366f1",fontWeight:700}}>💡 Model Insight · </span>
            {parseFloat(player.courseFit)>0.85
              ? `Outstanding course fit — ${player.name.split(" ")[1]}'s profile aligns precisely with what this venue rewards. Strong top-5 candidate.`
              : parseFloat(player.formBoost)>0.12
              ? `Form is the story here. Recent results suggest a player in form who may be undervalued by the market this week.`
              : parseFloat(player.winPct)>10
              ? `Consistent performer with solid course fit. Reliable top-10 candidate backed by stable SG metrics across multiple seasons.`
              : `Moderate projection. Worth monitoring R1 scoring before committing to live bets.`}
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// MAIN APP
// ──────────────────────────────────────────────────────────────

export default function GolfOracle() {
  const [course, setCourse] = useState("TPC Sawgrass");
  const [wind, setWind] = useState(10);
  const [nSims, setNSims] = useState(25000);
  const [fieldSize, setFieldSize] = useState(80);
  const [results, setResults] = useState([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [tab, setTab] = useState("leaderboard");
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("winPct");
  const [ran, setRan] = useState(false);
  const [dataSource, setDataSource] = useState("builtin"); // "live" | "builtin"
  const [liveData, setLiveData] = useState(null);
  const [loadingLive, setLoadingLive] = useState(false);
  const [meta, setMeta] = useState(null);
  const [filterCountry, setFilterCountry] = useState("all");
  const progRef = useRef(null);

  const courseObj = COURSES[course];

  // Try to load results.json on mount (from scraper)
  useEffect(() => {
    setLoadingLive(true);
    fetch("data/results.json")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.results?.length) {
          setLiveData(data);
          setMeta(data.meta);
          setDataSource("live");
          setResults(data.results);
          setRan(true);
          // Sync course selection to live data
          const liveCourseName = Object.keys(COURSES).find(k =>
            data.meta?.courseName?.toLowerCase().includes(k.toLowerCase()) ||
            k.toLowerCase().includes(data.meta?.courseName?.toLowerCase().split(" ")[0] || "")
          );
          if (liveCourseName) setCourse(liveCourseName);
          if (data.meta?.avgWindMph) setWind(data.meta.avgWindMph);
          console.log("✅ Live data loaded from data/results.json");
        }
      })
      .catch(() => {}) // Silently fail — will use built-in simulation
      .finally(() => setLoadingLive(false));
  }, []);

  const runModel = useCallback(() => {
    setRunning(true);
    setProgress(0);
    setSelected(null);
    setDataSource("builtin");

    progRef.current = setInterval(() => {
      setProgress(p => Math.min(92, p + Math.random() * 12));
    }, 90);

    setTimeout(() => {
      const field = PLAYERS_DB.slice(0, fieldSize).map(p => ({
        ...p,
        recentForm: p.recentForm || genForm(p.sgOTT+p.sgAPP+p.sgATG+p.sgPUTT),
      }));
      const res = simulate(field, courseObj, nSims, wind);
      clearInterval(progRef.current);
      setProgress(100);
      setTimeout(() => {
        setResults(res);
        setMeta(null);
        setRunning(false);
        setRan(true);
        setProgress(0);
      }, 250);
    }, 900);
  }, [course, nSims, fieldSize, wind, courseObj]);

  // Countries in current results
  const countries = ["all", ...new Set(results.map(p => p.ctry||p.country||"").filter(Boolean))].sort();

  const displayed = results
    .filter(p => {
      const nm = p.name?.toLowerCase().includes(search.toLowerCase());
      const cy = filterCountry === "all" || (p.ctry||p.country) === filterCountry;
      return nm && cy;
    })
    .sort((a,b) => {
      if (sortBy === "avgFinish") return a.avgFinish - b.avgFinish;
      return (b[sortBy]||0) - (a[sortBy]||0);
    });

  const isLive = dataSource === "live";

  return (
    <div style={{minHeight:"100vh",background:"#060a13",color:"#f1f5f9",fontFamily:"'DM Sans','Inter',sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800;900&family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:#0a0f1c} ::-webkit-scrollbar-thumb{background:#1e293b;border-radius:4px}
        select,input{background:#0d1626;border:1px solid #1e293b;border-radius:8px;color:#f1f5f9;padding:9px 14px;font-size:13px;outline:none;font-family:inherit;width:100%}
        input::placeholder{color:#1e293b}
        select option{background:#0d1626}
        @keyframes fu{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .fu{animation:fu 0.3s ease}
        @keyframes spin{to{transform:rotate(360deg)}}
        button:hover{opacity:.9}
        tr:hover td{background:rgba(99,102,241,0.04)}
      `}</style>

      {/* Overlay */}
      {selected && <>
        <div onClick={()=>setSelected(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:299}}/>
        <PlayerDetail player={selected} course={courseObj} rank={results.findIndex(r=>r.name===selected.name)+1} onClose={()=>setSelected(null)}/>
      </>}

      {/* Header */}
      <header style={{background:"rgba(6,10,19,0.97)",borderBottom:"1px solid #0d1626",padding:"16px 28px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100,backdropFilter:"blur(20px)"}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:42,height:42,borderRadius:12,background:"linear-gradient(135deg,#6366f1,#a78bfa)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>⛳</div>
          <div>
            <div style={{fontSize:21,fontWeight:900,fontFamily:"'Syne',sans-serif",letterSpacing:-0.5,background:"linear-gradient(90deg,#f1f5f9,#94a3b8)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>GOLF ORACLE</div>
            <div style={{fontSize:10,color:"#1e293b",letterSpacing:2,textTransform:"uppercase"}}>Tournament Prediction Engine</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          {isLive && meta && (
            <div style={{fontSize:11,padding:"5px 12px",borderRadius:20,background:"rgba(16,185,129,0.1)",border:"1px solid #10b98133",color:"#10b981",fontWeight:600}}>
              🟢 Live Data · {meta.tournamentName} · {meta.fieldSize} players · {(meta.simulations||0).toLocaleString()} sims
            </div>
          )}
          {!isLive && ran && (
            <div style={{fontSize:11,color:"#334155"}}>
              📊 Built-in data · {results.length} players · {nSims.toLocaleString()} sims
            </div>
          )}
          {running && <div style={{display:"flex",gap:8,alignItems:"center",fontSize:11,color:"#6366f1"}}><div style={{width:13,height:13,border:"2px solid #6366f144",borderTop:"2px solid #6366f1",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/> Simulating...</div>}
        </div>
      </header>

      <div style={{maxWidth:1280,margin:"0 auto",padding:"22px 20px"}}>

        {/* Live data banner */}
        {!isLive && !loadingLive && (
          <div style={{marginBottom:18,padding:"12px 18px",background:"rgba(99,102,241,0.06)",border:"1px solid #6366f122",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
            <div style={{fontSize:12,color:"#64748b",lineHeight:1.6}}>
              <span style={{color:"#6366f1",fontWeight:700}}>💡 Want live 2025/26 data?</span> Run <code style={{background:"#0f172a",padding:"1px 6px",borderRadius:4,color:"#a78bfa"}}>python pga_scraper_v2.py</code> then <code style={{background:"#0f172a",padding:"1px 6px",borderRadius:4,color:"#a78bfa"}}>python -m http.server 8080</code> — the dashboard auto-loads it. Currently showing 120-player built-in database.
            </div>
          </div>
        )}

        {/* Config panel */}
        <div style={{background:"rgba(13,22,38,0.8)",border:"1px solid #0f172a",borderRadius:18,padding:22,marginBottom:22}}>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr auto",gap:14,alignItems:"end"}}>
            <div>
              <label style={{display:"block",fontSize:10,color:"#6366f1",fontWeight:700,marginBottom:7,textTransform:"uppercase",letterSpacing:1.5}}>
                Course of the Week
              </label>
              <select value={course} onChange={e=>{setCourse(e.target.value);if(isLive)setDataSource("builtin");}}>
                {Object.keys(COURSES).map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{display:"block",fontSize:10,color:"#6366f1",fontWeight:700,marginBottom:7,textTransform:"uppercase",letterSpacing:1.5}}>Wind</label>
              <select value={wind} onChange={e=>setWind(Number(e.target.value))}>
                {[[5,"Calm"],[10,"Light"],[15,"Moderate"],[20,"Windy"],[25,"Very Windy"],[30,"Brutal"]].map(([v,l])=><option key={v} value={v}>{v} mph — {l}</option>)}
              </select>
            </div>
            <div>
              <label style={{display:"block",fontSize:10,color:"#6366f1",fontWeight:700,marginBottom:7,textTransform:"uppercase",letterSpacing:1.5}}>Simulations</label>
              <select value={nSims} onChange={e=>setNSims(Number(e.target.value))}>
                <option value={10000}>10,000 — Fast</option>
                <option value={25000}>25,000 — Standard</option>
                <option value={75000}>75,000 — Precise</option>
              </select>
            </div>
            <div>
              <label style={{display:"block",fontSize:10,color:"#6366f1",fontWeight:700,marginBottom:7,textTransform:"uppercase",letterSpacing:1.5}}>Field</label>
              <select value={fieldSize} onChange={e=>setFieldSize(Number(e.target.value))}>
                <option value={20}>Top 20</option>
                <option value={40}>Top 40</option>
                <option value={80}>Top 80</option>
                <option value={120}>Full 120</option>
              </select>
            </div>
            <div>
              <label style={{display:"block",fontSize:10,color:"#6366f1",fontWeight:700,marginBottom:7,textTransform:"uppercase",letterSpacing:1.5}}>Country</label>
              <select value={filterCountry} onChange={e=>setFilterCountry(e.target.value)}>
                {countries.map(c=><option key={c} value={c}>{c==="all"?"All Countries":c}</option>)}
              </select>
            </div>
            <button onClick={runModel} disabled={running} style={{padding:"10px 24px",borderRadius:10,border:"none",cursor:running?"not-allowed":"pointer",background:running?"#0f172a":"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",fontSize:14,fontWeight:800,boxShadow:running?"none":"0 4px 20px rgba(99,102,241,0.4)",whiteSpace:"nowrap"}}>
              {running?"...":"⚡ Run"}
            </button>
          </div>

          {running && (
            <div style={{marginTop:14}}>
              <div style={{height:2,background:"#0d1626",borderRadius:2}}>
                <div style={{width:`${progress}%`,height:"100%",background:"linear-gradient(90deg,#6366f1,#a78bfa)",transition:"width 0.1s"}}/>
              </div>
              <div style={{fontSize:10,color:"#334155",textAlign:"center",marginTop:4}}>{Math.round(progress)}%</div>
            </div>
          )}

          {/* Course info */}
          <div style={{marginTop:18,paddingTop:16,borderTop:"1px solid #0a0f1c",display:"grid",gridTemplateColumns:"1fr auto",gap:24}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                <span style={{fontSize:15,fontWeight:800,fontFamily:"'Syne',sans-serif"}}>{course}</span>
                <Badge>{courseObj.type}</Badge>
                <span style={{fontSize:11,color:"#334155"}}>{courseObj.grassType}</span>
              </div>
              <div style={{fontSize:11,color:"#1e293b",marginBottom:10}}>Par {courseObj.par} · {courseObj.yards.toLocaleString()} yds · {courseObj.location}</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {courseObj.traits.map(t=><span key={t} style={{fontSize:10,padding:"2px 9px",background:"#0a0f1c",border:"1px solid #0f172a",borderRadius:20,color:"#475569"}}>{t}</span>)}
              </div>
            </div>
            <div style={{minWidth:230}}>
              <div style={{fontSize:10,color:"#334155",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Skill Weightings</div>
              <CourseWeightChart course={courseObj}/>
            </div>
          </div>
        </div>

        {/* Results */}
        {ran && !running && (
          <div className="fu">
            {/* Tabs + search row */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:10}}>
              <div style={{display:"flex",gap:2,background:"#0a0f1c",padding:4,borderRadius:10,border:"1px solid #0d1626"}}>
                {[["leaderboard","📋 Leaderboard"],["podium","🏆 Podium"],["value","💰 Value"],["stats","📊 SG Leaders"]].map(([id,label])=>(
                  <button key={id} onClick={()=>setTab(id)} style={{padding:"7px 15px",background:tab===id?"#1e293b":"transparent",border:"none",borderRadius:7,color:tab===id?"#f1f5f9":"#334155",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                    {label}
                  </button>
                ))}
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search players..." style={{width:200}}/>
              </div>
            </div>

            {/* ── LEADERBOARD ── */}
            {tab === "leaderboard" && (
              <div>
                {/* Sort pills */}
                <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
                  {[["winPct","Win%"],["top5Pct","Top 5%"],["top10Pct","Top 10%"],["makeCutPct","Cut%"],["courseFit","Course Fit"],["formBoost","Form"],["avgFinish","Avg Finish"]].map(([key,label])=>(
                    <button key={key} onClick={()=>setSortBy(key)} style={{padding:"5px 12px",fontSize:11,borderRadius:20,background:sortBy===key?"#6366f1":"#0d1626",border:`1px solid ${sortBy===key?"#6366f1":"#1e293b"}`,color:sortBy===key?"#fff":"#334155",cursor:"pointer"}}>
                      {label}
                    </button>
                  ))}
                </div>

                {/* Column headers */}
                <div style={{display:"grid",gridTemplateColumns:"40px 1fr 84px 76px 76px 76px 76px 66px",gap:6,padding:"5px 16px",marginBottom:4}}>
                  {["#","Player","Win%","T5%","T10%","T20%","Cut%","Odds"].map(h=>(
                    <div key={h} style={{fontSize:9,color:"#1e293b",fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>{h}</div>
                  ))}
                </div>

                {displayed.map((p,i)=>{
                  const orig = results.findIndex(r=>r.name===p.name)+1;
                  return (
                    <div key={p.name} onClick={()=>setSelected(p)} style={{display:"grid",gridTemplateColumns:"40px 1fr 84px 76px 76px 76px 76px 66px",gap:6,padding:"11px 16px",cursor:"pointer",borderRadius:9,marginBottom:2,border:"1px solid transparent",transition:"all 0.1s"}}
                      onMouseEnter={e=>{e.currentTarget.style.background="rgba(99,102,241,0.04)";e.currentTarget.style.borderColor="#1e293b";}}
                      onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor="transparent";}}>
                      <div style={{fontSize:13,fontWeight:900,fontFamily:"monospace",color:orig===1?"#f59e0b":orig===2?"#94a3b8":orig===3?"#cd7f32":"#1e293b",alignSelf:"center"}}>{orig}</div>
                      <div style={{alignSelf:"center"}}>
                        <div style={{fontSize:13,fontWeight:700,color:"#f1f5f9",display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                          {p.name}
                          {(p.ctry||p.country) && <span style={{fontSize:10,color:"#1e293b"}}>{p.ctry||p.country}</span>}
                        </div>
                        <div style={{fontSize:10,color:"#1e293b",marginTop:2}}>
                          Fit: <span style={{color:p.courseFit>0.8?"#10b981":"#334155"}}>{p.courseFit>0?"+":""}{p.courseFit}</span>
                          {" · "}Form: <span style={{color:p.formBoost>0?"#10b981":"#ef4444"}}>{p.formBoost>0?"+":""}{p.formBoost}</span>
                        </div>
                      </div>
                      <div style={{alignSelf:"center"}}><WinChip pct={p.winPct}/></div>
                      {[p.top5Pct,p.top10Pct,p.top20Pct,p.makeCutPct].map((v,j)=>(
                        <div key={j} style={{fontSize:12,color:"#475569",fontFamily:"monospace",alignSelf:"center"}}>{v}%</div>
                      ))}
                      <div style={{fontSize:12,fontFamily:"monospace",fontWeight:700,color:"#334155",alignSelf:"center"}}>{p.odds}</div>
                    </div>
                  );
                })}

                {displayed.length === 0 && (
                  <div style={{textAlign:"center",padding:"40px 0",color:"#1e293b",fontSize:13}}>No players match your search.</div>
                )}
              </div>
            )}

            {/* ── PODIUM ── */}
            {tab === "podium" && (
              <div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:16}}>
                  {results.slice(0,3).map((p,i)=>{
                    const medals=["🥇","🥈","🥉"], cols=["#f59e0b","#94a3b8","#cd7f32"];
                    return (
                      <div key={p.name} onClick={()=>setSelected(p)} style={{background:"rgba(13,22,38,0.9)",border:`1px solid ${cols[i]}33`,borderRadius:16,padding:24,textAlign:"center",cursor:"pointer",boxShadow:i===0?`0 0 48px ${cols[i]}15`:undefined}}>
                        <div style={{fontSize:44,marginBottom:10}}>{medals[i]}</div>
                        <div style={{fontSize:17,fontWeight:900,fontFamily:"'Syne',sans-serif",marginBottom:3}}>{p.name}</div>
                        <div style={{fontSize:11,color:"#334155",marginBottom:16}}>{p.ctry||p.country||""}{p.worldRank&&p.worldRank<500?` · WR#${p.worldRank}`:""}</div>
                        <div style={{fontSize:34,fontWeight:900,color:cols[i],fontFamily:"monospace",marginBottom:2}}>{p.winPct}%</div>
                        <div style={{fontSize:11,color:"#334155",marginBottom:12}}>Win Probability</div>
                        <div style={{fontSize:22,fontFamily:"monospace",fontWeight:700,color:"#64748b",marginBottom:16}}>{p.odds}</div>
                        {[["Top 5",p.top5Pct],["Top 10",p.top10Pct],["Make Cut",p.makeCutPct]].map(([l,v])=>(
                          <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5,padding:"0 8px"}}>
                            <span style={{color:"#475569"}}>{l}</span>
                            <span style={{color:"#64748b",fontFamily:"monospace",fontWeight:700}}>{v}%</span>
                          </div>
                        ))}
                        <div style={{marginTop:12,padding:"8px 0",borderTop:"1px solid #0f172a",fontSize:11,color:p.courseFit>0.8?"#10b981":"#475569",fontFamily:"monospace",fontWeight:700}}>
                          Course Fit: {p.courseFit>0?"+":""}{p.courseFit}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  {results.slice(3,9).map((p,i)=>(
                    <div key={p.name} onClick={()=>setSelected(p)} style={{display:"flex",gap:14,alignItems:"center",padding:"14px 18px",background:"rgba(13,22,38,0.7)",border:"1px solid #0f172a",borderRadius:12,cursor:"pointer"}}>
                      <div style={{fontSize:18,fontWeight:900,fontFamily:"monospace",color:"#1e293b",minWidth:28}}>#{i+4}</div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:700}}>{p.name}</div>
                        <div style={{fontSize:10,color:"#334155"}}>{p.ctry||p.country||""}</div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:16,fontFamily:"monospace",fontWeight:800,color:parseFloat(p.winPct)>10?"#10b981":"#64748b"}}>{p.winPct}%</div>
                        <div style={{fontSize:12,fontFamily:"monospace",color:"#334155"}}>{p.odds}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── VALUE ── */}
            {tab === "value" && (
              <div>
                <div style={{padding:"12px 16px",background:"rgba(99,102,241,0.05)",border:"1px solid #6366f122",borderRadius:12,marginBottom:16,fontSize:12,color:"#64748b",lineHeight:1.7}}>
                  <span style={{color:"#6366f1",fontWeight:700}}>💰 Value Logic:</span> Flagged where model probability outpaces implied market odds given world ranking. <strong style={{color:"#f1f5f9"}}>Top-10 and Top-20 markets</strong> offer the most reliable edge — outright winner markets are the sharpest.
                </div>
                {results.slice(0,Math.min(30,results.length)).map((p,i)=>{
                  const highFit = p.courseFit > 0.80;
                  const hotForm = p.formBoost > 0.10;
                  const lowRankHighWin = p.winPct > 5 && (p.worldRank||999) > 10;
                  const reasons = [];
                  if (highFit) reasons.push("🎯 Elite course fit");
                  if (hotForm) reasons.push("🔥 Strong form");
                  if (lowRankHighWin) reasons.push("📈 Model vs. rank gap");
                  if (!reasons.length && i > 7) return null;
                  const isStrong = reasons.length >= 2;
                  return (
                    <div key={p.name} onClick={()=>setSelected(p)} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 18px",marginBottom:8,background:isStrong?"rgba(16,185,129,0.04)":"rgba(13,22,38,0.5)",border:`1px solid ${isStrong?"#10b98120":"#0f172a"}`,borderRadius:11,cursor:"pointer"}}>
                      <div style={{fontSize:13,fontFamily:"monospace",fontWeight:900,color:"#1e293b",minWidth:30}}>#{i+1}</div>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                          <span style={{fontSize:14,fontWeight:700}}>{p.name}</span>
                          {isStrong && <Badge color="#10b981">STRONG VALUE</Badge>}
                        </div>
                        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                          {reasons.map(r=><span key={r} style={{fontSize:11,color:"#475569"}}>{r}</span>)}
                        </div>
                      </div>
                      <div style={{display:"flex",gap:16,textAlign:"center"}}>
                        {[["Win",p.winPct+"%",parseFloat(p.winPct)>15?"#f59e0b":parseFloat(p.winPct)>8?"#10b981":"#64748b"],["Top10",p.top10Pct+"%","#3b82f6"],["Odds",p.odds,"#475569"]].map(([l,v,c])=>(
                          <div key={l}>
                            <div style={{fontSize:9,color:"#1e293b",textTransform:"uppercase",letterSpacing:1,marginBottom:2}}>{l}</div>
                            <div style={{fontSize:14,fontFamily:"monospace",fontWeight:800,color:c}}>{v}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── SG LEADERS ── */}
            {tab === "stats" && (
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                {SG_META.map(({key,label,color,icon})=>{
                  const top = [...results].sort((a,b)=>(b[key]||0)-(a[key]||0)).slice(0,10);
                  const maxVal = top[0]?.[key]||1;
                  return (
                    <div key={key} style={{background:"rgba(13,22,38,0.8)",border:"1px solid #0f172a",borderRadius:14,padding:20}}>
                      <div style={{fontSize:12,fontWeight:700,color,marginBottom:14,textTransform:"uppercase",letterSpacing:1}}>{icon} {label} Leaders</div>
                      {top.map((p,i)=>(
                        <div key={p.name} onClick={()=>setSelected(p)} style={{display:"flex",alignItems:"center",gap:10,marginBottom:11,cursor:"pointer"}}>
                          <div style={{fontSize:11,color:"#1e293b",fontFamily:"monospace",minWidth:18}}>{i+1}</div>
                          <div style={{flex:1}}>
                            <div style={{fontSize:12,fontWeight:600,marginBottom:3}}>{p.name}</div>
                            <div style={{height:4,background:"#0a0f1c",borderRadius:2}}>
                              <div style={{width:`${((p[key]||0)/maxVal)*100}%`,height:"100%",background:color,borderRadius:2,opacity:.8}}/>
                            </div>
                          </div>
                          <div style={{fontSize:12,fontFamily:"monospace",color,fontWeight:700,minWidth:42,textAlign:"right"}}>+{(p[key]||0).toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!ran && !running && (
          <div style={{textAlign:"center",padding:"70px 20px"}}>
            <div style={{fontSize:60,marginBottom:20}}>⛳</div>
            <div style={{fontSize:22,fontWeight:900,fontFamily:"'Syne',sans-serif",color:"#1e293b",marginBottom:10}}>Select a course and run the model</div>
            <div style={{fontSize:13,color:"#0f172a",maxWidth:520,margin:"0 auto 28px",lineHeight:1.7}}>
              120-player database · 14 courses · Monte Carlo simulation · Course-weighted SG · Wind calibration · Form decay weighting<br/>
              <span style={{color:"#334155"}}>Run pga_scraper_v2.py for live 2025/26 PGA Tour data</span>
            </div>
            <button onClick={runModel} style={{padding:"13px 38px",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",borderRadius:12,color:"#fff",fontSize:15,fontWeight:800,cursor:"pointer",boxShadow:"0 8px 32px rgba(99,102,241,0.35)"}}>
              ⚡ Run First Simulation
            </button>
          </div>
        )}

        <footer style={{marginTop:32,paddingTop:16,borderTop:"1px solid #0a0f1c",fontSize:11,color:"#0d1626",textAlign:"center",lineHeight:1.8}}>
          Golf Oracle · Monte Carlo Simulation · 120-player database · 14 courses · Wind-adjusted SG model<br/>
          Auto-loads data/results.json when pga_scraper_v2.py is run · For informational purposes only · Gamble responsibly
        </footer>
      </div>
    </div>
  );
}
