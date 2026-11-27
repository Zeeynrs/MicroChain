# Design: MicroChain

The locked system. Every Hallmark run reads this first and pages share it. Change it on purpose; the file is the rule.

## System
- Genre: modern-minimal
- Shape of the first page: Narrative Workflow (landing); app screen (dashboard, network, simulator, comparison, data)
- Theme: Vantage, steel colourway, by request
- Axes: dark/grotesk-sans/chromatic-lime · posture: restrained
- Surfaces by route: the landing and sign-in on the night ground; the app on a paper-white work surface under a night rail (the owner's choice)

## Tokens
`app/tokens.css` is the source of truth. `lib/chart-tokens.ts` mirrors the app hex values for Recharts and React Flow. The roles:
```css
:root {
  --color-paper: oklch(13.5% 0.012 235);  --color-paper-2: oklch(17% 0.014 235);  --color-paper-3: oklch(21% 0.016 235);
  --color-ink: oklch(95% 0.006 230);  --color-ink-2: oklch(82% 0.012 230);  --color-muted: oklch(66% 0.016 230);
  --color-rule: oklch(27% 0.014 235);  --color-rule-2: oklch(34% 0.016 235);
  --color-accent: oklch(89% 0.19 126);  --color-accent-hi: oklch(93% 0.17 126);  --color-accent-ink: oklch(19% 0.04 126);
  --color-down: oklch(70% 0.14 32);  --color-caution: oklch(84% 0.12 85);
  --point-lo: oklch(42% 0.04 245);  --point-mid: oklch(70% 0.04 232);  --point-hi: oklch(96% 0.02 215);
  /* app work surface */
  --app-bg: oklch(97.2% 0.003 230);  --color-card: oklch(99.4% 0.002 230);  --color-card-ink: oklch(21% 0.016 235);
  --color-card-muted: oklch(47% 0.016 235);  --app-rule: oklch(90.5% 0.006 235);  --app-select: oklch(95.5% 0.075 126);
  --color-signal-ink: oklch(44% 0.11 132);
  --font-display: "Geologica Variable";  --font-body: "Geologica Variable";
  --radius-card: 4px;  --radius-control: 4px;  --radius-pill: 999px;  --rule-hair: 1px;  --tick: 10px;
  --display-weight: 300;  --tracking-display: -0.035em;
}
```
The spacing scale, the type scale, the easings and the durations are the scaffold's and live in `tokens.css`. Each surface sets `--on`, `--on-muted`, `--on-line`, `--on-field`, `--on-well` and the three `--tag-*` tones; `globals.css` reads only those.

## Type
- Geologica, one family. Heads 300 with `"SHRP" 100` (sharpened corners), small titles 400; body 300 on the night ground, 400 in the app.
- Figures are Geologica with `tabular-nums`, the unit a step smaller in muted. Never mono, never tracked capitals.

## Surfaces
- Night ground: paper, one quiet band (`paper-2`) for the gallery and the close. Flat, no shadows.
- Frames are drawn only at their corners (`.ticks`); full hairline boxes only for inputs.
- Photographs and the kitchen video are muted (`saturate(0.8) contrast(1.06)`), 4px radius.
- App: a night rail and night figure bands (overview, results) on a paper-white surface; panels are hairline frames.

## The signature
`components/landing/plan-lattice.tsx`: the Dapur Sari solution space drawn as points. Every integer plan (Roti 0 to 100, Kue kering 0 to 30) is one point, height its net contribution; plans past the flour limit fall to the floor; the optimum is lime with a leader callout. It reads its colours from the tokens. The hero shows the mitigation scenario; the pinned story follows `data-stage` (1 normal, 2 outage, 3 mitigation).

## Controls
- Primary: lime pill, `--color-accent-ink` text, 48px on the landing and sign-in, 40px in the app (44px hit target).
- Secondary: a hairline pill in `--on-line`, ink text.
- Lime marks only what is found, live, primary or selected. On the paper-white app surface the selection ring and links take `--color-signal-ink`, since lime on white fails contrast.

## Motion
One fade-up reveal for heads, panels and rows; the pinned story recounts its figure 450.000 to 210.000 to 342.000 while the lattice re-solves. The lattice sways slowly, a sweep passes every seven seconds, the pointer tilts it a few degrees, and it pauses off screen. Reduced motion: one still frame, stages switch instantly, nothing hidden.

## Exports
`app/tokens.css` (Tailwind 4 `@theme static` plus `:root`), `app/base.css` in the base layer, `lib/chart-tokens.ts` for SVG libraries.
