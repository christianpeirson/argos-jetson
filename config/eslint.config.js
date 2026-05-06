import js from '@eslint/js';
import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';
import boundaries from 'eslint-plugin-boundaries';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import sonarjs from 'eslint-plugin-sonarjs';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import svelteParser from 'svelte-eslint-parser';

export default [
	js.configs.recommended,
	{
		ignores: [
			'node_modules/**',
			'build/**',
			'.svelte-kit/**',
			'.next/**',
			'package/**',
			'**/.venv/**',
			'**/venv/**',
			'**/dist/**',
			'service/dist/**',
			'.env',
			'.env.*',
			'!.env.example',
			'vite.config.js.timestamp-*',
			'vite.config.ts.timestamp-*',
			'hackrfbackup.svelte',
			'tests/reports/**',
			'tests/reports/**/*.js',
			'data/reports/**',
			'playwright-report/**',
			'static/webtak/**',
			// Quarto-generated report artifacts (revealjs, katex, highlight,
			// etc.) land in data/reports/ and include thousands of vendor JS
			// files that ESLint shouldn't scan. The whole data/ tree is
			// gitignored already; this mirrors that for the linter.
			'data/**',
			// Spec 026 reference docs cloned under docs/ (argos-v2-mockup,
			// carbon-design-system, carbon-website). All gitignored; mirror
			// here so ESLint doesn't scan thousands of vendor JSX/JS files
			// from Carbon and the v2 mockup.
			'docs/argos-v2-mockup/**',
			'docs/carbon-design-system/**',
			'docs/carbon-website/**'
		]
	},
	{
		files: ['**/*.js', '**/*.ts', '**/*.svelte'],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'module',
			globals: {
				...globals.browser,
				...globals.node,
				...globals.es2022,
				NodeJS: 'readonly'
			}
		},
		plugins: {
			'simple-import-sort': simpleImportSort
		},
		rules: {
			'no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_'
				}
			],
			'simple-import-sort/imports': 'error',
			'simple-import-sort/exports': 'error',
			// LOC caps — closes the gap that fallow.tools' `health` command does NOT cover
			// (verified against `fallow config-schema` 2026-05-04: only maxCyclomatic/maxCognitive/maxCrap exposed).
			// Per .claude/rules/architecture.md "300 LOC/file, 50 LOC/fn" — promoted from
			// aspirational text to mechanical enforcement in the fallow install PR (2026-05-04).
			// Severity: 'warn' initially because ESLint has no baseline-grandfather mechanism
			// (fallow does, but only for complexity/dupes/dead-code). Day-1 violator count: 158.
			// Promotion to 'error' tracked as Migration Roadmap item 13 (post-cleanup).
			// Rules live in the GENERAL .js/.ts/.svelte block (not TS-only) so dangerfile.js
			// and other root .js files get covered — fixes a JS-shape blind spot revealed by
			// fallow's Pass 0 (dangerfile.js:155 CC=13 was never caught by ESLint complexity
			// because that rule was TS-only).
			'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],
			'max-lines-per-function': [
				'warn',
				{ max: 50, skipBlankLines: true, skipComments: true, IIFEs: true }
			]
		}
	},
	{
		files: ['**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			globals: {
				$state: 'readonly',
				$derived: 'readonly',
				$effect: 'readonly',
				$props: 'readonly',
				$bindable: 'readonly',
				$inspect: 'readonly',
				$host: 'readonly'
			}
		}
	},
	{
		files: ['**/*.ts', '**/*.svelte'],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				project: false, // Disable type checking for performance
				ecmaVersion: 2022,
				sourceType: 'module'
			}
		},
		plugins: {
			'@typescript-eslint': ts,
			sonarjs
		},
		rules: {
			...ts.configs.recommended.rules, // Use non-type-checked rules
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_'
				}
			],
			'@typescript-eslint/no-explicit-any': 'warn', // Enforce proper typing
			'@typescript-eslint/explicit-module-boundary-types': 'off',
			'@typescript-eslint/no-non-null-assertion': 'warn', // Prefer type guards
			'no-console': ['warn', { allow: ['warn', 'error'] }], // Use proper logging
			complexity: ['error', 5], // Cyclomatic complexity — hard block, no exceptions
			'sonarjs/cognitive-complexity': ['error', 5] // Cognitive complexity — hard block, no exceptions
			// (max-lines + max-lines-per-function moved to the general .js/.ts/.svelte block
			// at top of config so .js files like dangerfile.js are covered — see comment there.)
		}
	},
	// Spec-026 Phase 8.8: spread eslint-plugin-svelte's recommended preset.
	// `svelte.configs.recommended` is a flat-config ARRAY (4 entries: plugin
	// registration, *.svelte parser config, *.svelte.{js,ts} parser config,
	// shared 35-rule block). Spreading the array is the correct way to apply
	// the preset; spreading `.rules` was a no-op because arrays don't expose a
	// `.rules` property. Argos-specific overrides for parser sub-parser and
	// rule downgrades follow in the next entry.
	...svelte.configs.recommended,
	{
		// Argos parser override: recommended preset's parser config for
		// `.svelte.{js,ts}` does not wire the TypeScript sub-parser. Without
		// it, `.svelte.ts` module-state files raise "Parsing error: Unexpected
		// token" on every type annotation. The svelte-eslint-parser README
		// documents this exact override.
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parser: svelteParser,
			parserOptions: {
				parser: tsParser
			}
		},
		rules: {
			// svelte/require-each-key: ERROR (default from recommended preset)
			// after the 18-site cleanup landed in the follow-up PR — all
			// `{#each}` blocks now carry stable keys.
			//
			// svelte/no-at-html-tags: ERROR (default from recommended preset).
			// 7 audited files render hard-coded SVG icon strings only; they're
			// whitelisted via the files-pattern override below. Each
			// whitelisted file carries a top-of-file
			// `@audit-svelte-no-at-html-tags` HTML comment with per-file
			// reasoning. Re-audit + remove from the list before adding any
			// user-derived `{@html}` content.
		}
	},
	{
		// Spec-026 Phase 8.8 cleanup PR — XSS-audited `{@html}` whitelist.
		// Each file in this list renders ONLY hard-coded SVG icon strings
		// from $lib/data/tool-icons.ts / weather-helpers.ts / buildConeSVG()
		// with no user input vector. See the `@audit-svelte-no-at-html-tags`
		// comment at the top of each listed file for per-file reasoning.
		files: [
			'src/lib/components/dashboard/DashboardMap.svelte',
			'src/lib/components/dashboard/TopStatusBar.svelte',
			'src/lib/components/dashboard/panels/OnnetToolsPanel.svelte',
			'src/lib/components/dashboard/panels/ToolsPanelHeader.svelte',
			'src/lib/components/dashboard/shared/ToolCard.svelte',
			'src/lib/components/dashboard/shared/ToolCategoryCard.svelte',
			'src/lib/components/dashboard/status/CoordsDisplay.svelte'
		],
		rules: {
			'svelte/no-at-html-tags': 'off'
		}
	},
	{
		files: ['**/*.cjs'],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'commonjs',
			globals: {
				...globals.node
			}
		},
		rules: {
			'no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_'
				}
			]
		}
	},
	{
		files: ['**/*.mjs'],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'module',
			globals: {
				...globals.node
			}
		}
	},
	{
		// Production code under src/ must not use the `!` non-null assertion.
		// Tests/scripts stay at the global 'warn' level (mocking + setup code
		// legitimately uses `!` for type narrowing on known-safe values).
		files: ['src/**/*.{js,ts,svelte}'],
		rules: {
			'@typescript-eslint/no-non-null-assertion': 'error'
		}
	},
	{
		// Architectural boundaries (eslint-plugin-boundaries v6).
		// Mirrors .sentrux/rules.toml layer ordering + the 3 client→server
		// hard boundaries. Sentrux Free tier caps check_rules at 3 simultaneous
		// rules, so we trim sentrux to max_cycles=0 + 2 boundaries and let
		// ESLint enforce the rest at lint time (uncapped, fires on every
		// commit via husky). The architectural fitness tests in
		// tests/architecture/ are the comprehensive third tier.
		files: ['src/**/*.{js,ts,svelte}'],
		plugins: {
			boundaries
		},
		settings: {
			'boundaries/elements': [
				{ type: 'route', pattern: 'src/routes/**' },
				{ type: 'component', pattern: 'src/lib/components/**' },
				{ type: 'state', pattern: ['src/lib/stores/**', 'src/lib/state/**'] },
				{ type: 'server', pattern: 'src/lib/server/**' },
				{ type: 'util', pattern: 'src/lib/utils/**' },
				{ type: 'type', pattern: ['src/lib/types/**', 'src/lib/schemas/**'] }
			],
			'boundaries/include': ['src/**/*.{js,ts,svelte}'],
			'boundaries/ignore': ['**/*.{test,spec}.{js,ts}', 'src/lib/server/mcp/**']
		},
		rules: {
			'boundaries/dependencies': [
				'error',
				{
					default: 'allow',
					rules: [
						{
							from: { type: 'component' },
							disallow: { to: { type: 'server' } },
							message:
								'Components must call /api endpoints, never import server modules directly'
						},
						{
							from: { type: 'state' },
							disallow: { to: { type: 'server' } },
							message:
								'Stores/state must call /api endpoints, never import server modules directly'
						},
						{
							from: { type: 'state' },
							disallow: { to: { type: 'component' } },
							message:
								'state must not import from components (inverted layer direction)'
						},
						{
							from: { type: 'type' },
							disallow: { to: { type: ['state', 'component', 'server'] } },
							message: 'types must be leaves — no imports of state/components/server'
						},
						{
							from: { type: 'util' },
							disallow: { to: { type: ['state', 'component', 'server'] } },
							message: 'utils must not import from state/components/server'
						}
					]
				}
			]
		}
	},
	prettier
];
