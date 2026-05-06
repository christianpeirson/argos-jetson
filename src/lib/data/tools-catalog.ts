/**
 * Argos tool catalog — hierarchical port of `docs/UI/Argos (1).zip` `tools-data.jsx`.
 *
 * Spec-026 phase 9.5. Three pillars (OFFNET / ONNET / OSINT), ~24 categories,
 * ~97 leaf tools. Some categories have grouped sub-sections (e.g. cellular
 * splits into "GSM & LTE Monitoring" + "Trunked Radio Decoding").
 *
 * Design is source-of-truth here (verbatim port). The richer
 * `src/lib/data/tool-hierarchy.ts` infrastructure (with `isInstalled`,
 * `deployment`, etc.) coexists; this catalog is the design-parity surface
 * the new `ToolsHierarchyFlyout` consumes. Future PR can merge the two
 * once consumer ergonomics are confirmed.
 */

export type ToolPillarId = 'offnet' | 'onnet' | 'osint';
export type ToolPillarName = 'OFFNET' | 'ONNET' | 'OSINT';

export interface CatalogTool {
	id: string;
	name: string;
	desc?: string;
	installed: boolean;
	view?: string;
	docs?: string;
}

export interface CatalogToolGroup {
	id: string;
	name: string;
	group: true;
	children: CatalogTool[];
}

export type CatalogSubItem = CatalogTool | CatalogToolGroup;

export interface CatalogCategory {
	id: string;
	name: string;
	children: CatalogSubItem[];
}

export interface CatalogSubcategory {
	id: string;
	name: string;
	children: CatalogCategory[];
}

export interface CatalogPillar {
	id: ToolPillarId;
	name: ToolPillarName;
	desc: string;
	children: CatalogSubcategory[];
}

export interface ToolsCatalog {
	root: CatalogPillar[];
}

