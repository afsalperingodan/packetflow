/* PacketFlow — Protocol Explorer quiz */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const BANK = [
    ['Which transport protocol provides reliable, ordered delivery?',['UDP','TCP','ICMP','ARP'],1,'TCP uses sequence numbers, acknowledgements and retransmission to provide reliable ordered delivery.'],
    ['Which transport protocol is connectionless?',['TCP','SCTP','UDP','TLS'],2,'UDP sends datagrams without establishing a connection or guaranteeing delivery.'],
    ['What does DNS primarily do?',['Assign IP addresses','Resolve names to records such as IP addresses','Encrypt web traffic','Synchronise clocks'],1,'DNS resolves names and publishes other data such as MX, TXT, NS and SRV records.'],
    ['Which DNS record maps a hostname to an IPv4 address?',['AAAA','CNAME','A','PTR'],2,'An A record maps a name to an IPv4 address.'],
    ['Which DNS record maps a hostname to an IPv6 address?',['AAAA','A','MX','SOA'],0,'An AAAA record stores an IPv6 address.'],
    ['What is the purpose of a CNAME record?',['Mail routing','Alias one DNS name to another name','Reverse lookup','Name server delegation'],1,'A CNAME creates an alias to another canonical DNS name.'],
    ['Which DNS record identifies mail exchangers for a domain?',['TXT','NS','MX','PTR'],2,'MX records identify the mail servers responsible for a domain.'],
    ['What is the usual DNS query port?',['TCP/25','UDP/53','UDP/67','TCP/443'],1,'DNS commonly uses UDP port 53; TCP 53 is also used, including for zone transfers and larger responses.'],
    ['Which protocol dynamically leases IP configuration to clients?',['DNS','DHCP','SNMP','NTP'],1,'DHCP provides addresses and options such as subnet mask, gateway and DNS servers.'],
    ['Which DHCP message begins the DORA sequence?',['Offer','Request','Discover','Acknowledge'],2,'A client broadcasts DHCPDISCOVER to locate DHCP servers.'],
    ['What does DORA stand for in DHCP?',['Discover, Offer, Request, Acknowledge','Detect, Open, Route, Assign','Discover, Option, Relay, Address','Data, Offer, Renew, Accept'],0,'The normal DHCPv4 exchange is Discover, Offer, Request and Acknowledge.'],
    ['Which UDP ports are used by DHCPv4 clients and servers?',['53 and 54','67 and 68','161 and 162','123 and 124'],1,'DHCP servers listen on UDP 67 and clients use UDP 68.'],
    ['What is the main purpose of ARP in IPv4 networks?',['Resolve IPv4 addresses to MAC addresses on a LAN','Resolve names to IP addresses','Assign VLAN IDs','Encrypt Ethernet frames'],0,'ARP discovers the Layer 2 address associated with an IPv4 address on the local link.'],
    ['Which protocol is used for IPv6 neighbor discovery instead of ARP?',['RARP','NDP','IGMP','LLDP'],1,'IPv6 Neighbor Discovery Protocol uses ICMPv6 messages for address resolution and related functions.'],
    ['Which ICMP message is commonly used by ping?',['Redirect','Echo Request','Time Exceeded','Destination Unreachable'],1,'Ping sends ICMP Echo Requests and listens for Echo Replies.'],
    ['What does an ICMP Time Exceeded message help diagnose?',['DNS failure','TTL or hop-limit expiry','TCP port mismatch','VLAN mismatch'],1,'Routers decrement TTL/hop limit; when it expires, they can return ICMP Time Exceeded, which traceroute uses.'],
    ['Which protocol securely transfers web content?',['HTTP','HTTPS','FTP','TFTP'],1,'HTTPS is HTTP protected by TLS.'],
    ['What is the default TCP port for HTTPS?',['80','22','443','8080'],2,'HTTPS commonly uses TCP port 443.'],
    ['What is the default TCP port for HTTP?',['21','53','80','110'],2,'HTTP commonly uses TCP port 80.'],
    ['Which protocol provides encryption and authentication for HTTPS?',['TLS','ARP','DHCP','SNMP'],0,'TLS provides encryption, integrity and peer authentication for HTTPS connections.'],
    ['Which TCP flag is used to initiate a connection?',['FIN','RST','SYN','PSH'],2,'The client starts the TCP three-way handshake with SYN.'],
    ['What is the correct TCP three-way handshake order?',['ACK, SYN, FIN','SYN, SYN-ACK, ACK','SYN, ACK, FIN','FIN, FIN-ACK, ACK'],1,'The handshake is SYN, SYN-ACK, then ACK.'],
    ['Which TCP flag normally initiates an orderly connection close?',['SYN','FIN','URG','ECE'],1,'FIN indicates that a sender has finished sending data in that direction.'],
    ['What does a TCP RST usually indicate?',['Graceful close','Immediate reset or refusal','Successful DNS lookup','Window scaling'],1,'RST aborts or rejects a TCP connection rather than closing it gracefully.'],
    ['What is the purpose of the TCP receive window?',['Advertise receiver buffer capacity','Select a route','Identify an application','Set the VLAN'],0,'The advertised receive window supports TCP flow control by telling the sender how much data can be accepted.'],
    ['What does TCP congestion control attempt to avoid?',['DNS cache poisoning','Overloading the network path','Duplicate MAC addresses','DHCP starvation'],1,'Congestion control adjusts sending behaviour to reduce overload and packet loss in the network.'],
    ['Which protocol is commonly used to transfer files securely over SSH?',['TFTP','SFTP','FTP','RCP'],1,'SFTP transfers files over the SSH transport, typically TCP port 22.'],
    ['Which protocol provides remote terminal access over an encrypted channel?',['Telnet','SSH','FTP','SNMP'],1,'SSH provides encrypted remote login and command execution, commonly on TCP port 22.'],
    ['Which protocol sends email between mail servers?',['SMTP','IMAP','POP3','LDAP'],0,'SMTP is used to submit and relay email.'],
    ['Which protocol lets clients synchronise mail while keeping it on the server?',['TFTP','IMAP','SNMP','RDP'],1,'IMAP synchronises mailbox state and messages with the mail server.'],
    ['Which protocol is commonly used for network time synchronisation?',['NTP','SIP','RTP','BGP'],0,'NTP synchronises system clocks, commonly using UDP port 123.'],
    ['Which protocol is commonly used to monitor and manage network devices?',['SNMP','SMTP','SFTP','SIP'],0,'SNMP supports monitoring and management through managers, agents and MIB data.'],
    ['Which UDP ports are traditionally used by SNMP queries and traps?',['53 / 54','67 / 68','161 / 162','500 / 4500'],2,'SNMP requests commonly use UDP 161; traps and notifications commonly use UDP 162.'],
    ['Which routing protocol is an interior gateway protocol using link-state advertisements?',['BGP','OSPF','RIP','ARP'],1,'OSPF is a link-state IGP that floods LSAs and runs the SPF algorithm.'],
    ['What algorithm does OSPF use to calculate shortest paths?',['Bellman-Ford','Dijkstra SPF','Path-vector','Spanning tree'],1,'OSPF uses Dijkstra’s Shortest Path First algorithm against its link-state database.'],
    ['What is the default administrative distance of OSPF on Cisco IOS?',['1','90','110','120'],2,'Cisco IOS commonly assigns OSPF an administrative distance of 110.'],
    ['Which OSPF packet type discovers and maintains neighbours?',['Hello','Update only','Query','Keepalive'],0,'OSPF Hello packets discover neighbours and maintain adjacencies.'],
    ['What is the purpose of OSPF area 0?',['Guest area','Backbone area','Stub-only area','Management VLAN'],1,'Area 0 is the OSPF backbone; other regular areas connect to it.'],
    ['Which OSPF router connects an area to the backbone or other areas?',['ASBR','ABR','DR','BDR'],1,'An Area Border Router has interfaces in multiple OSPF areas and exchanges inter-area routes.'],
    ['Which routing protocol is commonly used between autonomous systems?',['OSPF','EIGRP','BGP','RIP'],2,'BGP is the inter-domain path-vector routing protocol used between autonomous systems.'],
    ['Which transport protocol and port does BGP use?',['UDP 179','TCP 179','TCP 520','UDP 500'],1,'BGP establishes peer sessions over TCP port 179.'],
    ['Which BGP attribute is commonly used to influence path selection within an AS?',['MED only','Local Preference','OSPF cost','VLAN priority'],1,'Local Preference is propagated within an AS and higher values are preferred.'],
    ['What does eBGP describe?',['BGP between routers in different ASes','BGP within one AS','OSPF between areas','Static routing'],0,'External BGP peers belong to different autonomous systems.'],
    ['What does iBGP describe?',['BGP between different ASes','BGP peers within the same AS','IPv6-only BGP','A backup static route'],1,'Internal BGP distributes BGP information between routers in the same AS.'],
    ['Which protocol prevents Layer 2 switching loops?',['OSPF','STP','BGP','DHCP'],1,'Spanning Tree Protocol blocks redundant Layer 2 paths to prevent bridging loops.'],
    ['What is the purpose of a VLAN?',['Create separate Layer 2 broadcast domains','Encrypt traffic','Assign IP addresses','Choose an OSPF router ID'],0,'VLANs logically segment a switched network into separate broadcast domains.'],
    ['Which Ethernet frame field carries an 802.1Q VLAN tag?',['IP options','VLAN tag inserted after source MAC','TCP flags','FCS replacement'],1,'An 802.1Q tag is inserted between the source MAC and EtherType/length fields.'],
    ['What is the native VLAN concept associated with?',['Access ports only','Untagged traffic on an 802.1Q trunk','Routing protocol updates','Wireless encryption'],1,'On an 802.1Q trunk, native VLAN traffic is traditionally sent untagged unless configured otherwise.'],
    ['Which protocol dynamically negotiates trunking on some Cisco switches?',['DTP','VTP','LACP','LLDP'],0,'DTP negotiates trunking on supported Cisco switch ports.'],
    ['Which protocol distributes VLAN database information between Cisco switches?',['STP','VTP','CDP','PAgP'],1,'VTP advertises VLAN information within a configured VTP domain.'],
    ['Which protocol negotiates link aggregation between network devices?',['LACP','VRRP','HSRP','OSPF'],0,'LACP (IEEE 802.1AX, formerly 802.3ad) negotiates link aggregation.'],
    ['Which Cisco protocol provides first-hop IPv4 gateway redundancy?',['HSRP','BGP','LLDP','VTP'],0,'HSRP allows multiple routers to present a virtual default gateway.'],
    ['Which standards-based protocol provides first-hop redundancy?',['HSRP','VRRP','EIGRP','CAPWAP'],1,'VRRP is an open standard for virtual router redundancy.'],
    ['Which protocol maps an IP multicast group to interested IPv4 hosts?',['IGMP','ICMP','ARP','NTP'],0,'IGMP manages IPv4 multicast group membership between hosts and routers.'],
    ['Which protocol is used to discover neighbouring network devices at Layer 2?',['LLDP','DNS','BGP','TLS'],0,'LLDP is a vendor-neutral Layer 2 discovery protocol.'],
    ['Which Cisco proprietary protocol discovers directly connected Cisco devices?',['LLDP','CDP','STP','VTP'],1,'CDP advertises device identity and capabilities to directly connected Cisco neighbours.'],
    ['What does MTU describe?',['Maximum Layer 3 packet size a link can carry without fragmentation','TCP connection timeout','Maximum number of VLANs','Routing metric'],0,'MTU is the maximum packet size supported by a link at the relevant layer.'],
    ['What is the purpose of IP fragmentation in IPv4?',['Split a packet to fit a smaller MTU','Encrypt packet payload','Select a gateway','Resolve a MAC address'],0,'IPv4 fragmentation can split a packet when it exceeds the outgoing link MTU and DF is not set.'],
    ['What does the IPv4 TTL field limit?',['Packet lifetime in router hops','TCP retransmissions','DNS cache age','VLAN membership'],0,'TTL is decremented by routers to prevent packets circulating indefinitely.'],
    ['Which IPv4 address is the loopback address?',['0.0.0.0','127.0.0.1','169.254.1.1','255.255.255.255'],1,'127.0.0.1 is the IPv4 loopback address.'],
    ['Which IPv4 range is used for link-local addressing?',['10.0.0.0/8','169.254.0.0/16','172.16.0.0/12','192.168.0.0/16'],1,'IPv4 hosts may self-assign an address from 169.254.0.0/16 when normal configuration is unavailable.'],
    ['Which IPv4 range is private?',['11.0.0.0/8','172.16.0.0/12','100.64.0.0/10','198.51.100.0/24'],1,'RFC 1918 private ranges include 10/8, 172.16/12 and 192.168/16.'],
    ['Which protocol carries error and diagnostic messages for IP?',['ICMP','TCP','FTP','LACP'],0,'ICMP reports IP-layer errors and supports diagnostics such as ping.'],
    ['What is the purpose of NAT?',['Translate network addresses','Discover wireless channels','Prevent switching loops','Synchronise time'],0,'NAT translates IP address information, commonly between private and public address spaces.'],
    ['What does PAT commonly translate in addition to IP addresses?',['VLAN IDs','Transport-layer port numbers','DNS names','MAC vendor IDs'],1,'PAT multiplexes many internal sessions using translated transport port numbers.'],
    ['Which VPN technology commonly uses IPsec for network-layer protection?',['IPsec VPN','HTTP proxy','TFTP','RADIUS'],0,'IPsec protects IP traffic and is widely used for site-to-site and remote-access VPNs.'],
    ['Which UDP ports are commonly used by IKE and IPsec NAT-T?',['67 and 68','500 and 4500','161 and 162','5246 and 5247'],1,'IKE uses UDP 500; NAT Traversal encapsulates IPsec in UDP 4500.'],
    ['Which protocol authenticates network access and can carry authentication exchanges?',['802.1X','STP','BGP','NTP'],0,'802.1X provides port-based network access control and commonly uses EAP over LAN.'],
    ['Which protocol commonly carries authentication requests from a network access device to an AAA server?',['RADIUS','OSPF','SIP','LLDP'],0,'RADIUS provides centralised authentication, authorisation and accounting for network access.'],
    ['Which UDP ports are commonly used by RADIUS authentication and accounting?',['1812 and 1813','53 and 54','500 and 4500','67 and 68'],0,'RADIUS commonly uses UDP 1812 for authentication and 1813 for accounting.'],
    ['What does EAP stand for in network authentication?',['Extensible Authentication Protocol','Enhanced Address Path','Ethernet Access Process','Encrypted Application Proxy'],0,'EAP is a framework for authentication methods, often used with 802.1X.'],
    ['Which protocol is commonly used to establish and manage VoIP sessions?',['SIP','RTP','NTP','ARP'],0,'SIP establishes, modifies and terminates multimedia sessions such as VoIP calls.'],
    ['Which protocol commonly carries real-time audio/video media?',['RTP','SIP','DNS','SNMP'],0,'RTP transports real-time media; it is commonly used alongside SIP for session setup.'],
    ['Which protocol is commonly used for secure file copy over SSH?',['SCP','TFTP','FTP','HTTP'],0,'SCP copies files using the SSH protocol.'],
    ['Which protocol is a simple file transfer protocol often used for network booting?',['TFTP','SFTP','IMAP','BGP'],0,'TFTP is a lightweight UDP-based file transfer protocol, often used for device boot images/configuration.'],
    ['What is the common UDP port for TFTP?',['69','67','123','514'],0,'TFTP servers listen on UDP port 69.'],
    ['Which protocol sends system log messages to a collector?',['Syslog','SIP','NDP','LACP'],0,'Syslog transports event and diagnostic messages to log collectors.'],
    ['Which UDP port is traditionally associated with Syslog?',['514','1812','179','636'],0,'UDP 514 is the traditional Syslog port; secure and reliable transports are also used.'],
    ['Which protocol provides directory access and queries?',['LDAP','RTP','ICMP','PAgP'],0,'LDAP is used to access and query directory services.'],
    ['Which TCP port is commonly used by LDAPS?',['389','636','443','3268'],1,'LDAPS commonly uses TCP port 636 for LDAP over TLS.'],
    ['Which protocol provides secure remote desktop access in Microsoft environments?',['RDP','RTP','SIP','NTP'],0,'Remote Desktop Protocol commonly listens on TCP/UDP 3389.'],
    ['Which protocol is used by a client to query a recursive DNS resolver?',['DNS','DHCP','ARP','LACP'],0,'DNS clients query a resolver, which may answer from cache or perform recursive lookups.'],
    ['What is a DNS TTL used for?',['Control how long a DNS record may be cached','Limit IP packet hops','Set TCP keepalive','Choose a route'],0,'DNS record TTL controls cache duration; it is separate from the IPv4 packet TTL.'],
    ['Which DNS query type asks for all available record types?',['ANY','AXFR','PTR','CAA'],0,'An ANY query requests available information, but modern DNS servers may return limited or minimal responses.'],
    ['Which protocol transfers DNS zone data between servers?',['AXFR over DNS/TCP','DHCP over UDP','BGP over TCP','SNMP over UDP'],0,'AXFR is a DNS zone transfer and uses TCP.'],
    ['Which protocol supports multicast listener membership in IPv6?',['MLD','IGMP','ARP','RIP'],0,'MLD is the IPv6 Multicast Listener Discovery protocol, based on ICMPv6.'],
    ['Which routing protocol is a distance-vector IGP with hop-count metric?',['RIP','OSPF','BGP','IS-IS'],0,'RIP uses hop count as its metric, with 15 as the maximum usable distance.'],
    ['What is the maximum usable hop count in RIP?',['16','15','255','100'],1,'A RIP metric of 16 represents unreachable, so 15 is the maximum usable hop count.'],
    ['Which routing protocol is a link-state IGP often used by service providers?',['IS-IS','FTP','DHCP','SNMP'],0,'IS-IS is a scalable link-state interior gateway protocol.'],
    ['Which protocol provides label switching in MPLS networks?',['LDP','ARP','SMTP','RTP'],0,'LDP distributes labels for MPLS forwarding; RSVP-TE is another label distribution/signalling option.'],
    ['What does MPLS forwarding primarily use?',['Labels','DNS names','TCP ports','MAC vendor IDs'],0,'MPLS forwards packets based on short labels rather than performing a full IP route lookup at every hop.'],
    ['Which protocol is used to exchange routing information between routers in an SD-WAN overlay?',['Depends on the SD-WAN design; commonly BGP or OSPF at edges','ARP only','SMTP','DHCP only'],0,'SD-WAN products use different control planes and may exchange routes with sites using BGP, OSPF or static routing.'],
    ['Which protocol helps discover path MTU issues for IPv4 when DF is set?',['ICMP Destination Unreachable, Fragmentation Needed','ARP Reply','DHCP Offer','TCP FIN'],0,'Routers can send ICMP type 3 code 4 when a DF packet cannot fit the outgoing MTU.'],
    ['Which TCP mechanism helps detect missing data and recover it?',['Acknowledgements and retransmissions','DNS caching','ARP inspection','VLAN pruning'],0,'TCP uses sequence numbers and acknowledgements to detect loss and retransmit missing data.'],
    ['Which field identifies the receiving application on a TCP or UDP segment?',['Destination port','IP TTL','EtherType','VLAN PCP'],0,'The destination port identifies the target service/process at the receiving host.'],
    ['Which Ethernet field identifies the encapsulated Layer 3 protocol?',['EtherType','TCP window','IP TTL','DSCP'],0,'EtherType identifies the payload protocol, such as IPv4 (0x0800) or IPv6 (0x86DD).'],
    ['Which IP field can mark packet forwarding priority?',['DSCP','TCP SYN','ARP opcode','DNS ID'],0,'DSCP in the IP header supports differentiated services and QoS classification.'],
    ['Which protocol can negotiate link aggregation on a Cisco switch using a proprietary method?',['PAgP','LACP','VRRP','OSPF'],0,'PAgP is Cisco-proprietary link aggregation negotiation; LACP is standards-based.'],
    ['Which protocol provides loop prevention for bridged Ethernet networks?',['STP/RSTP','BGP','DNS','RADIUS'],0,'STP and its faster variant RSTP prevent Layer 2 loops by selecting a loop-free topology.'],
    ['What does RSTP improve compared with classic STP?',['Faster spanning-tree convergence','Encryption','IP address assignment','DNS resolution'],0,'Rapid Spanning Tree Protocol (802.1w) improves convergence compared with classic 802.1D STP.'],
  ];
  function pickQuestions(count = 15) {
    const key = 'pf-quiz-seen-protocols';
    let seen = [];
    try { seen = JSON.parse(localStorage.getItem(key) || '[]'); } catch {}
    if (!Array.isArray(seen)) seen = [];
    const fresh = BANK.map((q, id) => ({ q, id })).filter(x => !seen.includes(x.id));
    const shuffle = list => {
      for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
      return list;
    };
    shuffle(fresh);
    const chosen = fresh.slice(0, count);
    if (chosen.length < count) {
      const used = new Set(chosen.map(x => x.id));
      const fill = shuffle(BANK.map((q, id) => ({ q, id })).filter(x => !used.has(x.id)));
      chosen.push(...fill.slice(0, count - chosen.length));
    }
    const next = [...new Set([...seen, ...chosen.map(x => x.id)])];
    try { localStorage.setItem(key, JSON.stringify(next.length >= BANK.length ? [] : next)); } catch {}
    return chosen.map(x => x.q);
  }
  (() => {
    const box = $('#protocolQuizBox');
    if (!box) return;
    const count = 15; let questions = pickQuestions(count), i = 0, score = 0, started = performance.now();
    const render = () => {
      if (i >= questions.length) {
        box.innerHTML = `<div class="qdone"><div class="big">${score}/${questions.length}</div><p>${score >= 13 ? 'Excellent protocol knowledge.' : score >= 10 ? 'Good work. Review the explanations and try again.' : 'Keep practising — revisit the protocol flows and retry.'}</p><div id="protocolQuizForm"></div><button class="btn solid" id="protocolQuizAgain">Try again</button></div>`;
        PFBoard.form($('#protocolQuizForm'), 'protocols', score, questions.length, Math.round(performance.now() - started));
        $('#protocolQuizAgain').onclick = () => { questions = pickQuestions(count); i = 0; score = 0; started = performance.now(); render(); };
        return;
      }
      const q = questions[i];
      box.innerHTML = `<div class="qtop"><span>Question ${i + 1} / ${questions.length}</span><span>Score ${score}</span></div><div class="qbar"><b style="width:${i / questions.length * 100}%"></b></div><h3 class="qq">${q[0]}</h3><div class="qopts">${q[1].map((v,k)=>`<button data-k="${k}">${v}</button>`).join('')}</div><div class="qfb" id="protocolQfb"></div>`;
      $$('.qopts button', box).forEach(btn => btn.onclick = () => {
        const k = +btn.dataset.k, correct = k === q[2]; if (correct) score++;
        $$('.qopts button', box).forEach(el => { el.disabled = true; if (+el.dataset.k === q[2]) el.classList.add('right'); });
        if (!correct) btn.classList.add('wrong');
        $('#protocolQfb').innerHTML = `<p><b>${correct ? 'Correct.' : 'Not quite.'}</b> ${q[3]}</p><button class="btn solid" id="protocolQnext">${i === questions.length - 1 ? 'See score' : 'Next question'}</button>`;
        $('#protocolQnext').onclick = () => { i++; render(); };
      });
    };
    render();
    PFBoard.mount('#protocolBoard', 'protocols', 'Leaderboard · Protocols quiz');
  })();
})();
