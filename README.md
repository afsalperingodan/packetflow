# PacketFlow

Free, animated, step-by-step visualizer for 44 network protocols — ARP, DHCP, TCP, UDP, QUIC, DNS, HTTP, TLS, WebSocket, CAPWAP, 802.11, WPA2, 802.1X, RADIUS, VLAN, STP, OSPF, BGP, VRRP, NAT, IPsec, WireGuard, Kerberos, OAuth, SIP, SMB and more. No build step, no dependencies.

Open `index.html` or run `python3 -m http.server` and visit http://localhost:8000.

## Host on GitHub Pages
1. Create a repo, push these files to `main`.
2. Settings → Pages → Source: *Deploy from a branch* → `main` / `(root)`.
3. Site goes live at `https://<user>.github.io/<repo>/`.

Optional: add `<meta name="github-repo" content="user/repo">` to `index.html` to show the GitHub icon.

Pages: index.html (protocols), layers.html (OSI + headers), wireless.html (Wireless Lab: wireless.js, wireless2.js, wireless.css).