export const toolsCatalog: ToolsCatalog = {
	root: [
		{
			id: 'offnet',
			name: 'OFFNET',
			desc: 'Works without connecting to a target network',
			children: [
				{
					id: 'recon',
					name: 'RECON',
					children: [
						{
							id: 'spectrum-analysis',
							name: 'Spectrum Analysis & Monitoring',
							children: [
								{
									id: 'openwebrx',
									name: 'OpenWebRX+',
									desc: 'Multi-user web SDR receiver — waterfall + digital decoders.',
									installed: true,
									view: 'spectrum',
									docs: 'https://github.com/luarvique/openwebrx-plus'
								},
								{
									id: 'novasdr',
									name: 'NovaSDR',
									desc: 'High-performance Rust WebSDR (SoapySDR backend).',
									installed: true,
									view: 'spectrum',
									docs: 'https://github.com/ha7ilm/openwebrx'
								},
								{
									id: 'sdrpp',
									name: 'SDR++',
									desc: 'Native SDR receiver — ImGui waterfall, multi-VFO.',
									installed: true,
									view: 'spectrum',
									docs: 'https://github.com/AlexandreRouma/SDRPlusPlus'
								},
								{
									id: 'qspectrum',
									name: 'QSpectrumAnalyzer',
									desc: 'PyQt5 real-time spectrum analyzer (hackrf_sweep / rtl_power / SoapySDR).',
									installed: false,
									docs: 'https://github.com/xmikos/qspectrumanalyzer'
								}
							]
						},
						{
							id: 'wifi-bt',
							name: 'WiFi & Bluetooth Device Discovery',
							children: [
								{
									id: 'bettercap-recon',
									name: 'Bettercap',
									desc: 'Active WiFi AP scanning, probe capture, BLE enum.',
									installed: true,
									docs: 'https://www.bettercap.org/'
								},
								{
									id: 'kismet',
									name: 'Kismet WiFi',
									desc: 'Passive sniffer — WiFi/BT/RF with GPS logging.',
									installed: true,
									view: 'kismet',
									docs: 'https://www.kismetwireless.net/docs/readme/intro/'
								},
								{
									id: 'bluehood',
									name: 'BlueHood',
									desc: 'Passive BLE/Classic BT presence tracker, RSSI history.',
									installed: true
								},
								{
									id: 'blue-dragon',
									name: 'Blue Dragon',
									desc: 'Wideband BLE5 + Classic BT via USRP B205 mini.',
									installed: true
								},
								{
									id: 'sparrow-wifi',
									name: 'Sparrow-WiFi',
									desc: 'WiFi/BT spectrum analyzer with GPS hunt mode.',
									installed: true,
									docs: 'https://github.com/ghostop14/sparrow-wifi'
								},
								{
									id: 'wigle',
									name: 'WiGLE',
									desc: 'Crowdsourced wireless geolocation DB / OSINT API.',
									installed: false,
									docs: 'https://wigle.net/'
								},
								{
									id: 'wigletotak',
									name: 'WigleToTAK',
									desc: 'Converts WiGLE data to TAK CoT messages.',
									installed: true
								}
							]
						},
						{
							id: 'cellular',
							name: 'Cellular & Trunked Radio',
							children: [
								{
									id: 'gsm-lte',
									name: 'GSM & LTE Monitoring',
									group: true,
									children: [
										{
											id: 'gr-gsm',
											name: 'gr-gsm',
											desc: 'GNU Radio blocks for receiving/decoding GSM.',
											installed: false,
											docs: 'https://github.com/velichkov/gr-gsm'
										},
										{
											id: 'gsm-evil',
											name: 'GSM Evil',
											desc: 'GSM signal monitoring + IMSI detection.',
											installed: true,
											view: 'gsm',
											docs: 'https://github.com/ninjhacks/gsmevil2'
										},
										{
											id: 'imsi-oros42',
											name: 'IMSI-catcher (Oros42)',
											desc: 'Passive IMSI collection (RTL-SDR + gr-gsm).',
											installed: false
										},
										{
											id: 'kalibrate',
											name: 'Kalibrate-hackrf',
											desc: 'GSM scanner + SDR frequency calibration.',
											installed: false
										},
										{
											id: 'srsran',
											name: 'srsRAN',
											desc: 'Open-source 4G LTE / 5G NR software radio suite.',
											installed: false,
											docs: 'https://docs.srsran.com/'
										}
									]
								},
								{
									id: 'trunked',
									name: 'Trunked Radio Decoding',
									group: true,
									children: [
										{
											id: 'trunk-recorder',
											name: 'Trunk Recorder',
											desc: 'Records P25 + SmartNet trunked systems.',
											installed: true,
											docs: 'https://trunkrecorder.com/'
										},
										{
											id: 'dsd-neo',
											name: 'dsd-neo',
											desc: 'Digital voice: DMR, P25, NXDN, D-STAR, EDACS, M17, YSF.',
											installed: false
										},
										{
											id: 'op25',
											name: 'OP25',
											desc: 'P25 trunked decoder with real-time audio + web UI.',
											installed: false,
											docs: 'https://op25.osmocom.org/trac/'
										},
										{
											id: 'osmo-tetra',
											name: 'osmo-tetra',
											desc: 'TETRA voice + SDS decoder.',
											installed: false
										}
									]
								}
							]
						},
						{
							id: 'aircraft-maritime',
							name: 'Aircraft & Maritime Tracking',
							children: [
								{
									id: 'acarsdec',
									name: 'acarsdec',
									desc: 'ACARS decoder for aircraft VHF text.',
									installed: false
								},
								{
									id: 'ais-catcher',
									name: 'AIS Catcher',
									desc: 'AIS maritime vessel tracking via RTL-SDR.',
									installed: true,
									docs: 'https://github.com/jvde-github/AIS-catcher'
								},
								{
									id: 'dump1090',
									name: 'Dump1090',
									desc: 'ADS-B 1090 MHz decoder, real-time aircraft plotting.',
									installed: true,
									docs: 'https://github.com/flightaware/dump1090'
								},
								{
									id: 'dumpvdl2',
									name: 'dumpvdl2',
									desc: 'VDL Mode 2 — CPDLC, ADS-C datalink.',
									installed: false
								},
								{
									id: 'readsb',
									name: 'ReadSB',
									desc: 'ARM-optimized ADS-B decoder.',
									installed: true
								},
								{
									id: 'tar1090',
									name: 'Tar1090',
									desc: 'Enhanced ADS-B web visualization.',
									installed: true,
									docs: 'https://github.com/wiedehopf/tar1090'
								}
							]
						},
						{
							id: 'satellite',
							name: 'Satellite Signal Intelligence',
							children: [
								{
									id: 'gr-iridium',
									name: 'gr-iridium',
									desc: 'Iridium L-band satellite SIGINT (1626 MHz).',
									installed: false
								},
								{
									id: 'gr-satellites',
									name: 'gr-satellites',
									desc: '100+ amateur/research satellite protocols.',
									installed: false
								}
							]
						},
						{
							id: 'pager',
							name: 'Pager & Analog Decoding',
							children: [
								{
									id: 'multimon-ng',
									name: 'multimon-ng',
									desc: 'POCSAG, FLEX, EAS, DTMF, AFSK/APRS, Morse, ZVEI.',
									installed: false,
									docs: 'https://github.com/EliasOenal/multimon-ng'
								},
								{
									id: 'pagermon',
									name: 'Pagermon',
									desc: 'POCSAG/FLEX pager signal monitoring.',
									installed: true
								}
							]
						},
						{
							id: 'iot-recon',
							name: 'IoT & Sub-GHz Collection',
							children: [
								{
									id: 'rtl-433',
									name: 'RTL-433',
									desc: '280+ IoT protocols (433/315/868/915 MHz).',
									installed: true,
									docs: 'https://github.com/merbanan/rtl_433'
								},
								{
									id: 'sdr-lora',
									name: 'SDR-Lora',
									desc: 'LoRa PHY-layer SDR with GNU Radio.',
									installed: false
								},
								{
									id: 'zigator',
									name: 'Zigator',
									desc: 'ZigBee traffic analysis + protocol dissection.',
									installed: false
								}
							]
						},
						{
							id: 'drone-recon',
							name: 'Drone & UAS Detection',
							children: [
								{
									id: 'drone-id',
									name: 'Drone ID',
									desc: 'Passive DJI DroneID decoding from WiFi.',
									installed: true
								},
								{
									id: 'dronesecurity',
									name: 'DroneSecurity',
									desc: 'DJI DroneID protocol reverse-engineering.',
									installed: false
								},
								{
									id: 'rf-drone-det',
									name: 'RF-Drone-Detection',
									desc: 'Passive RF drone detection with ML.',
									installed: false
								}
							]
						},
						{
							id: 'rf-fingerprint',
							name: 'RF Fingerprinting & Geolocation',
							children: [
								{
									id: 'atakrr',
									name: 'ATAKrr',
									desc: 'AI/ML RF device fingerprinting with CoT output.',
									installed: false
								},
								{
									id: 'find-lf',
									name: 'Find-LF',
									desc: 'Distributed WiFi positioning via RPi sensor nodes.',
									installed: false
								},
								{
									id: 'trackerjacker',
									name: 'TrackerJacker',
									desc: 'Passive WiFi tracker via probe requests.',
									installed: false
								}
							]
						}
					]
				},
				{
					id: 'attack',
					name: 'ATTACK',
					children: [
						{
							id: 'wifi-disrupt',
							name: 'WiFi Disruption & Exploitation',
							children: [
								{
									id: 'wifi-deauth',
									name: 'Denial & Deauthentication',
									group: true,
									children: [
										{
											id: 'bettercap-deauth',
											name: 'Bettercap',
											desc: 'WiFi deauth, probing, BLE disruption, PMKID capture.',
											installed: true
										},
										{
											id: 'aireplay-ng',
											name: 'Aireplay-NG',
											desc: 'Packet injection — deauth, handshake, fragmentation.',
											installed: false
										},
										{
											id: 'mdk4',
											name: 'mdk4',
											desc: 'Multi-mode WiFi DoS — beacon/deauth/SSID brute.',
											installed: false
										},
										{
											id: 'bl0ck',
											name: 'Bl0ck',
											desc: 'WiFi 5/6 Block Ack frame interruption (802.11ac/ax).',
											installed: false
										},
										{
											id: 'scapy-80211',
											name: 'Scapy 802.11',
											desc: 'Custom 802.11 frame crafting.',
											installed: false
										}
									]
								},
								{
									id: 'handshake',
									name: 'Handshake Capture & Cracking',
									group: true,
									children: [
										{
											id: 'wifite2',
											name: 'Wifite2',
											desc: 'Automated WiFi auditing — handshake, PMKID, WPS.',
											installed: true
										},
										{
											id: 'hcxdumptool',
											name: 'HCXDumpTool',
											desc: 'PMKID + WPA handshake capture w/o client deauth.',
											installed: false
										},
										{
											id: 'airgeddon',
											name: 'Airgeddon',
											desc: 'Menu-driven WiFi multi-attack suite.',
											installed: false
										},
										{
											id: 'wef',
											name: 'WEF',
											desc: 'Automated WiFi exploitation framework.',
											installed: false
										},
										{
											id: 'fragattacks',
											name: 'FragAttacks',
											desc: '802.11 fragmentation + aggregation exploits.',
											installed: false
										}
									]
								}
							]
						},
						{
							id: 'rogue-ap',
							name: 'Rogue AP & Credential Capture',
							children: [
								{
									id: 'wifi-pumpkin3',
									name: 'WiFi Pumpkin3',
									desc: 'Rogue AP with MITM, SSL strip, DNS spoof.',
									installed: false
								},
								{
									id: 'wifiphisher',
									name: 'Wifiphisher',
									desc: 'Automated rogue AP + phishing templates.',
									installed: false
								},
								{
									id: 'wifi-pineapple-pi',
									name: 'WiFi Pineapple Pi',
									desc: 'Rogue AP + captive portal + credential harvest.',
									installed: false
								},
								{
									id: 'eaphammer',
									name: 'EAPHammer',
									desc: 'WPA2-Enterprise evil twin (802.1X/EAP).',
									installed: false
								},
								{
									id: 'fluxion',
									name: 'Fluxion',
									desc: 'Evil twin + captive portal for WPA/WPA2.',
									installed: false
								}
							]
						},
						{
							id: 'bt-exploit',
							name: 'Bluetooth & BLE Exploitation',
							children: [
								{
									id: 'bluesnarfer',
									name: 'BlueSnarfer',
									desc: 'Bluetooth OBEX exploit — phonebook/SMS/files.',
									installed: false
								},
								{
									id: 'bluetoolkit',
									name: 'BlueToolkit',
									desc: 'BT Classic/BLE attack framework.',
									installed: false
								},
								{
									id: 'bluing',
									name: 'Bluing',
									desc: 'BT Classic/BLE recon + vuln scanning.',
									installed: false
								},
								{
									id: 'mirage',
									name: 'Mirage Framework',
									desc: 'Multi-protocol wireless attack (BLE, ZigBee, IR).',
									installed: false
								}
							]
						},
						{
							id: 'drone-gps',
							name: 'Drone Defeat & GPS Spoofing',
							children: [
								{
									id: 'dronesploit',
									name: 'DroneSploit',
									desc: 'Drone exploit framework — MAVLink/DJI attacks.',
									installed: false
								},
								{
									id: 'gps-sdr-sim',
									name: 'GPS-SDR-SIM',
									desc: 'GPS L1 C/A spoofed signal generator via SDR.',
									installed: false
								}
							]
						},
						{
							id: 'rf-jamming',
							name: 'RF Jamming & Spectrum Denial',
							children: [
								{
									id: 'cleverjam',
									name: 'CleverJam',
									desc: 'Smart adaptive-frequency jammer.',
									installed: false
								},
								{
									id: 'jamrf',
									name: 'JamRF',
									desc: 'Broadband jamming — proactive/reactive modes.',
									installed: false
								}
							]
						},
						{
							id: 'iot-attack',
							name: 'IoT & Sub-GHz Exploitation',
							children: [
								{
									id: 'rfcrack',
									name: 'RFCrack',
									desc: 'Sub-GHz replay/brute/jam (300–928 MHz).',
									installed: false
								},
								{
									id: 'laf',
									name: 'LoRa Attack Toolkit (LAF)',
									desc: 'LoRaWAN audit — inject, replay, gateway spoof.',
									installed: false
								}
							]
						},
						{
							id: 'tak-attack',
							name: 'TAK Network Exploitation',
							children: [
								{
									id: 'cot-inject',
									name: 'CoT Injection & Manipulation',
									group: true,
									children: [
										{
											id: 'cotproxy',
											name: 'CoTProxy',
											desc: 'In-line CoT transformation proxy.',
											installed: false
										},
										{
											id: 'push-cot',
											name: 'Push Cursor on Target',
											desc: 'Inject fabricated CoT positions into TAK.',
											installed: false
										}
									]
								},
								{
									id: 'meshtastic',
									name: 'Meshtastic Targeting',
									group: true,
									children: [
										{
											id: 'meshtastic-freq',
											name: 'Meshtastic Freq Calc',
											desc: 'LoRa freq slots from Meshtastic channel names.',
											installed: false
										}
									]
								}
							]
						}
					]
				},
				{
					id: 'defense',
					name: 'DEFENSE',
					children: [
						{
							id: 'cellular-threat',
							name: 'Cellular Threat Detection',
							children: [
								{
									id: 'crocodile-hunter',
									name: 'Crocodile Hunter',
									desc: 'EFF 4G/LTE fake base station detector (srsRAN).',
									installed: false
								}
							]
						}
					]
				},
				{
					id: 'utilities',
					name: 'UTILITIES',
					children: [
						{
							id: 'sig-record',
							name: 'Signal Recording & Analysis',
							children: [
								{
									id: 'sigmf',
									name: 'SigMF',
									desc: 'Standardized JSON sidecar for IQ recordings.',
									installed: false
								},
								{
									id: 'inspectrum',
									name: 'Inspectrum',
									desc: 'Offline RF analysis — visualize + decode IQ files.',
									installed: false
								}
							]
						},
						{
							id: 'sdr-infra',
							name: 'SDR Infrastructure & Frameworks',
							children: [
								{
									id: 'soapy-remote',
									name: 'SoapyRemote',
									desc: 'Stream SoapySDR devices over the network.',
									installed: false
								},
								{
									id: 'fissure',
									name: 'Fissure',
									desc: 'Comprehensive RF framework — 100+ attack scripts.',
									installed: false
								},
								{
									id: 'rfsec-toolkit',
									name: 'RFSEC Toolkit',
									desc: 'Curated RF security tool collection.',
									installed: true
								},
								{
									id: 'urh',
									name: 'Universal Radio Hacker',
									desc: 'Wireless protocol investigation + reverse-eng.',
									installed: true
								},
								{
									id: 'rf-emitter',
									name: 'RF Emitter',
									desc: 'Argos built-in HackRF TX (1 MHz–6 GHz).',
									installed: true
								}
							]
						},
						{
							id: 'pwd-recovery',
							name: 'Password & Credential Recovery',
							children: [
								{
									id: 'hashcat',
									name: 'Hashcat',
									desc: 'Password recovery + WPA2/WPA3 cracking.',
									installed: false
								}
							]
						},
						{
							id: 'tak-integration',
							name: 'TAK Integration & Gateways',
							children: [
								{
									id: 'cot-gateways',
									name: 'CoT Sensor Gateways',
									group: true,
									children: [
										{
											id: 'adsbcot',
											name: 'ADSBCot',
											desc: 'ADS-B aircraft → CoT bridge for TAK.',
											installed: false
										},
										{
											id: 'aiscot',
											name: 'AISCot',
											desc: 'AIS maritime → CoT bridge.',
											installed: false
										},
										{
											id: 'aprscot',
											name: 'APRSCot',
											desc: 'APRS amateur radio → CoT bridge.',
											installed: false
										},
										{
											id: 'djicot',
											name: 'DJICot',
											desc: 'DJI drone telemetry → CoT bridge.',
											installed: false
										},
										{
											id: 'dronecot',
											name: 'DroneCot',
											desc: 'Remote ID drone detection → CoT.',
											installed: false
										},
										{
											id: 'inrcot',
											name: 'InrCot',
											desc: 'Garmin inReach positions → CoT.',
											installed: false
										},
										{
											id: 'spotcot',
											name: 'SpotCot',
											desc: 'Globalstar SPOT positions → CoT.',
											installed: false
										}
									]
								},
								{
									id: 'tak-libs',
									name: 'TAK Protocol Libraries',
									group: true,
									children: [
										{
											id: 'pytak',
											name: 'PyTAK',
											desc: 'Python TAK client/server framework.',
											installed: false
										},
										{
											id: 'takproto',
											name: 'TAKProto',
											desc: 'Pure-Python TAK Protocol / CoT encoder.',
											installed: false
										},
										{
											id: 'wireshark-tak',
											name: 'Wireshark TAK Dissector',
											desc: 'Lua dissector for native TAK/CoT traffic.',
											installed: false
										}
									]
								}
							]
						}
					]
				}
			]
		},
		{
			id: 'onnet',
			name: 'ONNET',
			desc: 'Requires a connection to the target network',
			children: [
				{
					id: 'net-recon-cat',
					name: 'NETWORK',
					children: [
						{
							id: 'net-recon',
							name: 'Network Reconnaissance & Fingerprinting',
							children: [
								{
									id: 'wireshark',
									name: 'Wireshark',
									desc: 'Interactive packet capture + 3000+ dissectors (noVNC).',
									installed: true,
									view: 'spectrum'
								},
								{
									id: 'p0f',
									name: 'p0f',
									desc: 'Passive OS fingerprinting from TCP/IP stack.',
									installed: false
								},
								{
									id: 'ndpi',
									name: 'nDPI',
									desc: 'Deep packet inspection — 300+ app protocols.',
									installed: false
								},
								{
									id: 'satori',
									name: 'Satori',
									desc: 'Device fingerprinting via DHCP/CDP/mDNS/UPnP.',
									installed: false
								},
								{
									id: 'cryptolyzer',
									name: 'CryptoLyzer',
									desc: 'TLS/SSL cipher + certificate analysis.',
									installed: false
								}
							]
						},
						{
							id: 'net-attack',
							name: 'Network Attack & Credential Capture',
							children: [
								{
									id: 'ettercap',
									name: 'Ettercap',
									desc: 'MITM — ARP poison, DNS spoof, credential sniff.',
									installed: false
								},
								{
									id: 'responder',
									name: 'Responder',
									desc: 'LLMNR/NBT-NS/mDNS poisoner — NTLMv2 capture.',
									installed: false
								},
								{
									id: 'bettercap-net',
									name: 'Bettercap',
									desc: 'Network attack + monitoring framework.',
									installed: true
								},
								{
									id: 'mqtt-pwn',
									name: 'MQTT-PWN',
									desc: 'MQTT broker exploitation — enum + brute + inject.',
									installed: false
								}
							]
						}
					]
				}
			]
		},
		{
			id: 'osint',
			name: 'OSINT',
			desc: 'Open-source intelligence & geospatial recon',
			children: [
				{
					id: 'osint-cat',
					name: 'OSINT',
					children: [
						{
							id: 'osint-geoint',
							name: 'OSINT & Geospatial Intelligence',
							children: [
								{
									id: 'sightline',
									name: 'Sightline',
									desc: 'Geospatial infra intel — telecom, data centers, mil via OSM.',
									installed: true
								},
								{
									id: 'spiderfoot',
									name: 'SpiderFoot',
									desc: 'OSINT automation — 200+ modules.',
									installed: true
								}
							]
						}
					]
				}
			]
		}
	]
};

