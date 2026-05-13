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
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parser: svelteParser,
			parserOptions: {
				parser: tsParser
			}
		},
		plugins: {
			svelte
		},
		rules: {
			// spec-026 Phase 8.8 fix (2026-05-04): `svelte.configs.recommended`
			// in eslint-plugin-svelte v3+ is a flat-config ARRAY of 4 items,
			// NOT an object. `.rules` on the array itself is undefined, which
			// is why the previous spread silently no-op'd. Rules actually live
			// on items[1] (4 svelte-scoped) and items[3] (35 generic).
			//
			// Verified via runtime probe against eslint-plugin-svelte v3.10.1:
			//   recommended[1].rules: 4 rules (2 error, 2 off — comment-directive,
			//                         system, no-inner-declarations off, no-self-
			//                         assign off — scoped to *.svelte via files filter)
			//   recommended[3].rules: 35 rules (33 error, 2 warn — Svelte-AST
			//                         specific bug-catchers; no files filter so
			//                         they apply repo-wide but only fire on
			//                         svelte syntax)
			//
			// Why explicit indices instead of `...svelte.configs.recommended`
			// at top level: Argos's custom svelte block (this one) sets
			// `parserOptions: { parser: tsParser }` to handle `<script lang="ts">`,
			// which the bundled recommended config does NOT. Spreading the array
			// at top level introduces the recommended's parser block first; the
			// later block here would have to override languageOptions deeply.
			// Index-spreading the rules object is simpler and parser-conflict-free.
			//
			// `eslint-plugin-svelte` ships ZERO a11y rules — a11y enforcement
			// remains svelte-compiler territory via svelte-check.
			...svelte.configs.recommended[1].rules,
			...svelte.configs.recommended[3].rules,

			// Phase 8.8 selective downgrades — pre-existing issues surfaced when
			// the recommended spread was first activated (2026-05-04). Both fire
			// as legitimate findings but are out-of-scope for this config-fix
			// PR per the umbrella plan §8.8: "any pre-existing-issue rule that
			// fires as ERROR gets downgraded to WARN with inline comment +
			// Phase 8 follow-up note for proper fix."
			//
			// Follow-up issues (TODO file):
			// - svelte/require-each-key (~21 sites): every {#each} should pass
			//   a unique key. Risk: Svelte 5 keyed-each tracking falls back to
			//   index-based reuse, which can desync DOM state on re-render
			//   (e.g., focused input loses focus when list reorders). Each
			//   site needs a per-iteration unique field. Bundle as a sweep PR.
			// - svelte/no-at-html-tags (~7 sites): `{@html}` flagged as XSS risk.
			//   All current Argos sites use it for known-safe content (Lucide
			//   icon SVG strings + pre-formatted status badges). Each site
			//   needs a per-call audit confirming the input is either a
			//   compile-time literal or sanitized via DOMPurify. Bundle as a
			//   security-review pass PR with explicit `// eslint-disable-next-
			//   line` justifications where the audit confirms safety.
			'svelte/require-each-key': 'warn',
			'svelte/no-at-html-tags': 'warn'
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
