<script lang="ts">
	// spec-024 PR2 T016 — Mk II Sparkline primitive.
	// Pure SVG (no canvas) — `viewBox` + `preserveAspectRatio="none"` makes the
	// 200×height design-coordinate path stretch fluidly to the parent's width
	// without re-rasterizing. Two paths: filled area (12% accent) + 1-px line.
	// Empty / single-point data falls back to a flat midline so consumers can
	// stream new values without guarding the array length upstream.

	interface Props {
		data: readonly number[];
		color?: string;
		fill?: boolean;
		height?: number;
		ariaLabel?: string;
	}

	let {
		data,
		color = 'var(--mk2-accent)',
		fill = true,
		height = 28,
		ariaLabel = 'sparkline'
	}: Props = $props();

	const W = 200;

	function minMax(values: readonly number[]): [number, number] {
		let lo = Infinity;
		let hi = -Infinity;
		for (const v of values) {
			if (v < lo) lo = v;
			if (v > hi) hi = v;
		}
		return [lo, hi];
	}

	function buildLinePath(values: readonly number[], h: number): string {
		const [min, max] = minMax(values);
		const span = max - min || 1;
		const denom = values.length - 1;
		let path = '';
		for (let i = 0; i < values.length; i++) {
			const x = (i / denom) * W;
			const y = h - ((values[i] - min) / span) * (h - 2) - 1;
			path += (i === 0 ? 'M' : 'L') + x.toFixed(2) + ',' + y.toFixed(2) + ' ';
		}
		return path.trim();
	}

	const geometry = $derived.by(() => {
		const h = height;
		if (data.length < 2) {
			const y = h / 2;
			return { line: `M0,${y} L${W},${y}`, area: '' };
		}
		const line = buildLinePath(data, h);
		return { line, area: `${line} L${W},${h} L0,${h} Z` };
	});
</script>

<svg
	viewBox={`0 0 ${W} ${height}`}
	preserveAspectRatio="none"
	role="img"
	aria-label={ariaLabel}
	style:width="100%"
	style:height={`${height}px`}
	style:display="block"
>
	{#if fill && geometry.area}
		<path d={geometry.area} fill={color} opacity="0.12"></path>
	{/if}
	<path
		d={geometry.line}
		stroke={color}
		stroke-width="1"
		fill="none"
		vector-effect="non-scaling-stroke"
	></path>
</svg>