export interface ToolIndexEntry {
	tool: CatalogTool;
	pillar: ToolPillarName;
	categoryId: string;
	subcategoryId: string;
	groupId?: string;
}

function isGroup(node: CatalogSubItem): node is CatalogToolGroup {
	return 'group' in node && node.group === true;
}

interface IndexContext {
	idx: Map<string, ToolIndexEntry>;
	pillar: ToolPillarName;
	categoryId: string;
	subcategoryId: string;
}

function indexLeaf(ctx: IndexContext, tool: CatalogTool, groupId?: string): void {
	ctx.idx.set(tool.id, {
		tool,
		pillar: ctx.pillar,
		categoryId: ctx.categoryId,
		subcategoryId: ctx.subcategoryId,
		groupId
	});
}

function indexNode(ctx: IndexContext, node: CatalogSubItem): void {
	if (isGroup(node)) {
		for (const tool of node.children) indexLeaf(ctx, tool, node.id);
	} else {
		indexLeaf(ctx, node);
	}
}

function indexSubcategory(
	idx: Map<string, ToolIndexEntry>,
	pillarName: ToolPillarName,
	categoryId: string,
	sub: CatalogCategory
): void {
	const ctx: IndexContext = { idx, pillar: pillarName, categoryId, subcategoryId: sub.id };
	for (const node of sub.children) indexNode(ctx, node);
}

function indexCategory(
	idx: Map<string, ToolIndexEntry>,
	pillarName: ToolPillarName,
	cat: CatalogSubcategory
): void {
	for (const sub of cat.children) {
		indexSubcategory(idx, pillarName, cat.id, sub);
	}
}

function indexPillar(idx: Map<string, ToolIndexEntry>, pillar: CatalogPillar): void {
	for (const cat of pillar.children) {
		indexCategory(idx, pillar.name, cat);
	}
}

export function buildToolIndex(catalog: ToolsCatalog = toolsCatalog): Map<string, ToolIndexEntry> {
	const idx = new Map<string, ToolIndexEntry>();
	for (const pillar of catalog.root) {
		indexPillar(idx, pillar);
	}
	return idx;
}

export function countTools(catalog: ToolsCatalog = toolsCatalog): {
	total: number;
	installed: number;
	notInstalled: number;
} {
	const entries = Array.from(buildToolIndex(catalog).values());
	const total = entries.length;
	const installed = entries.filter((e) => e.tool.installed).length;
	return { total, installed, notInstalled: total - installed };
}
