// Dashboard main-content view identity. Lives in types/ so non-store
// callers (e.g. types/tools.ts which references viewName for activeView
// routing in tool definitions) can reference the type without pulling
// client-state code.
//
// 'map' = default map view (State 1 or 2)
// other values = full-screen tool views (State 3)

export type ActiveView =
	| 'map'
	| 'kismet'
	| 'openwebrx'
	| 'novasdr'
	| 'bettercap'
	| 'hackrf'
	| 'gsm-evil'
	| 'rtl-433'
	| 'btle'
	| 'droneid'
	| 'pagermon'
	| 'rf-emitter'
	| 'wifite'
	| 'wigletotak'
	| 'bluehood'
	| 'sightline'
	| 'spiderfoot'
	| 'webtak'
	| 'tak-config'
	| 'globalprotect'
	| 'gnu-radio'
	| 'logs-analytics'
	| 'sparrow-wifi'
	| 'sdrpp'
	| 'trunk-recorder'
	| 'uas-scan'
	| 'wireshark';

export const VALID_VIEWS: ReadonlySet<string> = new Set<ActiveView>([
	'map',
	'kismet',
	'openwebrx',
	'novasdr',
	'bettercap',
	'hackrf',
	'gsm-evil',
	'rtl-433',
	'btle',
	'droneid',
	'pagermon',
	'rf-emitter',
	'wifite',
	'wigletotak',
	'bluehood',
	'sightline',
	'spiderfoot',
	'webtak',
	'tak-config',
	'globalprotect',
	'gnu-radio',
	'logs-analytics',
	'sparrow-wifi',
	'sdrpp',
	'uas-scan',
	'wireshark'
]);
