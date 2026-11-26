/* PacketFlow — Wireless Lab (part 2): join flows, AP join to 9800, roaming, security, frames, air→wire, CSMA/CA, best practice, quiz */
(() => {
  'use strict';
  const { $, $$, sleep, esc, Flow, tabs } = Object.assign({}, window.WL, { Flow: window.WL.Flow, tabs: window.WL.tabs });
  // step helper: f, t, tag, title, text, fields, kind, phase
  const S = (f, t, tag, title, text, fields, k = 'req', phase) => ({ f, t, tag, title, text, fields, k, phase });

  /* ═════════ C · client join ═════════ */
  const JA = [
    { id: 'c', label: 'Client', sub: 'aa:bb:cc:11:22:33' }, { id: 'ap', label: 'Access Point', sub: 'AP‑Lobby‑01 · ch 36' },
    { id: 'w', label: 'Catalyst 9800 WLC', sub: '192.168.1.5' }, { id: 'r', label: 'Cisco ISE (RADIUS)', sub: '192.168.1.20' }, { id: 'd', label: 'DHCP server', sub: '10.10.20.1' }];
  function joinSteps(mode) {
    const st = [];
    st.push(S('ap', ['c'], 'BEACON', 'The AP announces the network: Beacon', 'Every <b>102.4 ms</b> (100 time units) the AP broadcasts a beacon on its channel. It carries the SSID, supported data rates, security settings (RSN element), country code and Wi‑Fi 4/5/6 capabilities. This is how clients discover networks <i>passively</i>.', [['SSID', 'Corp‑WiFi'], ['Interval', '100 TU = 102.4 ms'], ['Channel', '36 (5 GHz)'], ['Security (RSN)', mode === 'ent' ? 'WPA2/3‑Enterprise (802.1X)' : mode === 'sae' ? 'WPA3‑SAE' : mode === 'open' ? 'Open' : 'WPA2‑PSK'], ['Country', 'US']], 'ctl', 'Discovery'));
    st.push(S('c', 'c', 'SCAN', 'The client scans channels', '<b>Passive scan:</b> listen on each channel for at least one beacon interval. <b>Active scan:</b> send a Probe Request and wait 10–20 ms. Active is much faster, so phones do it often. On 6 GHz clients first check only the PSC channels.', [['Passive', '≥ 102.4 ms per channel'], ['Active', '~10–20 ms per channel']], 'ctl'));
    st.push(S('c', 'ap', 'PROBE REQ', 'Client asks: “Anyone there?”', 'A <b>Probe Request</b> lists the SSID it wants (or a wildcard “any”) plus the data rates and capabilities (HT/VHT/HE) the client supports. Many modern phones randomise their MAC address in probes for privacy.', [['Subtype', '4 Probe Request'], ['Dest', 'ff:ff:ff:ff:ff:ff'], ['SSID', 'Corp‑WiFi']], 'req'));
    st.push(S('ap', 'c', 'PROBE RESP', 'AP answers directly', 'The <b>Probe Response</b> looks like a beacon but is unicast to this client. It confirms the AP supports the client’s rates and security.', [['Subtype', '5 Probe Response'], ['BSSID', '00:11:22:33:44:55']], 'res'));
    if (mode === 'sae') {
      st.push(S('c', 'ap', 'AUTH SAE COMMIT', 'WPA3: SAE Commit (client)', 'Instead of the dummy “open” authentication, WPA3 uses the <b>Dragonfly</b> handshake inside the Authentication frames. The client sends a scalar and an element derived from the password and a random number.', [['Auth algorithm', '3 (SAE)'], ['Seq', '1 Commit']], 'req', 'Authentication & association'));
      st.push(S('ap', 'c', 'AUTH SAE COMMIT', 'WPA3: SAE Commit (AP)', 'The AP does the same. Neither side reveals the password, and every guess an attacker makes needs a live exchange — no offline cracking.', [['Seq', '1 Commit']], 'res'));
      st.push(S('c', 'ap', 'AUTH SAE CONFIRM', 'WPA3: SAE Confirm (client)', 'Each side now computes the same PMK and proves it with a hash (Confirm).', [['Seq', '2 Confirm']], 'sec'));
      st.push(S('ap', 'c', 'AUTH SAE CONFIRM', 'WPA3: SAE Confirm (AP)', 'Authentication finished with a fresh, unique PMK for this session.', [['Status', '0 Success']], 'sec'));
    } else {
      st.push(S('c', 'ap', 'AUTH (OPEN)', 'Authentication request', 'A leftover from the old WEP days: <b>Open System</b> authentication accepts everyone. Real security happens later. (Only 2 frames: seq 1 and seq 2.)', [['Algorithm', '0 Open System'], ['Seq', '1']], 'req', 'Authentication & association'));
      st.push(S('ap', 'c', 'AUTH (OPEN)', 'Authentication response', 'The AP says “OK”. The client is <b>authenticated</b> but not yet <b>associated</b> — the two states of the 802.11 state machine.', [['Status', '0 Success'], ['Seq', '2']], 'res'));
    }
    st.push(S('c', 'ap', 'ASSOC REQ', 'Association request', 'The client asks to join the BSS and announces its capabilities. The <b>RSN element</b> lists the cipher (CCMP/GCMP), the AKM (PSK, SAE, 802.1X, FT…), PMF capability and optionally a PMKID.', [['Subtype', '0 Association Request'], ['AKM', mode === 'ent' ? '802.1X' : mode === 'sae' ? 'SAE' : mode === 'open' ? '—' : 'PSK'], ['Cipher', mode === 'open' ? 'none' : 'CCMP'], ['PMF', mode === 'sae' ? 'Required' : 'Capable']], 'req'));
    st.push(S('ap', 'c', 'ASSOC RESP', 'Association response', 'Status 0 = success and the client gets an <b>Association ID (AID)</b>. The AP also uses the AID in the TIM element to tell sleeping clients they have buffered data.', [['Status', '0 Success'], ['AID', '7']], 'res'));
    st.push(S('ap', 'w', 'CAPWAP: STATION ADD', 'AP tells the controller', 'The AP is “lightweight”: it passes the event to the 9800 over the CAPWAP control tunnel. The controller creates a client entry. <b>Client state: Authenticating</b>.', [['Tunnel', 'CAPWAP control UDP 5246'], ['9800 state', 'Authenticating']], 'ctl'));
    if (mode === 'psk') {
      st.push(S('c', 'c', 'PMK = PBKDF2', 'Both sides already know the key', 'There is no server. The client and the controller each compute <b>PMK = PBKDF2(passphrase, SSID, 4096 iterations)</b>. If the passphrase is wrong the 4‑way handshake below will fail at message 2.', [['PMK', '256 bits, same for everyone'], ['Weakness', 'Anyone with the password can derive keys']], 'ctl', 'Security'));
    }
    if (mode === 'ent') {
      st.push(S('c', 'ap', 'EAPOL‑START', 'Client starts 802.1X', 'The AP only allows EAP traffic for now (<b>controlled port closed</b>). The client sends EAPOL‑Start, or waits for the AP to ask.', [['Port', 'Uncontrolled: EAP only']], 'req', 'Security (802.1X)'));
      st.push(S('ap', 'c', 'EAP IDENTITY?', 'AP asks “who are you?”', 'The AP — acting as <b>authenticator</b> — sends EAP‑Request/Identity.', [['EAP code', '1 Request, Type 1 Identity']], 'res'));
      st.push(S('c', 'ap', 'EAP IDENTITY', 'Client answers with its identity', 'The outer identity (often <i>anonymous@corp</i>) is sent in clear text, so it should not reveal the real user.', [['Identity', 'anonymous@corp.com']], 'req'));
      st.push(S('w', 'r', 'RADIUS ACCESS‑REQUEST', 'Controller asks ISE', 'The 9800 relays the EAP message in a <b>RADIUS Access‑Request</b> (UDP 1812). The AP and WLC never see the password — they only relay.', [['UDP', '1812'], ['NAS‑IP', '192.168.1.5'], ['Called‑Station‑ID', 'AP MAC : SSID']], 'req'));
      st.push(S('c', 'r', 'EAP‑TLS / PEAP', 'TLS tunnel built end‑to‑end', 'Client and ISE perform several round trips <i>through</i> the AP and WLC: ISE proves who it is with a certificate, then the client proves itself (certificate for EAP‑TLS, or password inside PEAP). <b>Always validate the server certificate</b> on the client or you are open to evil‑twin attacks.', [['Method', 'EAP‑TLS (best) / PEAP‑MSCHAPv2'], ['Round trips', '5–10']], 'sec'));
      st.push(S('r', 'w', 'ACCESS‑ACCEPT', 'ISE says yes — with extras', 'Access‑Accept returns the <b>MSK</b> (master session key, source of the PMK) and authorisation: VLAN, ACL, SGT, QoS, session timeout.', [['MS‑MPPE keys', 'MSK → PMK'], ['VLAN', '20'], ['SGT', '10 (Employees)']], 'sec'));
      st.push(S('w', 'ap', 'PMK PUSH', 'Controller gives the AP the PMK', 'The WLC sends the PMK to the AP (CAPWAP) so it can run the 4‑way handshake, and EAP‑Success goes to the client.', [['Delivered over', 'DTLS control tunnel']], 'sec'));
      st.push(S('ap', 'c', 'EAP‑SUCCESS', 'Client authenticated', 'The controlled port is still closed for data until keys exist. Next: the 4‑way handshake.', [['EAP code', '3 Success']], 'res'));
    }
    if (mode !== 'open') {
      st.push(S('ap', 'c', 'M1: ANONCE', '4‑way handshake · message 1', 'The AP sends <b>ANonce</b>, a random number. The client now has everything to compute the PTK: PMK + ANonce + SNonce + both MAC addresses.', [['EAPOL‑Key', 'Pairwise, ACK'], ['ANonce', '32 random bytes']], 'res', '4‑way handshake'));
      st.push(S('c', 'ap', 'M2: SNONCE+MIC', '4‑way handshake · message 2', 'The client replies with its own <b>SNonce</b> and a <b>MIC</b> computed with the new key. A wrong password makes the MIC invalid — this is where bad PSKs are caught.', [['SNonce', '32 random bytes'], ['MIC', 'valid only if PMK matches']], 'req'));
      st.push(S('ap', 'c', 'M3: GTK', '4‑way handshake · message 3', 'The AP confirms and delivers the <b>GTK</b> (group key for broadcast/multicast), encrypted. With PMF it also sends the IGTK.', [['Key data', 'GTK (+IGTK), encrypted with KEK']], 'sec'));
      st.push(S('c', 'ap', 'M4: ACK', '4‑way handshake · message 4', 'The client acknowledges and <b>installs the keys</b>. From now on all unicast data is encrypted with the PTK.', [['Result', 'PTK installed']], 'sec'));
    }
    st.push(S('c', 'd', 'DHCP DISCOVER', 'Client asks for an IP address', 'Now that the link is secure the client broadcasts DHCP Discover. The AP tunnels it to the WLC (central switching) which puts it in the client’s VLAN. <b>Client state: IP Learn</b>.', [['9800 state', 'IP Learn']], 'req', 'Get an IP address'));
    st.push(S('d', 'c', 'DHCP OFFER · ACK', 'DHCP gives an address', 'Offer, Request, ACK (DORA) complete. The WLC watches (DHCP snooping) and learns the client’s IP.', [['IP', '10.10.20.55'], ['Gateway', '10.10.20.1']], 'res'));
    st.push(S('w', 'w', 'RUN', 'Client reaches RUN state', 'The 9800 marks the client <b>Run</b>: policy (VLAN, ACL, QoS, SGT) is applied and traffic flows. Total time: about 1–3 seconds for enterprise, under 1 s for PSK.', [['9800 state', 'Run'], ['Policy', 'VLAN 20 · ACL · QoS']], 'ctl'));
    return st;
  }
  const JMODES = [['WPA2‑Personal (PSK)', 'psk'], ['WPA3‑Personal (SAE)', 'sae'], ['WPA2/3‑Enterprise (802.1X)', 'ent'], ['Open', 'open']];
  const joinFlow = Flow($('#joinFlow'));
  tabs($('#joinTabs'), JMODES.map(m => m[0]), i => joinFlow.load({ actors: JA, steps: joinSteps(JMODES[i][1]), intro: 'A client joins ' + JMODES[i][0], introText: 'Phases: discovery → authentication & association → security → 4‑way handshake → IP address. Click Play.' }));

  /* ═════════ D · AP join (9800) ═════════ */
  const AA = [{ id: 'ap', label: 'Access Point', sub: 'C9120AXI' }, { id: 'd', label: 'DHCP / DNS server', sub: '10.10.10.1' }, { id: 'w', label: 'Catalyst 9800 WLC', sub: 'WLC‑Primary · 192.168.1.5' }];
  function apSteps(flex) {
    const st = [];
    st.push(S('ap', 'ap', 'POWER ON', 'AP powers up', 'The AP gets PoE from the switch (negotiated with LLDP/CDP: 802.3at needs ≥ 25.5 W, Wi‑Fi 6 APs often want 802.3bt for full features), boots its image and enters the <b>Discovery</b> state.', [['PoE', '802.3at / bt'], ['AP state', 'Discovery']], 'ctl', 'Boot & IP address'));
    st.push(S('ap', 'd', 'DHCP DISCOVER', 'AP asks for an IP address', 'An AP needs an IP like any client. It adds <b>Option 60</b> (vendor class “Cisco AP c9120AXI”) so the server can reply with Cisco‑specific options.', [['Option 60', 'Cisco AP c9120AXI'], ['VLAN', 'AP management VLAN']], 'req'));
    st.push(S('d', 'ap', 'DHCP OFFER', 'Server offers IP + controller address', 'The offer can contain <b>Option 43</b> — the IP address of the WLC (type 0xF1, length 4 × number of WLCs, then the IPs in hex). Also gateway, DNS (option 6) and domain (option 15).', [['IP', '10.10.10.77'], ['Option 43', '0xF104 C0A80105 = 192.168.1.5'], ['Option 6', '10.10.10.1']], 'res'));
    st.push(S('ap', 'd', 'DHCP REQUEST', 'AP accepts the offer', 'Standard DORA exchange.', [['Requested IP', '10.10.10.77']], 'req'));
    st.push(S('d', 'ap', 'DHCP ACK', 'AP is on the network', 'The AP now has IP, gateway and DNS. Next it must find a controller.', [['Lease', '24 h']], 'res'));
    st.push(S('ap', 'd', 'DNS QUERY', 'Alternative: DNS lookup', 'If Option 43 is missing the AP queries <b>CISCO‑CAPWAP‑CONTROLLER.&lt;domain&gt;</b> (from option 15). Order of discovery: previously joined WLC / static primary → DHCP option 43 → DNS → local broadcast.', [['Name', 'CISCO-CAPWAP-CONTROLLER.corp.local']], 'req', 'Find the controller'));
    st.push(S('d', 'ap', 'DNS ANSWER', 'DNS returns the controller IP', 'An A record pointing to the 9800’s wireless management interface.', [['A', '192.168.1.5']], 'res'));
    st.push(S('ap', 'w', 'DISCOVERY REQ', 'CAPWAP Discovery Request', 'The AP sends <b>unicast UDP 5246</b> to every WLC it learned about (and a broadcast fallback). It includes its model, name, MAC and software version.', [['UDP dst', '5246'], ['Message', 'Discovery Request'], ['AP model', 'C9120AXI']], 'req'));
    st.push(S('w', 'ap', 'DISCOVERY RESP', 'Each WLC replies', 'The Discovery Response advertises the WLC name, IP, how many APs are joined and its capacity.', [['WLC', 'WLC‑Primary'], ['APs joined', '312 / 500'], ['Capacity', 'OK']], 'res'));
    st.push(S('ap', 'ap', 'CHOOSE WLC', 'AP picks a controller', 'Preference order: <b>1) primary 2) secondary 3) tertiary</b> (configured by name in the AP join profile / AP high‑availability) → otherwise the least‑loaded WLC. <i>Best practice:</i> always set primary and secondary so APs go exactly where you want.', [['Primary', 'WLC‑Primary'], ['Secondary', 'WLC‑Secondary']], 'ctl'));
    st.push(S('ap', 'w', 'DTLS CLIENT HELLO', 'Build the secure tunnel (DTLS)', 'The CAPWAP control channel is protected with <b>DTLS 1.2</b>. The AP starts with ClientHello. The WLC replies with a HelloVerifyRequest cookie so it can resist spoofed floods.', [['Protocol', 'DTLS 1.2 over UDP 5246']], 'sec', 'DTLS tunnel'));
    st.push(S('w', 'ap', 'SERVER HELLO + CERT', 'WLC proves its identity', 'The 9800 presents its certificate; the AP presents its <b>MIC/SUDI</b> certificate (or an LSC if you use local certificates). Both validate the chain <b>including dates</b> — a wrong clock breaks the join.', [['AP cert', 'Cisco MIC / SUDI or LSC'], ['WLC cert', 'self‑signed or CA']], 'sec'));
    st.push(S('ap', 'w', 'KEY EXCHANGE · FINISHED', 'Keys agreed', 'The AP completes the key exchange and both send Finished.', [['Cipher', 'AES‑GCM']], 'sec'));
    st.push(S('w', 'ap', 'DTLS ESTABLISHED', 'Encrypted control tunnel is up', 'Everything from now on — join, configuration, client events — is encrypted. Data‑plane DTLS is optional and off by default.', [['Control', 'DTLS (always)'], ['Data', 'DTLS optional']], 'sec'));
    st.push(S('ap', 'w', 'JOIN REQUEST', 'AP asks to join', 'The Join Request includes AP name, MAC, serial, model, software version, radio capabilities and the CAPWAP timers it supports.', [['Msg', 'Join Request'], ['Software', '17.9.4']], 'sec', 'Join'));
    st.push(S('w', 'ap', 'JOIN RESPONSE', 'Controller accepts', 'Result code “success”. The WLC checks the AP against licences, the AP authorisation list (MAC/serial/LSC) and the country code.', [['Result', 'Success'], ['AP auth list', 'passed']], 'sec'));
    st.push(S('w', 'ap', 'IMAGE DATA', 'Software check (only if versions differ)', 'If the AP image differs from the WLC’s, the AP <b>downloads</b> the new image over CAPWAP, reboots and starts again from step 1. <i>Best practice:</i> use <b>AP image pre‑download</b> before upgrading controllers so APs don’t all reboot at once.', [['AP image', '17.9.4 = WLC 17.9.4 → skip']], 'ctl'));
    st.push(S('ap', 'w', 'CONFIG STATUS REQ', 'AP asks for its configuration', 'The AP reports its name, location, AP mode and radios and asks the controller what to run.', [['AP name', 'AP‑Lobby‑01']], 'sec', 'Configuration'));
    st.push(S('w', 'ap', 'CONFIG STATUS RESP', flex ? 'Controller pushes config + FlexConnect profile' : 'Controller pushes configuration', flex
      ? 'The AP receives its <b>Policy / Site / RF tags</b>. The Site tag points to a <b>Flex profile</b> (native VLAN, VLAN→ACL mapping, local‑switching VLANs). Clients’ data will be switched <b>locally at the AP</b>, so branch traffic never crosses the WAN to the controller.'
      : 'The AP receives its <b>Policy tag</b> (which SSIDs and policies), <b>Site tag</b> (AP join profile: CAPWAP timers, mode) and <b>RF tag</b> (2.4/5 GHz RF profiles: data rates, power, channels). Without custom tags it gets the <i>default</i> tags.',
      [['Policy tag', 'PT‑HQ'], ['Site tag', flex ? 'ST‑Branch (Flex profile)' : 'ST‑HQ'], ['RF tag', 'RT‑HighDensity'], ['Radio', 'ch 36 / 20 MHz / power 4']], 'sec'));
    st.push(S('ap', 'w', 'CHANGE STATE: RUN', 'AP says it is ready', 'Change State Event Request: the AP moves to the <b>Run</b> state.', [['AP state', 'Run']], 'sec', 'Go live'));
    st.push(S('w', 'ap', 'CHANGE STATE RESP', 'Controller confirms', 'The AP is registered in the 9800 AP table (visible in “show ap summary”).', [['9800 AP table', 'Registered']], 'sec'));
    st.push(S('ap', 'ap', 'RADIOS ON', 'AP starts beaconing', 'Radios turn on and the SSIDs from the policy tag start broadcasting beacons — clients can now join.', [['SSIDs', 'Corp‑WiFi, Guest']], 'ctl'));
    st.push(S('ap', 'w', 'ECHO REQUEST', 'Heartbeat every 30 seconds', 'The AP and WLC exchange Echo packets. If echoes stop (default: after a few misses) the AP assumes the controller is gone and re‑runs discovery — Flex APs keep local clients running meanwhile.', [['Interval', '30 s'], ['Retries', '5']], 'ctl'));
    st.push(S('w', 'ap', 'ECHO RESPONSE', 'Healthy', 'The tunnel stays up; statistics, RRM measurements and client events keep flowing.', [['Status', 'Up']], 'ctl'));
    return st;
  }
  function failSteps() {
    const A3 = [{ id: 'c', label: 'Clients', sub: '' }, { id: 'ap', label: 'Access Point', sub: 'primary: WLC‑1' }, { id: 'w1', label: 'WLC‑Primary', sub: '192.168.1.5' }, { id: 'w2', label: 'WLC‑Secondary', sub: '192.168.2.5' }];
    return { actors: A3, steps: [
      S('ap', 'w1', 'ECHO', 'Normal: heartbeat to the primary', 'All is well. Clients are served and the tunnel is healthy.', [['State', 'Run']], 'ctl', 'Normal'),
      S('w1', 'ap', 'ECHO RESP', 'Primary answers', 'Every 30 s.', [], 'ctl'),
      S('w1', 'w1', 'FAILURE', 'Primary controller fails', 'Power loss, uplink cut or crash. <i>With a 9800 SSO HA pair the standby takes over in seconds and APs stay joined — none of what follows happens.</i>', [['Cause', 'link down']], 'lost', 'Failure'),
      S('ap', 'w1', 'ECHO (NO REPLY)', 'AP retries — silence', 'The AP sends echoes (5 retries). No answer.', [['Retries', '5']], 'ctl'),
      S('ap', 'c', 'CLIENTS DROPPED', 'CAPWAP is down', 'In <b>local mode</b> clients are dropped because the AP can no longer forward their traffic. <b>FlexConnect APs with local switching</b> keep existing clients connected (standalone mode).', [['Local mode', 'clients drop'], ['FlexConnect', 'local clients stay']], 'lost'),
      S('ap', 'w2', 'DISCOVERY REQ', 'AP tries the secondary', 'It walks its preference list: primary (failed) → <b>secondary</b>.', [['Target', 'WLC‑Secondary']], 'req', 'Fail over'),
      S('w2', 'ap', 'DISCOVERY RESP', 'Secondary answers', 'It offers capacity to take over.', [['APs joined', '120 / 500']], 'res'),
      S('ap', 'w2', 'DTLS', 'New DTLS tunnel', 'A fresh DTLS handshake with the secondary.', [['Time', '~2 s']], 'sec'),
      S('ap', 'w2', 'JOIN REQ', 'Join the secondary', 'Same join as before — and the secondary must have the same tags/config (use matching AP groups or a mobility group).', [['Result', 'Success']], 'sec'),
      S('w2', 'ap', 'CONFIG', 'Configuration pushed', 'Policy/Site/RF tags are applied.', [['Tags', 'PT‑HQ / ST‑HQ / RT‑HD']], 'sec'),
      S('ap', 'c', 'CLIENTS RE‑JOIN', 'Service restored', 'Clients re‑associate. Typical outage without HA: 30–120 s. <b>Best practice:</b> 9800 SSO pair for the primary site, N+1 secondary for disaster recovery.', [['Outage', '30–120 s']], 'res'),
    ] };
  }
  const apFlow = Flow($('#apFlow'));
  tabs($('#apTabs'), ['Local mode (central switching)', 'FlexConnect (local switching)', 'Controller fails — failover'], i => {
    if (i === 2) { const f = failSteps(); apFlow.load({ actors: f.actors, steps: f.steps, intro: 'Controller failover', introText: 'What happens to APs and clients when the primary WLC dies — and how to avoid it.' }); }
    else apFlow.load({ actors: AA, steps: apSteps(i === 1), intro: i ? 'FlexConnect AP joins the 9800' : 'A local‑mode AP joins the 9800', introText: 'Phases: boot & IP → find the controller → DTLS → join → configuration → go live. Click Play.' });
  });

  /* tag model */
  (() => {
    const T = [
      { id: 'pol', n: 'Policy tag', c: '#5ac8fa', sub: 'WHAT the AP offers', d: 'Maps <b>WLAN profiles</b> (SSID + security) to <b>policy profiles</b> (VLAN, ACL, QoS, AAA override, session timeout). Think: “Which SSIDs does this AP broadcast and how are their clients treated?”', cli: 'wireless profile policy PP-Corp\n vlan 20\n no shutdown\nwireless tag policy PT-HQ\n wlan Corp-WiFi policy PP-Corp' },
      { id: 'site', n: 'Site tag', c: '#30d158', sub: 'WHERE the AP lives', d: 'Contains the <b>AP join profile</b> (CAPWAP timers, retransmits, SSH/telnet, AP syslog, LAG) and, for branches, a <b>Flex profile</b> (native VLAN, local switching VLANs, VLAN‑ACL map). Local mode vs FlexConnect is decided by this tag (“local site” on/off).', cli: 'wireless profile ap join APJP-HQ\n ...\nwireless tag site ST-HQ\n ap-profile APJP-HQ' },
      { id: 'rf', n: 'RF tag', c: '#ff9f0a', sub: 'HOW the radios behave', d: 'Selects an <b>RF profile</b> for the 2.4 GHz and 5 GHz radios: mandatory/supported data rates, TX power min/max, DCA channel list, coverage hole detection, high‑density options.', cli: 'wireless tag rf RT-HD\n 24ghz-rf-policy RFP-24-HD\n 5ghz-rf-policy RFP-5-HD' },
    ];
    const card = $('#tagCard');
    card.innerHTML = `<div class="tagrow"><div class="tcol">${T.map(t => `<button class="tgbtn" data-id="${t.id}" style="--c:${t.c}"><b>${t.n}</b><small>${t.sub}</small></button>`).join('')}</div><div class="tarrow">→</div><div class="tap"><div class="tapi"></div><b>AP</b><small>gets all three</small></div></div><div class="tdet" id="tdet"></div><p class="tnote">APs without assigned tags get the <b>default‑policy‑tag</b>, <b>default‑site‑tag</b> and <b>default‑rf‑tag</b>. Assign with <code>ap &lt;mac&gt;</code> → <code>policy-tag … / site-tag … / rf-tag …</code> or via <b>tag rules</b> (regex on AP name) for automation.</p>`;
    const show = id => { const t = T.find(x => x.id === id); $$('.tgbtn', card).forEach(b => b.classList.toggle('on', b.dataset.id === id)); $('#tdet').style.setProperty('--c', t.c); $('#tdet').innerHTML = `<h4>${t.n}</h4><p>${t.d}</p><pre>${esc(t.cli)}</pre><small>Syntax abridged — check your IOS‑XE release.</small>`; };
    $$('.tgbtn', card).forEach(b => { b.onclick = () => show(b.dataset.id); b.onmouseenter = () => show(b.dataset.id); }); show('pol');
  })();
  $('#trbl').innerHTML = `<ol class="chk">${[
    ['Power &amp; link', 'PoE class sufficient (802.3at/bt)? Port up, correct access VLAN (or trunk + native VLAN for Flex)?'],
    ['IP address', 'Is DHCP offering in the AP VLAN, with free leases and a reachable gateway? Verify on the AP console / switch.'],
    ['Discovery method', 'Option 43 correctly formatted (type 0xF1, 4×N length), or DNS record CISCO‑CAPWAP‑CONTROLLER, or a static primary set on the AP.'],
    ['Firewall / ACL / MTU', 'UDP <b>5246</b> (control) and <b>5247</b> (data) allowed AP → WLC; ICMP; path MTU ≥ 1500 (CAPWAP adds ~60 B, large frames fragment). Mobility uses UDP 16666/16667.'],
    ['Time &amp; certificates', 'DTLS validates certificates and dates. Wrong clock on WLC or AP = “certificate not yet valid”. Use <b>NTP</b> on the 9800. Check AP authorisation list (MAC/serial) and LSC if used.'],
    ['Licence, capacity &amp; model', 'Licence level and platform AP limit not exceeded? AP model supported by this IOS‑XE release? Country/regulatory domain matches the AP’s?'],
    ['Software mismatch', 'AP is stuck downloading an image: check bandwidth, MTU, and use pre‑download for upgrades.'],
    ['Joined but no SSID', 'No policy tag (or WLAN disabled), radios shut, wrong RF tag, or AP in monitor/sniffer mode.'],
  ].map(([a, b]) => `<li><b>${a}</b><span>${b}</span></li>`).join('')}</ol><p class="tnote">Handy on the 9800: <code>show ap summary</code>, <code>show ap join stats summary</code>, and the GUI <b>Monitoring → Wireless → AP Statistics → Join Statistics</b> (last disconnect reason per AP).</p>`;

  /* ═════════ E · roaming ═════════ */
  const RA = [{ id: 'c', label: 'Roaming client', sub: 'walking →' }, { id: 'a1', label: 'AP‑1', sub: 'ch 36 · −72 dBm' }, { id: 'a2', label: 'AP‑2', sub: 'ch 100 · −58 dBm' }, { id: 'w', label: 'Catalyst 9800 WLC', sub: '' }, { id: 'r', label: 'ISE (RADIUS)', sub: '' }];
  const roamPre = (kv) => {
    const p = [];
    if (kv) {
      p.push(S('a1', 'c', '11k NEIGHBOR REPORT', '802.11k: AP shares its neighbours', 'At association time (or on request) AP‑1 sends a <b>Neighbor Report</b>: “my neighbours are AP‑2 on channel 100, AP‑3 on channel 149”. The client scans <b>only those channels</b> instead of all 25+ — saving 100s of ms.', [['Action frame', 'Radio Measurement: Neighbor Report'], ['List', 'AP‑2 ch100, AP‑3 ch149']], 'ctl', 'Before the roam'));
      p.push(S('a1', 'c', '11v BSS TRANSITION', '802.11v: AP suggests moving', '“The signal is getting weak — please try AP‑2.” It is a <i>suggestion</i>, not an order (unless “disassociation imminent” is set). Many clients respect it; some ignore it (sticky clients).', [['Action frame', 'BSS Transition Management Request'], ['Candidate', 'AP‑2 (−58 dBm)']], 'ctl'));
    }
    p.push(S('c', 'c', 'DECIDES TO ROAM', 'The client — not the network — decides', 'Typical triggers: RSSI below about <b>−70…−75 dBm</b>, many retries/low data rate, lost beacons. Every vendor’s algorithm differs, which is why roaming complaints are often client‑specific.', [['Trigger', 'RSSI −72 dBm'], ['Candidate AP', 'AP‑2 −58 dBm']], 'ctl', kv ? undefined : 'Before the roam'));
    return p;
  };
  function roamSteps(kind) {
    const st = [];
    if (kind === 0) {
      st.push(...roamPre(false));
      st.push(S('c', 'a2', 'PROBE REQ', 'Scan for a better AP', 'Without 802.11k the client must scan many channels on its own — 50–200 ms of not talking to anyone.', [['Channels scanned', '36…165']], 'req', 'Reassociation'));
      st.push(S('a2', 'c', 'PROBE RESP', 'AP‑2 answers', 'The client picks AP‑2.', [], 'res'));
      st.push(S('c', 'a2', 'AUTH + REASSOC REQ', 'Authentication + Reassociation', 'Open authentication then a <b>Reassociation Request</b> — it names the previous AP (BSSID) so the network can move the session.', [['Subtype', '2 Reassociation Request'], ['Current AP', 'AP‑1']], 'req'));
      st.push(S('a2', 'c', 'REASSOC RESP', 'Reassociated', 'Linking is done. But no keys yet…', [['Status', 'Success']], 'res'));
      st.push(S('a2', 'w', 'CLIENT NOTIFY', 'AP‑2 tells the controller', 'The WLC finds the client already exists (intra‑controller roam) and moves the session to AP‑2.', [['Roam type', 'Intra‑controller']], 'ctl', 'Full re‑authentication'));
      st.push(S('w', 'r', 'ACCESS‑REQUEST', 'Full 802.1X again', 'With no caching the whole EAP exchange (5–10 round trips to ISE!) runs again. This is the slow part.', [['EAP', 'TLS / PEAP — full']], 'req'));
      st.push(S('r', 'w', 'ACCESS‑ACCEPT', 'ISE accepts again', 'A new MSK is derived.', [['Result', 'Accept']], 'res'));
      st.push(S('a2', 'c', '4‑WAY HANDSHAKE', '4‑way handshake', 'Four more frames to create the PTK with AP‑2.', [['Frames', 'M1–M4']], 'sec'));
      st.push(S('c', 'c', 'GAP ≈ 500 ms+', 'Data resumes — after a pause', 'A voice call would clip, a video call stutter. This is why every real network enables fast roaming.', [['Typical gap', '300–800 ms']], 'lost'));
    } else if (kind === 1) {
      st.push(...roamPre(true));
      st.push(S('c', 'a2', 'REASSOC REQ + PMKID', 'Reassociation with a PMKID', 'The client includes the <b>PMKID</b> — a hash identifying the cached PMK from its last authentication. With <b>OKC</b> (Opportunistic Key Caching) the controller can use that PMK on any AP.', [['PMKID', '16‑byte hash of PMK+MACs'], ['Feature', 'PMKID caching / OKC']], 'req', 'Reassociation'));
      st.push(S('a2', 'w', 'CLIENT NOTIFY', 'AP‑2 tells the controller', 'The controller looks up the PMKID in its cache.', [['Cache', 'HIT']], 'ctl'));
      st.push(S('w', 'w', 'PMK FOUND', '802.1X is skipped', 'No RADIUS needed! Because the PMK is cached, the expensive EAP exchange is completely avoided.', [['RADIUS round trips', '0']], 'ctl'));
      st.push(S('a2', 'c', 'REASSOC RESP', 'Reassociated', 'Success.', [], 'res'));
      st.push(S('a2', 'c', '4‑WAY HANDSHAKE', 'Only the 4‑way handshake remains', 'Four frames over the air to derive a new PTK for AP‑2.', [['Frames', 'M1–M4']], 'sec', 'Keys'));
      st.push(S('c', 'c', 'GAP ≈ 50–150 ms', 'Data resumes quickly', 'Good for data; borderline for voice. <i>Caveat:</i> OKC is not supported by all clients (notably some Apple devices use 11r instead).', [['Typical gap', '50–150 ms']], 'ctl'));
    } else if (kind === 2) {
      st.push(...roamPre(true));
      st.push(S('c', 'a2', 'FT AUTH REQUEST', '802.11r: FT Authentication (over the air)', 'The client sends a Fast Transition authentication carrying its <b>SNonce</b>, the <b>mobility domain ID</b> and the PMK‑R1 name. It talks <i>directly</i> to AP‑2 while still associated to AP‑1.', [['Auth algorithm', '2 (Fast BSS Transition)'], ['MDID', 'same on all APs'], ['PMKR0Name', 'identifies the key holder']], 'req', 'Fast Transition'));
      st.push(S('a2', 'w', 'PMK‑R1 REQUEST', 'AP‑2 gets its key', '11r keys are hierarchical: the controller holds <b>PMK‑R0</b> (R0KH) and derives a <b>PMK‑R1</b> for each AP (R1KH). On the 9800 the key is pushed or pulled in a few milliseconds.', [['Key holder R0KH', '9800'], ['Key', 'PMK‑R1 for AP‑2']], 'sec'));
      st.push(S('w', 'a2', 'PMK‑R1 KEY', 'Key delivered', 'AP‑2 now holds a key bound to this client.', [], 'sec'));
      st.push(S('a2', 'c', 'FT AUTH RESPONSE', 'AP‑2 answers (ANonce + MIC)', 'AP‑2 returns its <b>ANonce</b> and a MIC — the 4‑way handshake’s first two messages are <i>folded into</i> these authentication frames.', [['ANonce', 'included'], ['MIC', 'valid']], 'sec'));
      st.push(S('c', 'a2', 'REASSOC REQ (FT)', 'Reassociation Request (FTIE)', 'The reassociation carries the third handshake message’s job: MIC and key confirmation.', [['FTIE', 'MIC + SNonce']], 'sec'));
      st.push(S('a2', 'c', 'REASSOC RESP (FT)', 'Reassociation Response (GTK/IGTK)', 'The response delivers the GTK/IGTK. <b>Keys are installed — no 4‑way handshake and no RADIUS.</b>', [['Result', 'Keys installed']], 'sec'));
      st.push(S('c', 'c', 'GAP < 50 ms', 'Seamless roam', 'Fast enough for voice (target &lt; 50 ms). On the 9800 use <b>Adaptive 11r</b> to stay compatible with clients that dislike FT in the beacon.', [['Typical gap', '&lt; 50 ms']], 'ctl'));
    } else {
      st.length = 0;
      return { actors: [{ id: 'c', label: 'Client', sub: '10.10.20.55' }, { id: 'a1', label: 'AP‑1', sub: 'on WLC‑A' }, { id: 'a2', label: 'AP‑2', sub: 'on WLC‑B' }, { id: 'w1', label: 'WLC‑A (anchor)', sub: 'subnet 10.10.20.0/24' }, { id: 'w2', label: 'WLC‑B (foreign)', sub: 'subnet 10.10.30.0/24' }], steps: [
        S('c', 'c', 'DECIDES TO ROAM', 'Client walks into a zone served by another controller', 'AP‑2 belongs to WLC‑B. The client still believes it is on its old network and wants to keep its IP.', [['From', 'WLC‑A'], ['To', 'WLC‑B']], 'ctl', 'Reassociate'),
        S('c', 'a2', 'REASSOC REQ', 'Reassociation to AP‑2', 'Same frame as before — the client has no idea there are two controllers.', [['Current AP', 'AP‑1']], 'req'),
        S('a2', 'w2', 'CLIENT NOTIFY', 'WLC‑B does not know this client', 'It checks its mobility peers to see if another controller has the session.', [['Mobility group', 'HQ‑MG']], 'ctl', 'Mobility handoff'),
        S('w2', 'w1', 'MOBILITY HANDOFF REQ', 'Handoff request to WLC‑A', 'Sent over the <b>mobility tunnel</b> (control UDP 16666, data UDP 16667, protected with DTLS). WLC‑B asks: “who owns this client?”', [['Port', 'UDP 16666'], ['Peer', 'WLC‑A']], 'req'),
        S('w1', 'w2', 'HANDOFF RESPONSE', 'WLC‑A sends the client context', 'The PMK, keys, VLAN/ACL/QoS policy and IP are transferred, so the client does <b>not</b> need to re‑authenticate.', [['Context', 'PMK, policy, IP'], ['Result', 'Success']], 'sec'),
        S('w2', 'w2', 'L2 OR L3?', 'Same subnet or different?', '<b>Layer‑2 roam</b> (same VLAN/subnet on both): the session simply moves to WLC‑B. <b>Layer‑3 roam</b> (different subnet): the client keeps its IP, so WLC‑A stays the <b>anchor</b> and WLC‑B becomes the <b>foreign</b> controller.', [['This case', 'L3 roam']], 'ctl'),
        S('a2', 'c', 'REASSOC RESP', 'Client reassociated', 'The client is online on AP‑2 with its old IP.', [['Status', 'Success']], 'res', 'Traffic'),
        S('w2', 'w1', 'MOBILITY TUNNEL DATA', 'Traffic is tunnelled foreign → anchor', 'All of the client’s packets go through the mobility tunnel back to the anchor so they exit in the original VLAN. This is why L3 roams add some latency — design for L2 where possible.', [['Tunnel', 'UDP 16667'], ['Egress', 'anchor VLAN 20']], 'sec'),
      ] };
    }
    return { actors: RA, steps: st };
  }
  const SCORE = [['Full 802.1X re‑auth', 600, 'No', 'var(--lost)'], ['OKC / PMK cache', 120, 'Marginal', 'var(--ctl)'], ['802.11r Fast Transition', 40, 'Yes', 'var(--sec)'], ['Inter‑controller roam', 150, 'Depends on L2/L3', 'var(--ctl)']];
  const roamFlow = Flow($('#roamFlow'));
  tabs($('#roamTabs'), ['No fast roaming (full 802.1X)', 'OKC / PMKID caching', '802.11r Fast Transition', 'Inter‑controller (L2 / L3)'], i => {
    const c = roamSteps(i); roamFlow.load({ actors: c.actors, steps: c.steps, intro: SCORE[i][0], introText: 'Press Play and watch how many messages are needed before data can flow again.' });
    $('#roamScore').innerHTML = `<div class="rs"><span>Typical interruption</span><b>${i === 3 ? '100–300' : '~' + SCORE[i][1]} ms</b><div class="gbar"><i style="width:${Math.min(100, SCORE[i][1] / 8)}%;background:${SCORE[i][3]}"></i></div></div><div class="rs"><span>Voice‑safe (&lt; 50 ms)?</span><b style="color:${SCORE[i][3]}">${SCORE[i][2]}</b></div>`;
  }, 2);
  $('#kvr').innerHTML = `<div class="kv"><b>11k</b><h5>Know your neighbours</h5><p>The AP gives the client a short list of nearby APs and channels, so it scans less. Enable on the WLAN (“Assisted Roaming Prediction / Neighbor list”).</p></div>
    <div class="kv"><b>11v</b><h5>Gentle steering</h5><p>BSS Transition Management lets the AP <i>suggest</i> a better AP, or warn the client it is about to be disassociated. Helps with sticky clients; also enables WNM sleep for battery saving.</p></div>
    <div class="kv"><b>11r</b><h5>Fast key setup</h5><p>Keys are prepared for the target AP, so reassociation completes in ~1–2 round trips. Choose <b>Disabled / Enabled / Adaptive</b> on the 9800 WLAN — Adaptive suits mixed Apple/Android/legacy clients.</p></div>
    <div class="kv wide"><h5>Roaming rules of thumb</h5><p>• The <b>client</b> decides when to roam — you can only make roaming <i>easier</i>. • Overlap cells by ~15–20 % at −67 dBm so there is always a better AP nearby. • Use the same SSID, security and mobility domain on all APs. • Keep roaming inside one VLAN/subnet where possible. • Avoid very high TX power: it makes clients hold on to a far AP (“sticky”) because they hear it loudly but it cannot hear them.</p></div>`;

  /* ═════════ F · security ═════════ */
  const SEC = [
    ['Open', 'None', 'None', 'Open', 'No protection — anyone can sniff', 'Guest with captive portal (CWA)'],
    ['Enhanced Open (OWE)', 'None (no password)', 'AES per‑client keys', 'OWE', 'Stops passive sniffing; no identity check', 'Coffee‑shop style guest, better than Open'],
    ['WPA2‑Personal', 'Pre‑shared key', 'AES‑CCMP', 'PSK', 'Offline dictionary attack possible; shared secret', 'Home, small IoT devices'],
    ['WPA3‑Personal', 'SAE (Dragonfly)', 'AES‑CCMP/GCMP, PMF required', 'SAE', 'Resists offline cracking; forward secrecy', 'Modern home/SMB, IoT that supports it'],
    ['WPA2‑Enterprise', '802.1X / EAP', 'AES‑CCMP', '802.1X', 'Unique keys per user; EAP‑TLS strongest', 'Corporate staff'],
    ['WPA3‑Enterprise', '802.1X / EAP, PMF required', 'AES‑CCMP/GCMP', '802.1X‑SHA256', 'Stronger key derivation, mandatory PMF', 'Corporate — preferred'],
    ['WPA3‑Enterprise 192‑bit', '802.1X, EAP‑TLS only', 'GCMP‑256, ECDH/ECDSA P‑384', 'SUITEB192‑1X', 'CNSA‑level crypto', 'Government, high security'],
    ['Transition mode', 'PSK + SAE together', 'CCMP', 'PSK + SAE', 'Compatibility; downgrade risk', 'Mixed estate while migrating'],
  ];
  $('#secTbl').innerHTML = `<thead><tr><th>Mode</th><th>Authentication</th><th>Encryption</th><th>9800 AKM</th><th>Strength</th><th>Best for</th></tr></thead><tbody>${SEC.map(r => `<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td><td><code>${r[3]}</code></td><td class="info">${r[4]}</td><td class="info">${r[5]}</td></tr>`).join('')}</tbody>`;
  const KEYS = [
    { n: 'WPA2‑PSK', root: ['Passphrase + SSID', 'PBKDF2‑HMAC‑SHA1, 4096 rounds'], pmk: 'Same on every device. Anyone who knows the password — or cracks a captured handshake offline — can derive everyone’s PTK.' },
    { n: 'WPA3‑SAE', root: ['Password', 'Dragonfly commit / confirm with random values'], pmk: 'A <b>different</b> PMK each session. A passive attacker learns nothing, and each guess needs a live exchange; past sessions stay safe (forward secrecy).' },
    { n: '802.1X (EAP)', root: ['EAP method (TLS / PEAP)', 'ISE returns the MSK in Access‑Accept'], pmk: 'PMK = first 256 bits of the <b>MSK</b>. Unique per client and session; no shared password to leak.' },
    { n: '802.11r (FT)', root: ['PMK‑R0 (held by the controller)', 'PMK‑R1 derived per AP'], pmk: 'The controller pre‑derives a key for each AP so the 4‑way handshake is folded into the FT authentication.' },
  ];
  function keyViz(i) {
    const k = KEYS[i];
    $('#keyViz').innerHTML = `<div class="kchain"><div class="kb"><small>Starting secret</small><b>${k.root[0]}</b><em>${k.root[1]}</em></div><div class="ka">→</div>
      <div class="kb hi"><small>Master key</small><b>PMK</b><em>256 bits</em></div><div class="ka">+ ANonce + SNonce + AP MAC + client MAC<br>→</div>
      <div class="kb hi2"><small>Pairwise key</small><b>PTK</b><em>per client, per session</em></div>
      <div class="ka">splits into</div><div class="kout"><span><b>KCK</b>128 bit · MIC of EAPOL frames</span><span><b>KEK</b>128 bit · encrypts the GTK in M3</span><span><b>TK</b>128 bit · encrypts unicast data (AES)</span></div></div>
      <p class="knote">${k.pmk}</p><p class="knote"><b>Group keys:</b> the AP creates a <b>GTK</b> for broadcast/multicast (delivered in message 3) and, with PMF, an <b>IGTK</b> to protect broadcast management frames.</p>`;
  }
  tabs($('#keyTabs'), KEYS.map(k => k.n), keyViz);
  $('#attacks').innerHTML = `<h3>Threats &amp; defences</h3><div class="atk">${[
    ['Deauth / disassoc flood', 'Attacker forges management frames to kick clients off.', '<b>PMF (802.11w)</b> — signs them. Required in WPA3.'],
    ['Evil twin / rogue AP', 'A fake AP with your SSID lures clients.', '802.1X with <b>server certificate validation</b>; WIPS / rogue detection on the 9800.'],
    ['Handshake / PMKID cracking', 'Captured WPA2‑PSK handshake cracked offline.', '<b>WPA3‑SAE</b> or a long random PSK; prefer 802.1X.'],
    ['Passive sniffing on open Wi‑Fi', 'Anyone can read unencrypted traffic.', '<b>OWE</b>, VPN, or HTTPS everywhere.'],
    ['KRACK (2017)', 'Replays handshake message 3 to reinstall keys.', 'Patched clients and APs; PMF helps.'],
    ['Legacy crypto', 'WEP and TKIP are broken.', 'Disable them — CCMP/GCMP only.'],
  ].map(a => `<div class="at"><h5>${a[0]}</h5><p>${a[1]}</p><p class="df">${a[2]}</p></div>`).join('')}</div>`;

  /* ═════════ G · frames ═════════ */
  $('#ftypes').innerHTML = `<h3>Frame families (Type bits)</h3><div class="ft3">
    <div class="ft" style="--c:#64d2ff"><h5>Management <small>type 00</small></h5><p>Joining, leaving and announcing networks.</p><div class="fchips"><span><b>8</b>Beacon</span><span><b>4</b>Probe Req</span><span><b>5</b>Probe Resp</span><span><b>11</b>Authentication</span><span><b>0</b>Assoc Req</span><span><b>1</b>Assoc Resp</span><span><b>2</b>Reassoc Req</span><span><b>10</b>Disassoc</span><span><b>12</b>Deauth</span><span><b>13</b>Action (11k/v/r, BA)</span></div></div>
    <div class="ft" style="--c:#ff9f0a"><h5>Control <small>type 01</small></h5><p>Short frames that manage access to the air.</p><div class="fchips"><span><b>11</b>RTS</span><span><b>12</b>CTS</span><span><b>13</b>ACK</span><span><b>8</b>Block Ack Req</span><span><b>9</b>Block Ack</span><span><b>10</b>PS‑Poll</span></div></div>
    <div class="ft" style="--c:#30d158"><h5>Data <small>type 10</small></h5><p>Carry user traffic (LLC/SNAP + IP).</p><div class="fchips"><span><b>0</b>Data</span><span><b>8</b>QoS Data</span><span><b>4</b>Null (power save)</span><span><b>12</b>QoS Null</span></div></div></div>`;

  const f = (name, bits, desc, ex, ab) => ({ name, bits, desc, ex, ab: ab || name });
  const MAC_HDR = [f('Frame Control', 16, 'Type, subtype and flags for this frame (see the “Frame Control” tab).', '0x8000 (Beacon)', 'Frame Control'), f('Duration / ID', 16, 'Microseconds the medium will be busy — other stations set their NAV timer from it. In PS‑Poll it holds the AID.', '0', 'Duration'),
    f('Address 1 (RA / DA)', 48, 'Receiver address: who should hear this frame next on the air.', 'ff:ff:ff:ff:ff:ff', 'Address 1'), f('Address 2 (TA / SA)', 48, 'Transmitter address: who just sent it.', '00:11:22:33:44:55', 'Address 2'), f('Address 3 (BSSID)', 48, 'BSSID or the final source/destination depending on To/From DS.', '00:11:22:33:44:55', 'Address 3'), f('Sequence Control', 16, 'Fragment number (4 bits) + sequence number (12 bits) to detect duplicates after retries.', 'seq 1048', 'Seq Ctrl')];
  const HDRS = [
    { id: 'fc', name: 'Frame Control', layer: 'First 2 bytes of every frame', size: '2 B', blurb: 'The sixteen bits that tell every receiver what kind of frame this is and how to treat it.', fields: [
      f('Protocol Version', 2, 'Always 0.', '0', 'Ver'), f('Type', 2, '00 management, 01 control, 10 data.', '10 (Data)', 'Type'), f('Subtype', 4, 'Which management/control/data frame: e.g. Beacon = 8, ACK = 13, QoS Data = 8.', '1000 (QoS Data)', 'Subtype'),
      f('To DS', 1, 'Frame is going <b>to</b> the distribution system (client → AP).', '1', 'To'), f('From DS', 1, 'Frame is coming <b>from</b> the distribution system (AP → client).', '0', 'Fr'), f('More Fragments', 1, 'More fragments of this packet follow.', '0', 'MF'),
      f('Retry', 1, 'This frame is a retransmission. A high retry % means interference or low signal.', '0', 'Rt'), f('Power Mgmt', 1, 'Sender will sleep after this frame; the AP buffers data for it.', '0', 'PM'), f('More Data', 1, 'AP tells a sleeping client more frames are buffered (TIM).', '0', 'MD'),
      f('Protected Frame', 1, 'The body is encrypted (and for management frames, PMF‑protected).', '1', 'Pr'), f('+HTC / Order', 1, 'Order of frames strictly kept / HT‑Control field present.', '0', 'O')] },
    { id: 'data', name: 'QoS Data frame', layer: 'Data', size: '26–34 B + body', blurb: 'The workhorse: carries your IP packets, with priority information for WMM.', fields: [
      ...MAC_HDR.slice(0, 2), ...MAC_HDR.slice(2).map(x => x), f('Address 4 (WDS only)', 48, 'Only present when both To DS and From DS = 1 (mesh / bridge). Absent in normal client frames.', 'absent', 'Address 4 (mesh only)'),
      f('QoS Control', 16, 'Traffic ID (TID 0–7) → access category: voice, video, best effort, background (WMM), plus ack policy and A‑MSDU flag.', 'TID 6 (Voice)', 'QoS Control'), f('HT Control (opt.)', 32, 'Present in some HT/VHT/HE frames for link adaptation.', 'absent', 'HT Control (optional)'),
      f('Frame body', 32, 'LLC/SNAP header (8 bytes) followed by the IP packet. Up to 2304 bytes (7981 with A‑MSDU). Encrypted when Protected = 1, with CCMP header (8 B) + MIC (8 B).', 'IP packet…', 'Frame body (LLC/SNAP + IP) …'), f('FCS', 32, 'CRC‑32 so the receiver can detect bit errors; a bad FCS means no ACK → retry.', '0x7a3c91ee', 'FCS')] },
    { id: 'beacon', name: 'Beacon', layer: 'Management', size: '~100–300 B', blurb: 'The AP’s heartbeat, sent every 102.4 ms. Its body is a fixed part plus a list of <b>information elements</b> (IEs).', fields: [
      ...MAC_HDR.slice(0, 2), f('Destination (DA)', 48, 'Always broadcast ff:ff:ff:ff:ff:ff.', 'ff:ff:ff:ff:ff:ff', 'Destination = broadcast'), f('Source (SA)', 48, 'The AP’s radio MAC for this SSID (BSSID).', '00:11:22:33:44:55', 'Source (AP BSSID)'), f('BSSID', 48, 'Identifies the SSID on this radio; each SSID on an AP has its own.', '00:11:22:33:44:55', 'BSSID'), MAC_HDR[5],
      f('Timestamp', 64, 'AP’s microsecond timer; clients use it to stay synchronised (TSF).', '0x000000A3B2C1D0E4', 'Timestamp (TSF, 8 bytes)'), f('Beacon Interval', 16, 'In time units (1 TU = 1.024 ms). Default 100 → 102.4 ms.', '100', 'Beacon interval'), f('Capability Info', 16, 'ESS/IBSS, privacy (encryption), short preamble, QoS, radio measurement…', '0x1511', 'Capability'),
      f('SSID (IE 0)', 32, 'The network name, up to 32 characters. A hidden SSID sends a zero‑length name.', 'Corp‑WiFi', 'SSID (IE 0)'), f('Supported rates (IE 1)', 32, 'Data rates; the “basic/mandatory” ones are marked. Disabling 1/2/5.5/11 Mbps shrinks cells and removes 802.11b airtime hogs.', '12*, 18, 24*, 36, 48, 54', 'Supported rates (IE 1)'),
      f('DS Parameter / Channel (IE 3)', 32, 'Primary channel of this BSS.', '36', 'DS / channel (IE 3)'), f('TIM (IE 5)', 32, 'Traffic Indication Map: tells sleeping clients which AIDs have buffered frames; includes DTIM count/period.', 'DTIM 1', 'TIM (IE 5)'), f('Country (IE 7)', 32, 'Regulatory domain and allowed channels/power.', 'US, 36‑48 17 dBm', 'Country (IE 7)'),
      f('RSN (IE 48)', 32, 'Security: group & pairwise ciphers, AKM list (PSK, SAE, 802.1X, FT…), PMF capable/required.', 'CCMP, AKM: 802.1X + FT', 'RSN (IE 48)'), f('HT / VHT / HE caps', 32, 'Wi‑Fi 4/5/6 capabilities: widths, streams, MCS, OFDMA, TWT, BSS colour.', 'HE 80 MHz 2SS', 'HT / VHT / HE caps'), f('FCS', 32, 'CRC‑32.', '0x…', 'FCS')] },
    { id: 'auth', name: 'Authentication body', layer: 'Management', size: '6 B + IEs', blurb: 'The fixed fields of an Authentication frame (after the MAC header).', fields: [
      f('Auth Algorithm', 16, '0 Open System, 1 Shared Key (WEP, obsolete), 2 Fast BSS Transition, 3 SAE.', '3 (SAE)', 'Auth algorithm'), f('Auth Transaction Seq', 16, 'Step number: 1 or 2 for Open; 1 = Commit, 2 = Confirm for SAE.', '1', 'Transaction seq'),
      f('Status Code', 16, '0 = success. Other values explain a failure (e.g. 1 unspecified, 15 challenge failed).', '0', 'Status code'), f('Information elements', 32, 'For SAE: group ID, scalar, element. For FT: RSN, MDIE, FTIE.', 'SAE commit…', 'IEs (SAE / FT)')] },
    { id: 'assoc', name: 'Association Request', layer: 'Management', size: '4 B + IEs', blurb: 'The client’s application to join the BSS.', fields: [
      f('Capability Info', 16, 'What the client supports (privacy, QoS, short slot, radio measurement).', '0x1531', 'Capability info'), f('Listen Interval', 16, 'How many beacons the client may sleep through before waking.', '10', 'Listen interval'),
      f('SSID (IE 0)', 32, 'Network the client wants to join.', 'Corp‑WiFi', 'SSID (IE 0)'), f('Supported rates', 32, 'Rates the client supports.', '6–54 + MCS', 'Supported rates'), f('RSN (IE 48)', 32, 'Chosen cipher + AKM, PMF flags, and optionally PMKID list.', 'CCMP, AKM 802.1X, PMKID', 'RSN (IE 48)'), f('HT/VHT/HE caps', 32, 'Client radio capabilities.', 'HE 2SS 80 MHz', 'HT / VHT / HE caps')] },
    { id: 'assocr', name: 'Association Response', layer: 'Management', size: '6 B + IEs', blurb: 'The AP’s answer, including the AID the client will use for power saving.', fields: [
      f('Capability Info', 16, 'AP’s capabilities.', '0x1511', 'Capability info'), f('Status Code', 16, '0 = success, 17 = AP cannot handle more clients, 12 = association denied, 40 = invalid IE.', '0', 'Status code'), f('Association ID (AID)', 16, 'Number 1–2007 used in TIM bitmaps. Top two bits are set to 1.', '0xC007 (AID 7)', 'AID'), f('Information elements', 32, 'Supported rates and the AP’s HT/VHT/HE operation fields.', 'rates, HE op', 'IEs')] },
    { id: 'rts', name: 'RTS', layer: 'Control', size: '20 B', blurb: 'Request To Send — reserves the air for a big frame (hidden‑node protection).', fields: [
      f('Frame Control', 16, 'Type 01 (control), subtype 1011.', '0x00B4', 'Frame Control'), f('Duration', 16, 'Time to reserve: CTS + data + ACK + SIFS gaps.', '3 ms', 'Duration'), f('RA', 48, 'Receiver address (the AP).', '00:11:22:33:44:55', 'RA (receiver)'), f('TA', 48, 'Transmitter address (the client).', 'aa:bb:cc:11:22:33', 'TA (transmitter)'), f('FCS', 32, 'CRC‑32.', '0x…', 'FCS')] },
    { id: 'ack', name: 'CTS / ACK', layer: 'Control', size: '14 B', blurb: 'Tiny frames with no source address — sent a SIFS (16 µs) after the frame they answer.', fields: [
      f('Frame Control', 16, 'CTS = subtype 1100, ACK = 1101.', '0x00D4 (ACK)', 'Frame Control'), f('Duration', 16, 'Remaining reservation time (0 in a final ACK).', '0', 'Duration'), f('RA', 48, 'Who the ACK/CTS is for. There is <b>no transmitter address</b> — the sender is implied by the timing.', 'aa:bb:cc:11:22:33', 'RA (receiver)'), f('FCS', 32, 'CRC‑32.', '0x…', 'FCS')] },
  ];
  const HS = { h: 0, sel: 0 };
  function layoutRows(fields) { const rows = [[]]; let used = 0; fields.forEach((fl, idx) => { let left = fl.bits, first = true; while (left > 0) { if (used === 32) { rows.push([]); used = 0; } const take = Math.min(left, 32 - used); rows[rows.length - 1].push({ idx, bits: take, first, last: take === left }); used += take; left -= take; first = false; } }); return rows; }
  function drawHdr() {
    const H = HDRS[HS.h];
    $('#hmeta').innerHTML = `<h3>${H.name}</h3><span class="chip"><b>Family</b>${H.layer}</span><span class="chip"><b>Size</b>${H.size}</span><p>${H.blurb}</p>`;
    const grid = $('#hgrid'); grid.innerHTML = '';
    layoutRows(H.fields).forEach((row, ri) => { const rd = document.createElement('div'); rd.className = 'hrow'; row.forEach(seg => { const fl = H.fields[seg.idx], d = document.createElement('button'); d.className = 'hf' + (seg.first ? '' : ' cont') + (seg.last ? '' : ' open') + (seg.idx === HS.sel ? ' sel' : ''); d.style.flex = `${seg.bits} 1 0`; d.style.minWidth = 0; d.dataset.i = seg.idx; d.style.setProperty('--hue', (seg.idx * 47) % 360); d.style.animationDelay = (ri * 40 + seg.idx * 8) + 'ms'; d.innerHTML = seg.first || seg.bits >= 8 ? `<span>${esc(fl.ab)}</span><em>${fl.bits}${fl.bits === 1 ? ' bit' : ' bits'}</em>` : ''; d.title = `${fl.name} — ${fl.bits} bits`; d.onclick = () => selField(seg.idx); rd.appendChild(d); }); grid.appendChild(rd); });
    selField(HS.sel);
  }
  function selField(i) {
    HS.sel = i; const H = HDRS[HS.h], fl = H.fields[i]; $$('#hgrid .hf').forEach(x => x.classList.toggle('sel', +x.dataset.i === i));
    $('#hdetail').innerHTML = `<div class="hd-top" style="--hue:${(i * 47) % 360}"><span class="hd-idx">${String(i + 1).padStart(2, '0')}</span><h4>${fl.name}</h4></div><div class="hd-size"><b>${fl.bits}</b> bit${fl.bits > 1 ? 's' : ''}${fl.bits >= 8 && fl.bits % 8 === 0 ? ` = ${fl.bits / 8} byte${fl.bits / 8 > 1 ? 's' : ''}` : ''} · field ${i + 1} of ${H.fields.length}</div><p>${fl.desc}</p><div class="hd-ex"><span>Example value</span><code>${esc(fl.ex)}</code></div><div class="hd-nav"><button class="btn mini" id="hPrev" ${i === 0 ? 'disabled' : ''}>‹ Previous</button><button class="btn mini" id="hNext" ${i === H.fields.length - 1 ? 'disabled' : ''}>Next ›</button></div>`;
    $('#hPrev').onclick = () => selField(i - 1); $('#hNext').onclick = () => selField(i + 1);
  }
  $('#ruler').innerHTML = Array.from({ length: 32 }, (_, i) => `<i>${i % 4 === 0 ? i : ''}</i>`).join('');
  $('#htabs').innerHTML = HDRS.map((h, i) => `<button class="${i === 0 ? 'on' : ''}" data-i="${i}">${h.name}</button>`).join('');
  $$('#htabs button').forEach(b => b.onclick = () => { HS.h = +b.dataset.i; HS.sel = 0; $$('#htabs button').forEach(x => x.classList.toggle('on', x === b)); drawHdr(); });
  drawHdr();

  /* four addresses */
  (() => {
    const T = { '00': { n: 'Management / IBSS', a: ['DA — destination', 'SA — source', 'BSSID', '—'], s: 'Between stations or AP ↔ client management frames.' }, '01': { n: 'AP → client (downlink)', a: ['RA = DA (the client)', 'TA = BSSID (the AP)', 'SA (original sender, e.g. a wired server)', '—'], s: 'The AP delivers a frame it received from the wired side.' }, '10': { n: 'Client → AP (uplink)', a: ['RA = BSSID (the AP)', 'TA = SA (the client)', 'DA (final destination, e.g. a server)', '—'], s: 'The client sends towards the wired network; the AP will forward to Address 3.' }, '11': { n: 'AP ↔ AP (mesh / WDS)', a: ['RA', 'TA', 'DA', 'SA'], s: 'Both To DS and From DS set: a wireless bridge link needs all four.' } };
    const card = $('#addrCard'); let to = 1, from = 0;
    const draw = () => { const k = `${to}${from}`, t = T[k], cols = ['#64d2ff', '#30d158', '#ff9f0a', '#bf5af2'];
      card.innerHTML = `<div class="addrctl"><label class="chk"><input type="checkbox" id="toDS" ${to ? 'checked' : ''}> To DS</label><label class="chk"><input type="checkbox" id="fromDS" ${from ? 'checked' : ''}> From DS</label><b>${t.n}</b></div>
        <div class="addrgrid">${t.a.map((a, i) => `<div class="ab" style="--c:${cols[i]};opacity:${a === '—' ? .35 : 1}"><small>Address ${i + 1}</small><b>${a}</b></div>`).join('')}</div><p>${t.s}</p>
        <div class="addrex"><small>Example — laptop <code>aa:bb:cc:11:22:33</code> pings a server <code>de:ad:be:ef:00:01</code> via AP <code>00:11:22:33:44:55</code></small><code>${k === '10' ? 'A1 = 00:11:22:33:44:55 · A2 = aa:bb:cc:11:22:33 · A3 = de:ad:be:ef:00:01' : k === '01' ? 'A1 = aa:bb:cc:11:22:33 · A2 = 00:11:22:33:44:55 · A3 = de:ad:be:ef:00:01' : k === '00' ? 'A1 = DA · A2 = SA · A3 = BSSID' : 'A1 = RA · A2 = TA · A3 = DA · A4 = SA'}</code></div>`;
      $('#toDS').onchange = e => { to = e.target.checked ? 1 : 0; draw(); }; $('#fromDS').onchange = e => { from = e.target.checked ? 1 : 0; draw(); }; };
    draw();
  })();
  $('#ies').innerHTML = `<h3>Information elements you will see in captures</h3><div class="iegrid">${[['0', 'SSID'], ['1', 'Supported Rates'], ['3', 'DS Parameter (channel)'], ['5', 'TIM'], ['7', 'Country'], ['11', 'QBSS Load (channel utilisation)'], ['45', 'HT Capabilities (Wi‑Fi 4)'], ['48', 'RSN (security)'], ['54', 'Mobility Domain (11r)'], ['55', 'Fast BSS Transition (11r)'], ['70', 'RM Enabled Caps (11k)'], ['191', 'VHT Capabilities (Wi‑Fi 5)'], ['255 ext 35', 'HE Capabilities (Wi‑Fi 6)'], ['221', 'Vendor specific (WMM, Cisco CCX…)']].map(a => `<span><b>${a[0]}</b>${a[1]}</span>`).join('')}</div>`;

  /* ═════════ H · air to wire ═════════ */
  const SEGC = { w: '#64d2ff', ccmp: '#bf5af2', eth: '#0a84ff', ip: '#30d158', tcp: '#ff9f0a', data: '#5ac8fa', cap: '#ff6482', udp: '#ffd60a', q: '#ac8e68', oip: '#8fd14f' };
  const sg = (k, name, b) => ({ k, name, b });
  const D = sg('data', 'HTTP data', 484), TCP = sg('tcp', 'TCP', 20), IP = sg('ip', 'IP', 20), FCS = sg('w', 'FCS', 4);
  const WSC = [
    { name: 'Central switching (Local mode)', rows: [
      { who: 'Client', where: 'Wi‑Fi radio', t: 'The client builds the frame', x: 'The laptop wraps its IP packet in an <b>802.11 data frame</b> (32 B: MAC header, QoS, LLC/SNAP) addressed To DS with Address 1 = AP BSSID, Address 3 = the real destination.', segs: [sg('w', '802.11', 32), IP, TCP, D, FCS] },
      { who: 'Air', where: 'RF channel', t: 'Encrypted over the air', x: 'The body is encrypted with AES‑CCMP: an 8‑byte CCMP header (packet number) and an 8‑byte MIC are added. Anyone listening sees only ciphertext.', segs: [sg('w', '802.11', 32), sg('ccmp', 'CCMP', 8), sg('data', 'IP+TCP+data (encrypted)', 524), sg('ccmp', 'MIC', 8), FCS] },
      { who: 'AP', where: 'Access point', t: 'AP decrypts and converts 802.11 → 802.3', x: 'The AP verifies the MIC, decrypts, and replaces the 802.11 header by a 14‑byte <b>Ethernet</b> header (DA/SA taken from the 802.11 addresses).', segs: [sg('eth', 'Ethernet', 14), IP, TCP, D, FCS] },
      { who: 'AP → WLC', where: 'CAPWAP tunnel', t: 'Wrapped in CAPWAP data (UDP 5247)', x: 'In central switching the AP adds <b>outer Ethernet + outer IP + UDP + CAPWAP (~16 B)</b> and sends the client frame to the controller. About <b>58 bytes</b> of overhead — plan MTU/fragmentation accordingly. Control traffic uses 5246 with DTLS.', segs: [sg('eth', 'Eth', 14), sg('oip', 'IP (AP→WLC)', 20), sg('udp', 'UDP 5247', 8), sg('cap', 'CAPWAP', 16), sg('eth', 'Inner Eth', 14), IP, TCP, D, FCS] },
      { who: 'WLC → wire', where: 'Wired network', t: 'Controller removes the tunnel, tags the VLAN', x: 'The 9800 strips the CAPWAP headers, applies policy (ACL, QoS, SGT) and forwards the frame into the client’s <b>VLAN</b> with an 802.1Q tag. The wired server sees an ordinary Ethernet frame.', segs: [sg('eth', 'Ethernet', 14), sg('q', '802.1Q', 4), IP, TCP, D, FCS] },
    ] },
    { name: 'FlexConnect (local switching)', rows: [
      { who: 'Client', where: 'Wi‑Fi radio', t: 'The client builds the frame', x: 'Same as before: an 802.11 data frame towards the AP.', segs: [sg('w', '802.11', 32), IP, TCP, D, FCS] },
      { who: 'Air', where: 'RF channel', t: 'Encrypted over the air', x: 'AES‑CCMP encryption protects the radio hop.', segs: [sg('w', '802.11', 32), sg('ccmp', 'CCMP', 8), sg('data', 'IP+TCP+data (encrypted)', 524), sg('ccmp', 'MIC', 8), FCS] },
      { who: 'AP', where: 'FlexConnect AP', t: 'AP decrypts, converts and tags locally', x: 'The AP decrypts and converts to Ethernet, then <b>tags the client’s VLAN itself</b> using the Flex profile’s VLAN mapping. No CAPWAP data tunnel is built.', segs: [sg('eth', 'Ethernet', 14), sg('q', '802.1Q', 4), IP, TCP, D, FCS] },
      { who: 'Branch switch', where: 'Local network', t: 'Straight onto the branch LAN', x: 'The frame goes directly into the branch network. Only control and management traffic (CAPWAP 5246) still goes to the controller — so branch traffic survives a WAN outage and never hair‑pins through the data centre.', segs: [sg('eth', 'Ethernet', 14), sg('q', '802.1Q', 4), IP, TCP, D, FCS] },
    ] },
  ];
  const WS = { sc: 0, step: -1, playing: false, tok: 0 };
  const sw = b => Math.round(Math.max(44, 22 + Math.sqrt(b) * 5.6));
  function wBuild() {
    const sc = WSC[WS.sc]; $('#wstack').innerHTML = sc.rows.map((r, i) => `<div class="wrow" data-i="${i}"><div class="wwho"><b>${r.who}</b><small>${r.where}</small></div><div class="wbar">${r.segs.map(s => `<span class="seg" style="--sc:${SEGC[s.k]};width:${sw(s.b)}px" title="${s.name}: ${s.b} B"><b>${s.name}</b><small>${s.b} B</small></span>`).join('')}</div></div>${i < sc.rows.length - 1 ? '<div class="warrow">↓</div>' : ''}`).join('');
    const used = new Map(); sc.rows.forEach(r => r.segs.forEach(s => used.set(s.name.replace(/ \(.*/, ''), SEGC[s.k])));
    $('#wlegend').innerHTML = [...used].map(([n, c]) => `<span><i style="background:${c}"></i>${n}</span>`).join('');
  }
  function wShow(i) {
    const sc = WSC[WS.sc], n = sc.rows.length; WS.step = i;
    $$('#wstack .wrow').forEach((r, k) => { r.classList.toggle('on', k <= i); r.classList.toggle('cur', k === i); });
    $$('#wstack .warrow').forEach((a, k) => a.classList.toggle('on', k < i));
    $('#wcap').innerHTML = i < 0 ? `<div class="num" style="--cc:var(--accent)">00</div><div class="body"><h4>One client packet, five transformations</h4><p>Press Play to follow a web request from the laptop’s radio to the wired network. Watch the colours: each header appears, changes or disappears as the packet moves.</p></div>` : `<div class="num" style="--cc:var(--text)">${String(i + 1).padStart(2, '0')}/${String(n).padStart(2, '0')}</div><div class="body"><h4>${sc.rows[i].t}</h4><p>${sc.rows[i].x}</p></div>`;
    $('#wPlay').textContent = WS.playing ? 'Pause' : (i >= n - 1 ? 'Replay' : (i < 0 ? 'Play' : 'Resume')); $('#wPlay').classList.toggle('playing', WS.playing);
    $('#wPrev').disabled = i <= 0; $('#wNext').disabled = i >= n - 1;
  }
  async function wPlay() { const n = WSC[WS.sc].rows.length; if (WS.playing) { WS.playing = false; WS.tok++; return wShow(WS.step); } if (WS.step >= n - 1) WS.step = -1; WS.playing = true; const tok = ++WS.tok; while (WS.playing && tok === WS.tok && WS.step < n - 1) { wShow(WS.step + 1); await sleep(2800); } if (tok === WS.tok) { WS.playing = false; wShow(WS.step); } }
  function wLoad(i) { WS.playing = false; WS.tok++; WS.sc = i; WS.step = -1; $$('#wscen button').forEach((b, k) => b.classList.toggle('on', k === i)); wBuild(); wShow(-1); }
  $('#wscen').innerHTML = WSC.map((s, i) => `<button class="${i === 0 ? 'on' : ''}">${s.name}</button>`).join(''); $$('#wscen button').forEach((b, i) => b.onclick = () => wLoad(i));
  $('#wPlay').onclick = wPlay; $('#wNext').onclick = () => { WS.playing = false; WS.tok++; wShow(Math.min(WS.step + 1, WSC[WS.sc].rows.length - 1)); }; $('#wPrev').onclick = () => { WS.playing = false; WS.tok++; wShow(Math.max(WS.step - 1, 0)); }; $('#wReset').onclick = () => { WS.playing = false; WS.tok++; wShow(-1); };
  wLoad(0);

  /* ═════════ I · CSMA/CA ═════════ */
  const CA = [{ id: 'a', label: 'Station A', sub: 'wants to send' }, { id: 'b', label: 'Station B', sub: 'hidden from A?' }, { id: 'ap', label: 'Access Point', sub: '' }];
  const CSTEPS = [
    S('b', 'ap', 'DATA (B)', 'Station B owns the air right now', 'B has won the channel and is transmitting. Its <b>Duration</b> field tells every other station how long to stay quiet — a <i>virtual</i> carrier sense called the <b>NAV</b>.', [['Medium', 'BUSY'], ['NAV', 'set by B’s Duration field']], 'req', 'Medium busy'),
    S('a', 'a', 'WANTS TO SEND', 'Station A has data but must wait', 'Wi‑Fi is <b>half‑duplex</b> and shared: only one device can talk per channel at a time. A uses <i>physical</i> carrier sense (energy detect) and the NAV to know the channel is busy.', [['A', 'waiting']], 'ctl'),
    S('ap', 'b', 'ACK', 'AP acknowledges B — after SIFS (16 µs)', 'Every unicast frame needs an ACK. The AP answers after the shortest gap, <b>SIFS</b>, so nobody can sneak in between data and ACK.', [['SIFS', '16 µs']], 'res'),
    S('a', 'a', 'DIFS 34 µs', 'Channel idle — A waits DIFS', 'Before contending, A must sense the channel idle for <b>DIFS</b> (SIFS + 2 slots = 34 µs; QoS traffic uses a shorter AIFS for voice).', [['DIFS', '34 µs']], 'ctl', 'Contention'),
    S('a', 'a', 'BACKOFF = 7', 'A picks a random backoff', 'A chooses a random number of slots from 0 to CW (contention window, initially 15). Randomness stops two waiting stations transmitting at the exact same moment.', [['CW', '0–15'], ['Pick', '7 slots × 9 µs']], 'ctl'),
    S('a', 'a', 'COUNTDOWN 7…0', 'Count down — only while idle', 'A decrements once per 9 µs slot <b>only while the channel stays idle</b>. If another station starts, A freezes the counter and resumes later. That fairness is why long‑waiting stations get priority.', [['Slot time', '9 µs']], 'ctl'),
    S('a', 'ap', 'DATA (A)', 'Counter hits zero — A transmits', 'A sends its frame. If a collision occurs (two stations pick the same slot) neither gets an ACK.', [['Medium', 'A owns it']], 'req', 'Transmit'),
    S('ap', 'a', 'ACK', 'AP acknowledges after SIFS', 'The ACK is the <i>only</i> proof of delivery. <b>No ACK?</b> A doubles its contention window (15 → 31 → 63 …) and retries — the “Retry” bit in the frame control. Many retries = interference or weak signal.', [['If no ACK', 'CW doubles, Retry bit set']], 'res'),
    S('a', 'ap', 'RTS', 'Hidden node? Ask permission first (RTS)', 'Station B and A may be too far apart to hear each other but both reach the AP — a <b>hidden node</b>. For large frames A sends a short <b>RTS</b> first.', [['Frame', 'RTS 20 B'], ['Duration', 'reserves the whole exchange']], 'req', 'Hidden node protection'),
    S('ap', ['a', 'b'], 'CTS', 'AP broadcasts CTS so everyone hears', 'The AP’s <b>CTS</b> reaches B too, which sets its NAV and stays quiet — even though it never heard A. ', [['Frame', 'CTS 14 B']], 'res'),
    S('a', 'ap', 'DATA (A)', 'Protected data frame', 'The data frame now goes through collision‑free. RTS/CTS costs airtime, so it is used only above a size threshold or on problem sites.', [['Size', 'large frame']], 'req'),
    S('ap', 'a', 'ACK', 'Final ACK', 'Done. Wi‑Fi 6 (OFDMA) and MU‑MIMO reduce this contention by letting the AP schedule several clients in one transmission.', [], 'res'),
  ];
  const strip = [['B DATA', 0, 'busy', 7], ['SIFS', 2, 'gap', 2], ['ACK', 2, 'ack', 3], ['DIFS', 3, 'gap', 3], ['BACKOFF ×7 slots', 4, 'slot', 9], ['A DATA', 6, 'data', 8], ['SIFS', 7, 'gap', 2], ['ACK', 7, 'ack', 3], ['RTS', 8, 'busy', 3], ['SIFS', 9, 'gap', 2], ['CTS', 9, 'ack', 3], ['A DATA', 10, 'data', 8], ['ACK', 11, 'ack', 3]];
  $('#airStrip').innerHTML = `<div class="stripcap">Airtime (not to scale)</div><div class="strip">${strip.map(s => `<span class="sc ${s[2]}" style="flex:${s[3]}"><b>${s[0]}</b></span>`).join('')}</div>`;
  const csmaFlow = Flow($('#csmaFlow'), { onStep: i => $$('#airStrip .sc').forEach((el, k) => { el.classList.toggle('seen', i >= strip[k][1]); el.classList.toggle('cur', i === strip[k][1] || (k === 4 && i === 5)); }) });
  csmaFlow.load({ actors: CA, steps: CSTEPS, intro: 'Sharing one channel', introText: 'Press Play to see why Wi‑Fi stations wait, count down and acknowledge.' });

  /* ═════════ J · best practice ═════════ */
  const BP = [
    ['RF design', '#5ac8fa', ['Design for <b>−67 dBm</b> cell edge (voice/video) and SNR ≥ 25 dB; overlap neighbouring cells 15–20 %.', 'Use only <b>channels 1, 6, 11</b> on 2.4 GHz at 20 MHz — better, disable most 2.4 GHz radios in dense areas.', '5 GHz: <b>20/40 MHz</b> in high density; 80 MHz only if the spectrum is clean. Avoid DFS where radar is common.', 'Disable data rates below 12 Mbps (mandatory 12 / 24 on 2.4 GHz; 6 Mbps on 5 GHz is common) to shrink cells and remove airtime hogs.', 'Lower TX power than you think: matched uplink/downlink beats loud APs. Keep 2.4 GHz ≥ 6–8 dB lower than 5 GHz.', 'Do a <b>predictive + on‑site survey</b>; validate with real devices.']],
    ['WLAN & client settings', '#30d158', ['Prefer <b>WPA3</b> (SAE / Enterprise); use <b>transition mode</b> only while migrating legacy clients.', 'Enable <b>802.11k, 802.11v</b> and <b>Adaptive 11r</b>; PMF “optional”, then “required” when clients allow.', 'WMM on; map voice/video to the right DSCP; limit SSIDs (each beacon costs airtime — aim for ≤ 3–4).', 'Session timeout and idle timeout sensible (e.g. 8–12 h; 5–10 min idle).', 'Client band‑steering / load balancing helps, but test with your devices.']],
    ['Controller & AP architecture (9800)', '#ff9f0a', ['Use a <b>9800 HA SSO pair</b> per site (redundancy port + RMI) — APs and clients survive a controller failure.', 'Define <b>primary / secondary controller names</b> in the AP join profile; keep identical software and tags on both.', '<b>Pre‑download</b> AP images before upgrades; use rolling AP upgrade (N+1) to limit outage.', 'Tag everything: Policy / Site / RF tags with <b>tag rules</b> (AP‑name regex) so new APs self‑provision.', 'FlexConnect for branches (local switching survives WAN loss); local mode for campus with controller nearby.', 'NTP everywhere (certificates!). Allow UDP 5246/5247, 16666/16667; keep MTU ≥ 1500 end‑to‑end.']],
    ['Security', '#ff6482', ['802.1X with <b>EAP‑TLS</b> for staff; always validate the RADIUS server certificate on clients.', 'Guest: CWA / OWE with ISE, isolated VLAN, internet‑only ACL, rate limit.', 'IoT: separate SSID/VLAN with PSK or iPSK (ISE) and tight ACLs/SGTs; <b>P2P blocking</b> on guest.', 'Enable rogue detection and, where required, WIPS; be careful with rogue <i>containment</i> (legal risk).', 'Disable WEP/TKIP, SSH only for management, AAA with TACACS+ for admin access.']],
    ['Operations & troubleshooting', '#bf5af2', ['Use <b>Catalyst Center (DNA Center) Assurance</b> or the 9800 GUI for client health, onboarding times, roam reasons.', '<b>Radioactive trace</b> per client MAC is the first tool for any “my device can’t connect” case.', 'Embedded packet capture on the 9800 / AP to see the real frames; Wireshark filter <code>wlan.fc.type_subtype</code>.', 'Watch retry %, channel utilisation (QBSS), noise floor and sticky‑client logs — most “Wi‑Fi is slow” cases are RF, not bandwidth.', 'Keep a baseline: AP count, channel plan, RF profile, firmware — and review after every change.']],
  ];
  $('#bpGrid').innerHTML = BP.map(b => `<div class="card bpc" style="--c:${b[1]}"><h4>${b[0]}</h4><ul>${b[2].map(x => `<li>${x}</li>`).join('')}</ul></div>`).join('');
  const CLI = [
    ['show ap summary', 'All joined APs: name, model, IP, state, tags', 'AP inventory / join health'],
    ['show ap join stats summary', 'Join attempts and last disconnect reason per AP', 'AP won’t join / flapping'],
    ['show ap tag summary', 'Policy / Site / RF tag of every AP', 'Tag mismatch'],
    ['show ap name &lt;ap&gt; config general', 'Detailed AP config, mode, controller names', 'Single AP deep‑dive'],
    ['show wlan summary', 'WLANs, IDs, status and security', 'SSID missing/disabled'],
    ['show wireless client summary', 'All clients: AP, WLAN, state, role', 'Who is connected where'],
    ['show wireless client mac-address &lt;mac&gt; detail', 'Client state, RSSI/SNR, security, VLAN, policy, roam history', 'Client can’t join / slow'],
    ['show ap dot11 5ghz summary', 'Radio channel, width, power per AP (use 24ghz for 2.4)', 'RF plan check'],
    ['show wireless mobility summary', 'Mobility peers and tunnel status', 'Inter‑controller roam'],
    ['show wireless stats client delete reasons', 'Why clients were deleted (idle, auth fail, roam…)', 'Client disconnect analysis'],
    ['debug wireless mac &lt;mac&gt; (radioactive trace)', 'Per‑client trace; GUI: Troubleshooting → Radioactive Trace', 'Deep client onboarding issues'],
    ['show platform software wireless-client chassis active R0', 'Datapath view of client state (advanced)', 'TAC‑level debugging'],
  ];
  $('#cliTbl').innerHTML = `<thead><tr><th>Command (IOS‑XE, Catalyst 9800)</th><th>What it shows</th><th>Use it when…</th></tr></thead><tbody>${CLI.map(r => `<tr><td><code>${r[0]}</code></td><td class="info">${r[1]}</td><td class="info">${r[2]}</td></tr>`).join('')}</tbody><caption>Command names vary slightly between IOS‑XE releases — check <code>?</code> on your device.</caption>`;


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

  /* ═════════ K · quiz ═════════ */
  const Q = [
    ['Which 2.4 GHz channels do not overlap (20 MHz)?', ['1, 5, 9', '1, 6, 11', '2, 7, 12', '3, 8, 13'], 1, 'Channels are 5 MHz apart but each signal is ~22 MHz wide, so only 1, 6 and 11 are clear of each other.'],
    ['What is the default beacon interval?', ['10 ms', '50 ms', '102.4 ms', '1 second'], 2, '100 time units × 1.024 ms = 102.4 ms.'],
    ['Which frame does a client send to actively find a network?', ['Beacon', 'Probe Request', 'Authentication', 'Deauthentication'], 1, 'Probe Request (active scanning). The AP replies with a Probe Response.'],
    ['Which UDP ports does CAPWAP use for control and data?', ['80 / 443', '1812 / 1813', '5246 / 5247', '16666 / 16667'], 2, 'Control is 5246 (DTLS) and data is 5247. 16666/16667 are for mobility tunnels.'],
    ['How can an AP learn the WLC’s IP via DHCP?', ['Option 43', 'Option 66', 'Option 121', 'Option 150'], 0, 'Cisco APs use DHCP Option 43 (vendor‑specific, type 0xF1) — or DNS CISCO‑CAPWAP‑CONTROLLER.'],
    ['Where does the PMK come from in WPA2‑Enterprise?', ['The Wi‑Fi password', 'The MSK from the EAP exchange', 'The AP’s MAC', 'The beacon'], 1, 'The RADIUS server returns the MSK and the PMK is its first 256 bits — unique per client.'],
    ['What does 802.11r (Fast Transition) save during a roam?', ['Beacons', 'The 4‑way handshake and RADIUS', 'DHCP', 'Association'], 1, 'Keys are prepared for the target AP, so the handshake is folded into the FT authentication.'],
    ['Which mechanism defeats deauthentication attacks?', ['WMM', 'PMF (802.11w)', 'OFDMA', '802.11k'], 1, 'Protected Management Frames sign deauth/disassociation frames.'],
    ['On a 9800, which tag carries the RF profiles?', ['Policy tag', 'Site tag', 'RF tag', 'WLAN tag'], 2, 'Policy = SSIDs/policies, Site = AP join/flex profile, RF = radio settings.'],
    ['Why does Wi‑Fi use RTS/CTS?', ['To encrypt traffic', 'To protect against hidden nodes', 'To find APs', 'To speed up roaming'], 1, 'The AP’s CTS is heard by stations that cannot hear the sender, so they set their NAV.'],
  ];
  (() => {
    const QUESTIONS_PER_ATTEMPT = 15;
    let activeQuestions = pickQuizQuestions(Q, 'wireless', QUESTIONS_PER_ATTEMPT);
    const box = $('#quizBox'); let i = 0, score = 0, T0 = performance.now();
    const render = () => {
      if (i >= activeQuestions.length) { box.innerHTML = `<div class="qdone"><div class="big">${score}/${activeQuestions.length}</div><p>${score >= 9 ? 'Wireless expert — CWNA territory!' : score >= 7 ? 'Strong. Revisit the sections you missed.' : 'Good start — replay the flows above and try again.'}</p><div id="qForm"></div><button class="btn solid" id="qAgain">Try again</button></div>`; PFBoard.form($('#qForm'), 'wireless', score, activeQuestions.length, Math.round(performance.now() - T0)); $('#qAgain').onclick = () => { activeQuestions = pickQuizQuestions(Q, 'wireless', QUESTIONS_PER_ATTEMPT); i = 0; score = 0; T0 = performance.now(); render(); }; return; }
      const q = activeQuestions[i];
      box.innerHTML = `<div class="qtop"><span>Question ${i + 1} / ${activeQuestions.length}</span><span>Score ${score}</span></div><div class="qbar"><b style="width:${i / activeQuestions.length * 100}%"></b></div><h3 class="qq">${q[0]}</h3><div class="qopts">${q[1].map((t, k) => `<button data-k="${k}">${t}</button>`).join('')}</div><div class="qfb" id="qfb"></div>`;
      $$('.qopts button', box).forEach(b => b.onclick = () => { const k = +b.dataset.k, ok = k === q[2]; if (ok) score++; $$('.qopts button', box).forEach(x => { x.disabled = true; if (+x.dataset.k === q[2]) x.classList.add('right'); }); if (!ok) b.classList.add('wrong'); $('#qfb').innerHTML = `<p><b>${ok ? 'Correct.' : 'Not quite.'}</b> ${q[3]}</p><button class="btn solid" id="qNext">${i === activeQuestions.length - 1 ? 'See score' : 'Next question'}</button>`; $('#qNext').onclick = () => { i++; render(); }; });
    };
    render();
    PFBoard.mount('#board', 'wireless', 'Leaderboard · Wireless quiz');
  })();
})();
