# PacketFlow

**Watch the internet talk.**

PacketFlow is a free, interactive networking learning platform that turns network concepts into visual, step-by-step experiences. Follow packets as they move through protocols, explore how data is encapsulated across the OSI model, and see how wireless clients connect, authenticate, and roam.

**Try it live:** https://afsalperingodan.github.io/packetflow/

---

## Explore PacketFlow

| Learning area | What you can explore |
|---|---|
| **[Protocol Explorer](https://afsalperingodan.github.io/packetflow/)** | Explore 62 networking protocols across switching, wireless, transport, web, security, applications, routing, and tools. Watch animated packet flows, follow sequence diagrams, inspect packet details, and explore protocol headers. |
| **[Layers & Headers](https://afsalperingodan.github.io/packetflow/layers.html)** | Learn the seven OSI layers, follow encapsulation and decapsulation, and inspect the fields inside Ethernet, 802.1Q, 802.11, ARP, IPv4, IPv6, ICMP, TCP, UDP, DNS, and CAPWAP headers. Includes an interactive quiz. |
| **[Wireless Lab](https://afsalperingodan.github.io/packetflow/wireless.html)** | Explore Wi-Fi channels and generations, client association, AP join to a Catalyst 9800 WLC, roaming, WPA2/WPA3, 802.11 frame headers, air-to-wired encapsulation, and CSMA/CA. Includes practical guidance, a CLI cheat sheet, and an interactive quiz. |

### A suggested learning path

1. **Start with protocols:** Pick a familiar protocol and follow the packet through its flow.
2. **Understand the layers:** Use the OSI page to connect each protocol to its layer and see how headers are added and removed.
3. **Explore wireless:** Follow a client joining a WLAN, understand authentication, and see what happens during roaming.
4. **Test your knowledge:** Take the quizzes and compare your results on the leaderboard.

## Who is it for?

- Students preparing for networking fundamentals and certifications such as CCNA.
- Network engineers who want a visual refresher on protocols, packet headers, and troubleshooting concepts.
- Wireless engineers learning Wi-Fi operation, roaming, security, and controller-based architectures.
- Trainers and educators looking for interactive material to support networking lessons.
- Anyone curious about what happens behind the scenes when devices communicate.

## Built with

- **HTML** for the learning pages and structure.
- **CSS** for responsive layouts, animations, and visual presentation.
- **Vanilla JavaScript** for packet simulations, interactive explorers, quizzes, and scoreboards.
- **Firebase Realtime Database** for the shared quiz leaderboard.
- **GitHub Pages** for static website hosting.

There is no frontend build step and no package installation required to run the site locally.

## Run locally

Clone or download the repository, then start a local web server from the project directory:

```bash
python3 -m http.server 8000
```

Open http://localhost:8000 in your browser.

## Project structure

```
index.html              Protocol Explorer
layers.html             Layers & Headers
wireless.html           Wireless Lab

style.css               Shared / protocol explorer styles
layers.css              Layers page styles
wireless.css            Wireless page styles

app.js                  Protocol explorer engine
data.js
data2.js
data3.js                Protocol definitions
layers.js               OSI, encapsulation, headers, and quiz
wireless.js
wireless2.js            Wireless simulations and learning interactions
board.js                Quiz leaderboard integration
site.js                 Site settings
```

## Quiz leaderboard

The Layers & Headers and Wireless Lab quizzes include a shared leaderboard. Scores are ranked by **score first**, then **completion time**.

The site uses Firebase Realtime Database for shared scores. If the database is unavailable, the quiz can fall back to saving scores locally in the visitor's browser. The leaderboard is intended for learning and friendly competition.

**Please note:** Quiz results are submitted from the visitor's browser, so they are not tamper-proof. Do not use leaderboard positions as formal certification or assessment results. Names submitted to the leaderboard are visible to other visitors.

### Leaderboard configuration

The Firebase database endpoint is configured in `site.js`:

```js
window.PF_BOARD_URL = 'https://packetflow-board-default-rtdb.firebaseio.com';
```

The database rules should restrict writes to new score entries and validate the submitted fields. Review the Firebase Realtime Database Rules in the Firebase console before changing them. Never put private service-account credentials or secrets in this public repository.

## Deploy

This project is hosted using GitHub Pages.

1. Push the site files to the repository's `main` branch.
2. In GitHub, open **Settings → Pages**.
3. Select **Deploy from a branch**, choose `main` and the repository root.
4. Wait for the deployment, then open the live site URL.

When changing CSS or JavaScript, update the corresponding `?v=` cache-busting value in the HTML references if needed, so visitors' browsers load the latest file.

## Contributing

Suggestions, corrections, and improvements are welcome.

- Report an issue if you find an incorrect explanation, broken interaction, or rendering problem.
- When suggesting a networking correction, include the protocol or feature, the relevant detail, and a reliable reference where possible.
- Keep examples understandable and clearly distinguish simplified learning simulations from actual device behavior.
- Test changes across the three learning pages before submitting them.

## Accuracy and learning disclaimer

PacketFlow is an educational resource. Packet flows and protocol behavior are simplified to make concepts easier to understand; they are not packet captures or a substitute for vendor documentation, standards, or hands-on lab validation.

Some example IP addresses use documentation or private address ranges. Wireless and Catalyst 9800 guidance is general learning material: verify commands, behavior, and design recommendations against the relevant software release and current vendor documentation before using them in production.

---

**Keep exploring. Follow the packet. Understand the network.**
