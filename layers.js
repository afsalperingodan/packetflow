/* PacketFlow — Layers & Headers page */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

  /* ═════════ 1 · OSI stack ═════════ */
  const LAYERS = [
    { n: 7, name: 'Application', pdu: 'Data', c: '#5ac8fa', job: 'The doorway for programs. Browsers, mail apps and chat clients ask the network for something here.', protos: 'HTTP, DNS, SMTP, SSH, DHCP, FTP', dev: '— (software)', analogy: 'Writing the letter.' },
    { n: 6, name: 'Presentation', pdu: 'Data', c: '#bf5af2', job: 'Translates, compresses and encrypts so both sides understand the data in the same format.', protos: 'TLS/SSL, JPEG, ASCII/UTF‑8, gzip', dev: '— (software)', analogy: 'Translating into a common language and sealing the envelope.' },
    { n: 5, name: 'Session', pdu: 'Data', c: '#ff6482', job: 'Opens, maintains and closes conversations between two programs, and can resume them.', protos: 'NetBIOS, RPC, SIP sessions, TLS sessions', dev: '— (software)', analogy: 'Keeping the phone line open for the whole call.' },
    { n: 4, name: 'Transport', pdu: 'Segment / Datagram', c: '#ff9f0a', job: 'Delivers data between programs using port numbers. TCP is reliable and ordered; UDP is fast and simple.', protos: 'TCP, UDP, QUIC, SCTP', dev: 'Firewalls, load balancers', analogy: 'Numbering the pages and checking all of them arrive.' },
    { n: 3, name: 'Network', pdu: 'Packet', c: '#30d158', job: 'Gives every device an IP address and chooses the path across many networks (routing).', protos: 'IPv4, IPv6, ICMP, OSPF, BGP', dev: 'Router, Layer‑3 switch', analogy: 'Writing the destination address and picking the roads.' },
    { n: 2, name: 'Data link', pdu: 'Frame', c: '#64d2ff', job: 'Delivers frames to the next device on the same local link using MAC addresses, and detects errors.', protos: 'Ethernet, 802.11 Wi‑Fi, ARP, VLAN, STP, PPP', dev: 'Switch, access point, NIC', analogy: 'Handing the parcel to the next‑door neighbour.' },
    { n: 1, name: 'Physical', pdu: 'Bits', c: '#ffd60a', job: 'Turns bits into electrical, light or radio signals and sends them over the medium.', protos: 'Ethernet cable, fibre, Wi‑Fi radio, DSL', dev: 'Hub, repeater, cables, antennas', analogy: 'The road itself.' },
  ];
  const TCPIP = [{ name: 'Application', rows: [0, 3] }, { name: 'Transport', rows: [3, 4] }, { name: 'Internet', rows: [4, 5] }, { name: 'Link', rows: [5, 7] }];

  function buildStack() {
    const g = $('#stackGrid'); g.innerHTML = '';
    LAYERS.forEach((L, i) => {
      const b = document.createElement('button');
      b.className = 'lrow'; b.style.cssText = `--c:${L.c};grid-row:${i + 1};grid-column:1;animation-delay:${i * 70}ms`;
      b.innerHTML = `<span class="ln">${L.n}</span><span class="lt"><b>${L.name}</b><small>${L.pdu}</small></span>`;
      b.onclick = () => selectLayer(i); b.dataset.i = i; g.appendChild(b);
    });
    TCPIP.forEach(t => {
      const d = document.createElement('div'); d.className = 'tbox'; d.style.gridRow = `${t.rows[0] + 1} / ${t.rows[1] + 1}`; d.innerHTML = `<span>${t.name}</span>`; g.appendChild(d);
    });
    const h1 = document.createElement('div'); h1.className = 'gh'; h1.style.cssText = 'grid-row:0;'; g.insertAdjacentHTML('afterbegin', '');
    selectLayer(3);
  }
  function selectLayer(i) {
    const L = LAYERS[i];
    $$('.lrow').forEach(r => r.classList.toggle('on', +r.dataset.i === i));
    $('#ldetail').style.setProperty('--c', L.c);
    $('#ldetail').innerHTML = `<div class="ld-num">${L.n}</div><h3>${L.name} layer</h3>
      <p class="ld-job">${L.job}</p>
      <dl><dt>Data unit</dt><dd>${L.pdu}</dd><dt>Examples</dt><dd>${L.protos}</dd><dt>Devices</dt><dd>${L.dev}</dd><dt>Think of it as</dt><dd>${L.analogy}</dd></dl>`;
  }

  /* ═════════ 2 · encapsulation ═════════ */
  const W = {
    tls: { layer: 6, name: 'TLS', head: 5, tail: 16, c: '#bf5af2', why: 'TLS encrypts the data and adds a 5‑byte record header and a 16‑byte authentication tag, so nobody on the path can read or alter it.' },
    tcp: { layer: 4, name: 'TCP', head: 20, tail: 0, c: '#ff9f0a', why: 'TCP adds a 20‑byte header: source/destination ports, sequence and acknowledgment numbers, flags and window size. This is what makes delivery reliable.' },
    udp: { layer: 4, name: 'UDP', head: 8, tail: 0, c: '#ff9f0a', why: 'UDP adds just 8 bytes: source port, destination port, length and checksum. No handshake, no retransmission.' },
    ip: { layer: 3, name: 'IPv4', head: 20, tail: 0, c: '#30d158', why: 'IP adds a 20‑byte header with the source and destination IP addresses, TTL and protocol number so routers can forward the packet across networks.' },
    icmp: { layer: 3, name: 'ICMP', head: 8, tail: 0, c: '#30d158', why: 'ICMP is carried directly inside IP. Its 8‑byte header holds the type (8 = echo request), code, checksum, identifier and sequence number.' },
    eth: { layer: 2, name: 'Ethernet', head: 14, tail: 4, c: '#64d2ff', why: 'Ethernet adds a 14‑byte header (destination MAC, source MAC, EtherType) and a 4‑byte FCS trailer to detect corruption. MAC addresses only matter on this one link.' },
    wifi: { layer: 2, name: '802.11', head: 32, tail: 4, c: '#64d2ff', why: 'Wi‑Fi adds a 24‑byte MAC header (frame control, three addresses, sequence) plus an 8‑byte LLC/SNAP header and a 4‑byte FCS. The AP rewrites this for the wired side.' },
  };
  const SCEN = [
    { id: 'http', name: 'Web page (HTTP)', dataLayer: 7, data: { name: 'HTTP request', bytes: 484, c: '#5ac8fa', why: 'The browser builds an HTTP request: “GET / HTTP/1.1” plus headers — 484 bytes of application data.' }, wraps: ['tcp', 'ip', 'eth'] },
    { id: 'https', name: 'Secure web (HTTPS)', dataLayer: 7, data: { name: 'HTTP request', bytes: 484, c: '#5ac8fa', why: 'The same HTTP request — but this time it will be encrypted before it leaves.' }, wraps: ['tls', 'tcp', 'ip', 'eth'] },
    { id: 'dns', name: 'DNS lookup', dataLayer: 7, data: { name: 'DNS query', bytes: 33, c: '#5ac8fa', why: 'The resolver library builds a 33‑byte DNS question: “What is the A record of www.example.com?”' }, wraps: ['udp', 'ip', 'eth'] },
    { id: 'wifi', name: 'Web page over Wi‑Fi', dataLayer: 7, data: { name: 'HTTP request', bytes: 484, c: '#5ac8fa', why: 'The browser builds an HTTP request — exactly as on a wired network.' }, wraps: ['tcp', 'ip', 'wifi'] },
    { id: 'ping', name: 'Ping (ICMP)', dataLayer: 3, data: { name: 'ping data', bytes: 32, c: '#30d158', why: 'ping needs no application: the OS builds an ICMP echo with 32 bytes of padding data directly at layer 3.' }, wraps: ['icmp', 'ip', 'eth'] },
  ];
  const LAYER_NAMES = { 7: 'Application', 6: 'Presentation', 5: 'Session', 4: 'Transport', 3: 'Network', 2: 'Data link', 1: 'Physical' };
  const LAYER_COL = { 7: '#5ac8fa', 6: '#bf5af2', 5: '#ff6482', 4: '#ff9f0a', 3: '#30d158', 2: '#64d2ff', 1: '#ffd60a' };

  const E = { sc: 0, step: -1, playing: false, tok: 0 };
  const segW = b => Math.round(Math.max(40, 22 + Math.sqrt(b) * 5.2));

  function segsForRow(sc, r) {                       // r = OSI layer number of the row
    const ws = sc.wraps.map(id => W[id]).filter(w => w.layer >= r).sort((a, b) => a.layer - b.layer); // outermost first
    const segs = [];
    ws.forEach(w => segs.push({ t: 'h', name: w.name, b: w.head, c: w.c, layer: w.layer }));
    segs.push({ t: 'd', name: sc.data.name, b: sc.data.bytes, c: sc.data.c, layer: sc.dataLayer });
    [...ws].reverse().forEach(w => { if (w.tail) segs.push({ t: 't', name: w.name === 'TLS' ? 'tag' : 'FCS', b: w.tail, c: w.c, layer: w.layer }); });
    return segs;
  }
  const rowUsed = (sc, r) => r <= sc.dataLayer || sc.wraps.some(id => W[id].layer >= r) || r === 1;

  function buildCols() {
    const sc = SCEN[E.sc];
    ['sendCol', 'recvCol'].forEach(id => {
      const col = $('#' + id); col.querySelectorAll('.erow').forEach(x => x.remove());
      [7, 6, 5, 4, 3, 2, 1].forEach(r => {
        const row = document.createElement('div'); row.className = 'erow'; row.dataset.r = r; row.style.setProperty('--c', LAYER_COL[r]);
        let inner = `<span class="elab"><b>${r}</b>${LAYER_NAMES[r]}</span><div class="ebar">`;
        if (r === 1) inner += `<div class="bits"><span>01001000 01100101 01101100 01101100 01101111 00100001 11010010 01011010 01110100 00101101</span></div>`;
        else if (r === 5 && !sc.wraps.some(id => W[id].layer === 5)) inner += segsForRow(sc, r).map(s => segHtml(s)).join('');
        else if (r > sc.dataLayer && !sc.wraps.some(id => W[id].layer >= r)) inner += `<span class="unused">not used here</span>`;
        else inner += segsForRow(sc, r).map(s => segHtml(s)).join('');
        inner += '</div>'; row.innerHTML = inner; col.appendChild(row);
      });
    });
    $('#elegend').innerHTML = [...sc.wraps.map(id => W[id]), { name: sc.data.name, c: sc.data.c }].reverse().map(w => `<span><i style="background:${w.c}"></i>${w.name}</span>`).join('');
  }
  const segHtml = s => `<span class="seg ${s.t}" data-layer="${s.layer}" style="--sc:${s.c};width:${segW(s.b)}px" title="${s.name}: ${s.b} bytes"><b>${s.name}</b><small>${s.b} B</small></span>`;

  function steps() {
    const sc = SCEN[E.sc], out = [];
    [7, 6, 5, 4, 3, 2, 1].forEach(r => {
      let title, text;
      const w = sc.wraps.map(id => W[id]).find(x => x.layer === r);
      if (r === sc.dataLayer) { title = `Layer ${r} · ${LAYER_NAMES[r]} creates the data`; text = sc.data.why; }
      else if (r > sc.dataLayer) { title = `Layer ${r} · ${LAYER_NAMES[r]}`; text = 'Not involved in this exchange — the data passes straight through.'; }
      else if (w) { title = `Layer ${r} · ${LAYER_NAMES[r]} adds a ${w.name} header${w.tail ? ' and trailer' : ''}`; text = w.why; }
      else if (r === 1) { title = 'Layer 1 · Physical turns it into signals'; text = 'The frame is converted into bits and sent as electrical pulses, light or radio waves.'; }
      else { title = `Layer ${r} · ${LAYER_NAMES[r]}`; text = r === 5 ? 'The session layer tracks this conversation. In practice TCP/IP implementations fold this into the application or TLS.' : 'No separate header is added at this layer in the TCP/IP stack.'; }
      out.push({ side: 'send', r, title, text });
    });
    out.push({ side: 'wire', title: 'Across the network', text: 'The bits travel over cable, fibre or radio. Switches and routers along the way read only the headers they need — a switch reads the MAC header, a router reads the IP header — but the inner data stays untouched.' });
    [1, 2, 3, 4, 5, 6, 7].forEach(r => {
      let title, text;
      const w = sc.wraps.map(id => W[id]).find(x => x.layer === r);
      if (r === 1) { title = 'Layer 1 · receives the signal'; text = 'The receiver converts the signal back into bits and hands them up.'; }
      else if (w) { title = `Layer ${r} · ${LAYER_NAMES[r]} reads and removes the ${w.name} header`; text = `The ${w.name} header is checked${w.tail ? ' (and the trailer verified)' : ''} and stripped, and the payload goes up one layer.`; }
      else if (r === sc.dataLayer) { title = `Layer ${r} · ${LAYER_NAMES[r]} receives the data`; text = `The ${sc.data.name} arrives exactly as it was sent — all the envelopes are gone.`; }
      else if (r > sc.dataLayer) { title = `Layer ${r} · ${LAYER_NAMES[r]}`; text = 'Nothing to do for this exchange.'; }
      else { title = `Layer ${r} · ${LAYER_NAMES[r]}`; text = 'Passes the payload upward.'; }
      out.push({ side: 'recv', r, title, text });
    });
    return out;
  }

  function showStep(i) {
    const st = steps(), s = st[i];
    E.step = i;
    const sendIdx = i <= 6 ? i : 6, recvIdx = i >= 8 ? i - 8 : -1;
    $$('#sendCol .erow').forEach((row, k) => { row.classList.toggle('on', k <= sendIdx && i >= 0); row.classList.toggle('cur', s && s.side === 'send' && k === i); });
    $$('#recvCol .erow').forEach((row, k) => { const rk = 6 - k; row.classList.toggle('on', recvIdx >= 0 && rk <= recvIdx); row.classList.toggle('cur', s && s.side === 'recv' && rk === recvIdx); });
    $('#ewire').classList.toggle('active', s && s.side === 'wire');
    // strip animation on receiver
    $$('#recvCol .seg').forEach(x => x.classList.remove('strip'));
    if (s && s.side === 'recv') { const w = SCEN[E.sc].wraps.map(id => W[id]).find(x => x.layer === s.r); if (w) $$(`#recvCol .erow[data-r="${s.r}"] .seg[data-layer="${w.layer}"]:not(.d)`).forEach(x => x.classList.add('strip')); }
    const cap = $('#ecap');
    cap.innerHTML = i < 0 ? `<div class="num" style="--cc:var(--accent)">00</div><div class="body"><h4>Ready to send</h4><p>Press Play to follow one message from the sender’s application down to the wire and back up to the receiver.</p></div>`
      : `<div class="num" style="--cc:${s.r ? LAYER_COL[s.r] : 'var(--text)'}">${String(i + 1).padStart(2, '0')}/${st.length}</div><div class="body"><h4>${s.title}</h4><p>${s.text}</p></div>`;
    $('#ePlay').textContent = E.playing ? 'Pause' : (i >= st.length - 1 ? 'Replay' : (i < 0 ? 'Play' : 'Resume'));
    $('#ePlay').classList.toggle('playing', E.playing);
    $('#ePrev').disabled = i <= 0; $('#eNext').disabled = i >= st.length - 1;
  }
  async function ePlay() {
    const n = steps().length;
    if (E.playing) { E.playing = false; E.tok++; showStep(E.step); return; }
    if (E.step >= n - 1) { E.step = -1; }
    E.playing = true; const tok = ++E.tok;
    while (E.playing && tok === E.tok && E.step < n - 1) { showStep(E.step + 1); await sleep(2600); }
    if (tok === E.tok) { E.playing = false; showStep(E.step); }
  }
  function ePause() { E.playing = false; E.tok++; }
  function loadScen(i) {
    ePause(); E.sc = i; E.step = -1;
    $$('#scen button').forEach((b, k) => b.classList.toggle('on', k === i));
    buildCols(); showStep(-1);
  }
  function initEncap() {
    $('#scen').innerHTML = SCEN.map((s, i) => `<button role="tab" class="${i === 0 ? 'on' : ''}">${s.name}</button>`).join('');
    $$('#scen button').forEach((b, i) => b.onclick = () => loadScen(i));
    $('#ePlay').onclick = ePlay;
    $('#eNext').onclick = () => { ePause(); showStep(Math.min(E.step + 1, steps().length - 1)); };
    $('#ePrev').onclick = () => { ePause(); showStep(Math.max(E.step - 1, 0)); };
    $('#eReset').onclick = () => { ePause(); showStep(-1); };
    loadScen(0);
  }

  /* ═════════ 3 · header explorer ═════════ */
  const f = (name, bits, desc, ex, ab) => ({ name, bits, desc, ex, ab: ab || name });
  const HEADERS = [
    { id: 'eth', name: 'Ethernet II', layer: 'Layer 2', size: '14 B + 4 B FCS', blurb: 'The frame header on wired networks. It only matters between two directly connected devices.', fields: [
      f('Destination MAC', 48, 'Hardware address of the next device on this link. ff:ff:ff:ff:ff:ff means “everyone” (broadcast).', 'bb:bb:bb:bb:bb:14', 'Destination MAC'),
      f('Source MAC', 48, 'Hardware address of the sender’s network card, burned in at the factory (first 3 bytes identify the vendor).', 'aa:aa:aa:aa:aa:0a', 'Source MAC'),
      f('EtherType', 16, 'Says what is inside: 0x0800 = IPv4, 0x86DD = IPv6, 0x0806 = ARP, 0x8100 = VLAN tag.', '0x0800 (IPv4)', 'EtherType'),
      f('Payload (46–1500 B)', 32, 'The packet from layer 3. Shown here as one row; it can be up to 1500 bytes (the MTU).', 'IP packet…', 'Payload …'),
      f('FCS (CRC‑32)', 32, 'Frame Check Sequence: a checksum so the receiver can detect a damaged frame and drop it.', '0x7a3c91ee', 'FCS (CRC‑32)'),
    ] },
    { id: 'vlan', name: '802.1Q VLAN tag', layer: 'Layer 2', size: '4 B', blurb: 'A 4‑byte tag inserted after the source MAC on trunk links so switches know which VLAN a frame belongs to.', fields: [
      f('TPID', 16, 'Tag Protocol Identifier: always 0x8100, which is how a switch recognises a tagged frame.', '0x8100', 'TPID 0x8100'),
      f('PCP', 3, 'Priority Code Point: 0–7 QoS priority (7 = highest, e.g. voice).', '5', 'PCP'),
      f('DEI', 1, 'Drop Eligible Indicator: frames that may be dropped first during congestion.', '0', 'D'),
      f('VLAN ID', 12, 'Which VLAN (1–4094). 12 bits gives 4096 values; 0 and 4095 are reserved.', '10', 'VLAN ID'),
    ] },
    { id: 'wifi', name: '802.11 Wi‑Fi MAC header', layer: 'Layer 2', size: '24 B + 4 B FCS', blurb: 'Wi‑Fi frames carry up to four addresses because traffic passes through an access point.', fields: [
      f('Protocol version', 2, 'Always 0 for all current Wi‑Fi.', '0', 'Ver'),
      f('Type', 2, 'Frame family: 0 = management (beacon, auth), 1 = control (ACK, RTS), 2 = data.', '2 (Data)', 'Type'),
      f('Subtype', 4, 'Exact frame inside the type, e.g. QoS Data, Probe Request, Association Response.', '8 (QoS Data)', 'Subtype'),
      f('To DS', 1, '1 when the frame is heading to the access point (distribution system).', '1', 'To'),
      f('From DS', 1, '1 when the frame comes from the access point.', '0', 'Fr'),
      f('More Frag', 1, 'More fragments of this packet follow.', '0', 'MF'),
      f('Retry', 1, 'This is a retransmission of an earlier frame.', '0', 'R'),
      f('Power Mgmt', 1, 'Sender will go into sleep mode after this frame (battery saving).', '0', 'PM'),
      f('More Data', 1, 'AP tells a sleeping station that more frames are buffered.', '0', 'MD'),
      f('Protected', 1, 'The body is encrypted (WPA2/WPA3).', '1', 'P'),
      f('Order', 1, 'Strict ordering required.', '0', 'O'),
      f('Duration / ID', 16, 'How long (µs) the medium will be busy — other stations use this to stay quiet (NAV).', '44 µs', 'Duration / ID'),
      f('Address 1 (receiver)', 48, 'The device that should hear the frame next on the air.', '00:11:22:33:44:55', 'Address 1 (receiver)'),
      f('Address 2 (transmitter)', 48, 'The device that just transmitted the frame.', 'aa:bb:cc:11:22:33', 'Address 2 (transmitter)'),
      f('Address 3 (BSSID / final)', 48, 'Depending on To/From DS: the BSSID or the final source/destination.', '00:de:ad:be:ef:01', 'Address 3 (BSSID / dest)'),
      f('Fragment', 4, 'Fragment number of this frame.', '0', 'Frag'),
      f('Sequence number', 12, 'Counter used to detect duplicates and order frames.', '1048', 'Sequence no.'),
    ] },
    { id: 'arp', name: 'ARP', layer: 'Layer 2.5', size: '28 B', blurb: 'Maps an IPv4 address to a MAC address on the local network.', fields: [
      f('Hardware type', 16, '1 = Ethernet.', '1', 'Hardware type'), f('Protocol type', 16, 'The address type being resolved: 0x0800 = IPv4.', '0x0800', 'Protocol type'),
      f('HLEN', 8, 'Length of a hardware address in bytes (6 for MAC).', '6', 'HLEN'), f('PLEN', 8, 'Length of a protocol address in bytes (4 for IPv4).', '4', 'PLEN'),
      f('Operation', 16, '1 = request (“who has?”), 2 = reply (“it’s me”).', '1 (request)', 'Operation'),
      f('Sender MAC', 48, 'MAC of the device sending this ARP message.', 'aa:aa:aa:aa:aa:0a', 'Sender MAC'), f('Sender IP', 32, 'Its IPv4 address.', '192.168.1.10', 'Sender IP'),
      f('Target MAC', 48, 'MAC being looked for (all zeros in a request).', '00:00:00:00:00:00', 'Target MAC'), f('Target IP', 32, 'The IPv4 address whose MAC we want.', '192.168.1.20', 'Target IP'),
    ] },
    { id: 'ipv4', name: 'IPv4', layer: 'Layer 3', size: '20 B (min)', blurb: 'Addresses the packet and tells routers how to forward it across networks.', fields: [
      f('Version', 4, 'Always 4 for IPv4.', '4', 'Ver'), f('IHL', 4, 'Header length in 32‑bit words (5 = 20 bytes, more if options are used).', '5', 'IHL'),
      f('DSCP', 6, 'Differentiated Services: marks priority (46 = EF, used for voice).', '0', 'DSCP'), f('ECN', 2, 'Explicit Congestion Notification bits.', '0', 'ECN'),
      f('Total Length', 16, 'Size of the whole packet (header + data) in bytes, up to 65 535.', '504', 'Total Length'),
      f('Identification', 16, 'Identifies fragments that belong to the same original packet.', '0x1c46', 'Identification'),
      f('Flags', 3, 'Bit 1 = Don’t Fragment, bit 2 = More Fragments.', '010 (DF)', 'Flags'), f('Fragment Offset', 13, 'Where this fragment belongs in the original packet (in 8‑byte units).', '0', 'Fragment Offset'),
      f('TTL', 8, 'Time To Live: reduced by 1 at every router; at 0 the packet is dropped. Stops endless loops (and powers traceroute).', '64', 'TTL'),
      f('Protocol', 8, 'What is inside: 1 = ICMP, 6 = TCP, 17 = UDP, 47 = GRE, 89 = OSPF.', '6 (TCP)', 'Protocol'),
      f('Header Checksum', 16, 'Checksum of the header only; routers recompute it as TTL changes.', '0xb1e6', 'Header Checksum'),
      f('Source IP', 32, 'Sender’s IPv4 address.', '192.168.1.10', 'Source IP'), f('Destination IP', 32, 'Final destination’s IPv4 address.', '203.0.113.10', 'Destination IP'),
      f('Options (optional)', 32, 'Rarely used extras (record route, timestamps). Not present in most packets.', '—', 'Options (optional)'),
    ] },
    { id: 'ipv6', name: 'IPv6', layer: 'Layer 3', size: '40 B', blurb: 'A simpler, fixed‑size header with huge 128‑bit addresses. No checksum and no fragmentation by routers.', fields: [
      f('Version', 4, 'Always 6.', '6', 'Ver'), f('Traffic Class', 8, 'Like IPv4 DSCP + ECN: QoS marking.', '0', 'Traffic Class'),
      f('Flow Label', 20, 'Lets routers keep packets of one flow on the same path.', '0x12345', 'Flow Label'),
      f('Payload Length', 16, 'Size of everything after this 40‑byte header.', '440', 'Payload Length'), f('Next Header', 8, 'What follows: 6 = TCP, 17 = UDP, 58 = ICMPv6, or an extension header.', '6 (TCP)', 'Next Header'),
      f('Hop Limit', 8, 'IPv6’s TTL.', '64', 'Hop Limit'),
      f('Source address', 128, 'Sender’s 128‑bit address, written in hex like 2001:db8:1::a1.', '2001:db8:1::a1', 'Source address (128 bits)'),
      f('Destination address', 128, 'Receiver’s 128‑bit address.', '2001:db8:2::5', 'Destination address (128 bits)'),
    ] },
    { id: 'icmp', name: 'ICMP (echo)', layer: 'Layer 3', size: '8 B', blurb: 'Sits inside IP to report errors and run tools such as ping and traceroute.', fields: [
      f('Type', 8, '8 = echo request, 0 = echo reply, 3 = destination unreachable, 11 = time exceeded.', '8 (echo request)', 'Type'),
      f('Code', 8, 'A sub‑type; for “unreachable” it says why (network, host, port…).', '0', 'Code'), f('Checksum', 16, 'Covers the whole ICMP message.', '0x4d5a', 'Checksum'),
      f('Identifier', 16, 'Lets ping match replies to the right process.', '0x1a2b', 'Identifier'), f('Sequence number', 16, 'Increments with every echo so loss can be counted.', '1', 'Sequence no.'),
      f('Data', 32, 'Padding or timestamp copied back by the reply (often 32–56 bytes).', 'abcdefgh…', 'Data …'),
    ] },
    { id: 'tcp', name: 'TCP', layer: 'Layer 4', size: '20 B (min)', blurb: 'Makes delivery reliable: numbers every byte, acknowledges them and controls the speed.', fields: [
      f('Source Port', 16, 'The sending application’s port (often a random high number).', '52344', 'Source Port'), f('Destination Port', 16, 'The service being reached: 80 HTTP, 443 HTTPS, 22 SSH, 25 SMTP.', '443', 'Destination Port'),
      f('Sequence Number', 32, 'Number of the first byte in this segment. Lets the receiver reorder data and spot gaps.', '1 000 000', 'Sequence Number'),
      f('Acknowledgment Number', 32, 'The next byte the sender expects to receive. Confirms everything before it arrived.', '2 000 000', 'Acknowledgment Number'),
      f('Data Offset', 4, 'Header length in 32‑bit words (5 = 20 bytes; more means options are present).', '5', 'Offset'), f('Reserved', 3, 'Unused, set to 0.', '0', 'Rsv'),
      f('NS', 1, 'Nonce Sum: experimental ECN protection.', '0', 'NS'),
      f('CWR', 1, 'Congestion Window Reduced: sender slowed down after an ECN echo.', '0', 'C'), f('ECE', 1, 'ECN Echo: tells the sender the network is congested.', '0', 'E'),
      f('URG', 1, 'Urgent pointer is valid (almost never used).', '0', 'U'), f('ACK', 1, 'The acknowledgment number is valid. Set on almost every segment after the first.', '1', 'A'),
      f('PSH', 1, 'Push: deliver the data to the application immediately.', '1', 'P'), f('RST', 1, 'Reset: abort the connection (e.g. nobody is listening on that port).', '0', 'R'),
      f('SYN', 1, 'Synchronise: start a connection and announce initial sequence numbers.', '0', 'S'), f('FIN', 1, 'Finish: sender has no more data; closes its side.', '0', 'F'),
      f('Window Size', 16, 'How many more bytes the receiver can buffer. This is flow control.', '64240', 'Window Size'),
      f('Checksum', 16, 'Covers header, data and a pseudo‑header with the IP addresses.', '0x9f2e', 'Checksum'), f('Urgent Pointer', 16, 'Offset of urgent data when URG is set.', '0', 'Urgent Pointer'),
      f('Options (optional)', 32, 'MSS, window scaling, SACK, timestamps — negotiated in the SYN packets.', 'MSS 1460, SACK', 'Options (optional)'),
    ] },
    { id: 'udp', name: 'UDP', layer: 'Layer 4', size: '8 B', blurb: 'The smallest transport header: just ports, length and a checksum.', fields: [
      f('Source Port', 16, 'Sender’s port (optional; may be 0).', '50000', 'Source Port'), f('Destination Port', 16, 'Service port: 53 DNS, 67/68 DHCP, 123 NTP, 5060 SIP.', '53', 'Destination Port'),
      f('Length', 16, 'Header + data in bytes (minimum 8).', '41', 'Length'), f('Checksum', 16, 'Optional in IPv4, mandatory in IPv6.', '0x5f1c', 'Checksum'),
    ] },
    { id: 'dns', name: 'DNS message', layer: 'Layer 7', size: '12 B + questions', blurb: 'A compact header followed by question and answer records.', fields: [
      f('Transaction ID', 16, 'Random number so replies match their questions (also helps against spoofing).', '0x1a2b', 'Transaction ID'),
      f('QR', 1, '0 = query, 1 = response.', '0', 'QR'), f('Opcode', 4, '0 = standard query.', '0', 'Opcode'), f('AA', 1, 'Authoritative Answer.', '0', 'AA'), f('TC', 1, 'Truncated: retry over TCP.', '0', 'TC'),
      f('RD', 1, 'Recursion Desired: asks the resolver to do the whole lookup.', '1', 'RD'), f('RA', 1, 'Recursion Available (set by the server).', '0', 'RA'), f('Z', 3, 'Reserved.', '0', 'Z'),
      f('RCODE', 4, 'Result: 0 = OK, 3 = NXDOMAIN (name doesn’t exist).', '0', 'RCODE'),
      f('QDCOUNT', 16, 'Number of questions.', '1', 'QDCOUNT'), f('ANCOUNT', 16, 'Number of answer records.', '0', 'ANCOUNT'),
      f('NSCOUNT', 16, 'Number of authority records.', '0', 'NSCOUNT'), f('ARCOUNT', 16, 'Number of additional records.', '0', 'ARCOUNT'),
    ] },
    { id: 'capwap', name: 'CAPWAP', layer: 'Tunnel (UDP 5246/5247)', size: '8 B (min)', blurb: 'The tunnel header between a Wi‑Fi access point and its controller.', fields: [
      f('Version', 4, 'CAPWAP version, 0.', '0', 'Ver'), f('Type', 4, '0 = CAPWAP header, 1 = DTLS‑encrypted payload follows.', '0', 'Type'),
      f('HLEN', 5, 'Header length in 32‑bit words.', '2', 'HLEN'), f('RID', 5, 'Radio ID: which radio on the AP (0 = first radio).', '0', 'RID'), f('WBID', 5, 'Wireless Binding ID: 1 = IEEE 802.11.', '1', 'WBID'),
      f('T', 1, 'Payload type: 1 = native 802.11 frame, 0 = 802.3 frame.', '0', 'T'), f('F', 1, 'Fragment: this is a fragment of a larger packet.', '0', 'F'), f('L', 1, 'Last fragment.', '0', 'L'),
      f('W', 1, 'Wireless optional header present.', '0', 'W'), f('M', 1, 'Radio MAC address header present.', '0', 'M'), f('K', 1, 'Keep‑alive packet.', '0', 'K'), f('Flags', 3, 'Reserved bits.', '0', 'Flg'),
      f('Fragment ID', 16, 'Identifies fragments of one packet.', '0', 'Fragment ID'), f('Fragment Offset', 13, 'Position of this fragment.', '0', 'Fragment Offset'), f('Reserved', 3, 'Unused.', '0', 'Rsv'),
    ] },
  ];

  const state = { h: 4, sel: 0 };
  function layoutRows(fields) {                   // wrap fields into 32‑bit rows
    const rows = [[]]; let used = 0;
    fields.forEach((fl, idx) => {
      let left = fl.bits, first = true;
      while (left > 0) {
        if (used === 32) { rows.push([]); used = 0; }
        const take = Math.min(left, 32 - used);
        rows[rows.length - 1].push({ idx, bits: take, first, last: take === left });
        used += take; left -= take; first = false;
      }
    });
    return rows;
  }
  function buildHeaders() {
    $('#htabs').innerHTML = HEADERS.map((h, i) => `<button role="tab" class="${i === state.h ? 'on' : ''}" data-i="${i}">${h.name}</button>`).join('');
    $$('#htabs button').forEach(b => b.onclick = () => { state.h = +b.dataset.i; state.sel = 0; drawHeader(); $$('#htabs button').forEach(x => x.classList.toggle('on', x === b)); });
    const r = $('#ruler'); r.innerHTML = Array.from({ length: 32 }, (_, i) => `<i>${i % 4 === 0 ? i : ''}</i>`).join('');
    drawHeader();
  }
  function drawHeader() {
    const H = HEADERS[state.h];
    const totalBits = H.fields.reduce((a, b) => a + b.bits, 0);
    $('#hmeta').innerHTML = `<h3>${H.name}</h3><span class="chip"><b>Layer</b>${H.layer}</span><span class="chip"><b>Size</b>${H.size}</span><p>${H.blurb}</p>`;
    const rows = layoutRows(H.fields), grid = $('#hgrid'); grid.innerHTML = '';
    rows.forEach((row, ri) => {
      const rd = document.createElement('div'); rd.className = 'hrow';
      row.forEach(seg => {
        const fl = H.fields[seg.idx], d = document.createElement('button');
        d.className = 'hf' + (seg.first ? '' : ' cont') + (seg.last ? '' : ' open') + (seg.idx === state.sel ? ' sel' : '');
        d.style.flex = `${seg.bits} 1 0`; d.style.minWidth = '0'; d.dataset.i = seg.idx; d.style.setProperty('--hue', (seg.idx * 47) % 360);
        d.style.animationDelay = (ri * 40 + seg.idx * 8) + 'ms';
        d.innerHTML = seg.first || seg.bits >= 8 ? `<span>${esc(fl.ab)}</span><em>${fl.bits}${fl.bits === 1 ? ' bit' : ' bits'}</em>` : '';
        d.title = `${fl.name} — ${fl.bits} bits`;
        d.onclick = () => selectField(seg.idx);
        rd.appendChild(d);
      });
      grid.appendChild(rd);
    });
    selectField(state.sel);
  }
  function selectField(i) {
    state.sel = i; const H = HEADERS[state.h], fl = H.fields[i];
    $$('#hgrid .hf').forEach(x => x.classList.toggle('sel', +x.dataset.i === i));
    const bytes = fl.bits >= 8 && fl.bits % 8 === 0 ? ` = ${fl.bits / 8} byte${fl.bits / 8 > 1 ? 's' : ''}` : '';
    const hue = (i * 47) % 360;
    $('#hdetail').innerHTML = `<div class="hd-top" style="--hue:${hue}"><span class="hd-idx">${String(i + 1).padStart(2, '0')}</span><h4>${fl.name}</h4></div>
      <div class="hd-size"><b>${fl.bits}</b> bit${fl.bits > 1 ? 's' : ''}${bytes}${H.fields.length ? ` · field ${i + 1} of ${H.fields.length}` : ''}</div>
      <p>${fl.desc}</p><div class="hd-ex"><span>Example value</span><code>${esc(fl.ex)}</code></div>
      <div class="hd-nav"><button class="btn mini" id="hPrev" ${i === 0 ? 'disabled' : ''}>‹ Previous</button><button class="btn mini" id="hNext" ${i === H.fields.length - 1 ? 'disabled' : ''}>Next ›</button></div>`;
    $('#hPrev').onclick = () => selectField(i - 1); $('#hNext').onclick = () => selectField(i + 1);
  }

  /* ═════════ 4 · quiz ═════════ */

  function pickQuizQuestions(bank, quizId, count = 15) {
    const key = 'pf-quiz-seen-' + quizId;
    let seen = [];
    try { seen = JSON.parse(localStorage.getItem(key) || '[]'); } catch {}
    const fresh = bank.map((q, id) => ({ q, id })).filter(x => !seen.includes(x.id));
    // Start a new cycle only when fewer than a full quiz remain.
    const pool = fresh.length >= count ? fresh : bank.map((q, id) => ({ q, id }));
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const selected = pool.slice(0, Math.min(count, pool.length));
    const nextSeen = [...new Set([...seen, ...selected.map(x => x.id)])];
    try { localStorage.setItem(key, JSON.stringify(nextSeen.length >= bank.length ? [] : nextSeen)); } catch {}
    return selected.map(x => x.q);
  }

  const QUIZ = [
    { q: 'Which layer is responsible for routing packets between different networks?', o: ['Data link (2)', 'Network (3)', 'Transport (4)', 'Session (5)'], a: 1, e: 'The Network layer uses IP addresses and routers to choose a path across networks.' },
    { q: 'A switch forwards frames using which address?', o: ['IP address', 'Port number', 'MAC address', 'Domain name'], a: 2, e: 'Switches work at layer 2 and learn which MAC address lives on which port.' },
    { q: 'Which layer adds port numbers to the data?', o: ['Application', 'Transport', 'Network', 'Physical'], a: 1, e: 'TCP and UDP (layer 4) use source and destination ports to reach the right program.' },
    { q: 'What is the data unit at layer 2 called?', o: ['Segment', 'Packet', 'Frame', 'Bit'], a: 2, e: 'Layer 4 = segment, layer 3 = packet, layer 2 = frame, layer 1 = bits.' },
    { q: 'What does the TTL field in the IPv4 header prevent?', o: ['Data corruption', 'Endless routing loops', 'Eavesdropping', 'Slow downloads'], a: 1, e: 'Every router lowers TTL by 1. At 0 the packet is dropped, so loops cannot last forever.' },
    { q: 'Which TCP flag starts a connection?', o: ['ACK', 'FIN', 'SYN', 'RST'], a: 2, e: 'SYN starts the handshake, SYN‑ACK answers and ACK completes it.' },
    { q: 'In which order is data wrapped when sending?', o: ['Frame → packet → segment → data', 'Data → segment → packet → frame', 'Data → packet → segment → frame', 'Segment → data → frame → packet'], a: 1, e: 'Data is wrapped as segment (L4), then packet (L3), then frame (L2), then sent as bits.' },
    { q: 'A Wi‑Fi access point mostly works at which layers?', o: ['Layers 1 and 2', 'Layers 3 and 4', 'Only layer 7', 'Layers 5 and 6'], a: 0, e: 'An AP handles radio (layer 1) and 802.11 frames (layer 2) — a controller can add CAPWAP tunnelling on top.' },
  ];
  function initQuiz() {
    const QUESTIONS_PER_ATTEMPT = 15;
    let activeQuestions = pickQuizQuestions(QUIZ, 'layers', QUESTIONS_PER_ATTEMPT);
    const box = $('#quizBox'); let i = 0, score = 0, T0 = performance.now();
    const render = () => {
      if (i >= activeQuestions.length) { box.innerHTML = `<div class="qdone"><div class="big">${score}/${activeQuestions.length}</div><p>${score >= 7 ? 'Network ninja! You know your layers.' : score >= 5 ? 'Solid. Replay the encapsulation animation and try again.' : 'Good start — revisit the layers and headers above, then retry.'}</p><div id="qForm"></div><button class="btn solid" id="qAgain">Try again</button></div>`; PFBoard.form($('#qForm'), 'layers', score, activeQuestions.length, Math.round(performance.now() - T0)); $('#qAgain').onclick = () => { activeQuestions = pickQuizQuestions(QUIZ, 'layers', QUESTIONS_PER_ATTEMPT); i = 0; score = 0; T0 = performance.now(); render(); }; return; }
      const Q = activeQuestions[i];
      box.innerHTML = `<div class="qtop"><span>Question ${i + 1} / ${activeQuestions.length}</span><span>Score ${score}</span></div><div class="qbar"><b style="width:${i / activeQuestions.length * 100}%"></b></div>
        <h3 class="qq">${Q.q}</h3><div class="qopts">${Q.o.map((t, k) => `<button data-k="${k}">${t}</button>`).join('')}</div><div class="qfb" id="qfb"></div>`;
      $$('.qopts button', box).forEach(b => b.onclick = () => {
        const k = +b.dataset.k, ok = k === Q.a; if (ok) score++;
        $$('.qopts button', box).forEach(x => { x.disabled = true; if (+x.dataset.k === Q.a) x.classList.add('right'); });
        if (!ok) b.classList.add('wrong');
        $('#qfb').innerHTML = `<p><b>${ok ? 'Correct.' : 'Not quite.'}</b> ${Q.e}</p><button class="btn solid" id="qNext">${i === activeQuestions.length - 1 ? 'See score' : 'Next question'}</button>`;
        $('#qNext').onclick = () => { i++; render(); };
      });
    };
    render();
  }

  buildStack(); initEncap(); buildHeaders(); initQuiz(); PFBoard.mount('#board', 'layers', 'Leaderboard · OSI & headers quiz');
})();
