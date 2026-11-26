# PacketFlow

**Watch the internet talk.** An animated, step-by-step learning site for networking and wireless — no build step, no dependencies, just static HTML/CSS/JS.

**Live:** https://afsalperingodan.github.io/packetflow/

## What's inside

| Page | What it is |
|---|---|
| `index.html` — **Protocol explorer** | 62 protocols with animated packet flow, sequence diagrams, a live packet table and a header inspector. Split view puts the animation beside the packet list. |
| `layers.html` — **Layers & Headers** | The 7 OSI layers, an encapsulation animation (HTTP, HTTPS, DNS, Wi-Fi, ping), a bit-level header explorer (Ethernet, 802.1Q, 802.11, ARP, IPv4, IPv6, ICMP, TCP, UDP, DNS, CAPWAP) and a quiz with leaderboard. |
| `wireless.html` — **Wireless Lab** | Channels and signal simulator, Wi-Fi generations, client join flow, AP join to a Catalyst 9800 WLC, roaming (OKC, 802.11r, inter-controller), WPA2/WPA3 security, 802.11 frame headers, air-to-wire encapsulation, CSMA/CA, best practices, CLI cheat sheet and a quiz with leaderboard. |

Protocol groups: local network & switching · wireless · transport · web · security & access · apps & voice · routing & tools.

## Files

```
index.html  layers.html  wireless.html   pages
style.css  layers.css  wireless.css      styles
app.js                                   protocol explorer engine
data.js data2.js data3.js                protocol definitions (62)
layers.js                                OSI, encapsulation, header explorer, quiz
wireless.js wireless2.js                 Wireless Lab
board.js                                 quiz leaderboard
site.js                                  site settings (LinkedIn link, leaderboard URL)
```

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy on GitHub Pages

1. Push these files to `main`.
2. Settings → Pages → *Deploy from a branch* → `main` / `(root)`.
3. Your site is at `https://<user>.github.io/<repo>/`.

When you change CSS/JS, bump the `?v=` query on the `<link>`/`<script>` tags in the HTML files so browsers don't serve cached copies.

## Settings (`site.js`)

```js
window.PF_LINKEDIN  = 'https://www.linkedin.com/in/your-name/';   // header icon
window.PF_BOARD_URL = '';                                          // worldwide leaderboard (below)
```

## Global leaderboard (optional, free)

GitHub Pages is static, so a worldwide ranking needs a small database. Without one, scores are saved **on the visitor's device only** and the board says so. To make it global with a free Firebase Realtime Database:

1. Go to https://console.firebase.google.com → **Add project** (Analytics not needed).
2. **Build → Realtime Database → Create database** (test mode is fine to start).
3. Open the **Rules** tab and paste:

```json
{
  "rules": {
    "scores": {
      "$quiz": {
        ".read": true,
        "$id": {
          ".write": "!data.exists()",
          ".validate": "newData.hasChildren(['name','score','total','ms','t']) && newData.child('name').isString() && newData.child('name').val().length <= 20 && newData.child('score').isNumber() && newData.child('total').isNumber() && newData.child('score').val() >= 0 && newData.child('score').val() <= newData.child('total').val() && newData.child('total').val() <= 20"
        }
      }
    }
  }
}
```

4. Copy the database URL shown at the top (like `https://your-project-default-rtdb.firebaseio.com`) into `window.PF_BOARD_URL` in `site.js`, commit, done.

Visitors can then add a name after each quiz and everyone sees one ranking (score, then speed). Because the quiz runs in the browser, scores can't be made tamper-proof — treat the board as for fun, not for certification.

## Notes

- Addresses in examples come from documentation ranges (RFC 5737 / 1918). Flows are simplified for learning.
- Wireless / Catalyst 9800 notes are general guidance; confirm syntax and design against your IOS-XE release and Cisco's current guides.
