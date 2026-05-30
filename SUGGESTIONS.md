# SunScope: Audience-Iteration Pass (2026-05-30)

Builds on the converged 3-iteration deep panel (warm-to-cool light ramp + live cast-shadow polygon). This pass is additive only, no rebuilds, no deploys.

## The single ideal evangelist

A 28-year-old apartment hunter in Brooklyn who just got a virtual tour link from StreetEasy, lives on r/AskNYC and r/NYCapartments, and is about to sign a 12-month lease on a unit with windows they have never stood in front of in daylight. They use Google Maps shadow imagery as a hack, do not trust listing photos, and asked Reddit "which way does this building face" 3 hours ago. Share-trigger: a screenshot showing "South face, floor 5: about 4 hours of direct sun in summer, dim in winter" dropped into the Reddit thread or a group chat with their partner. 5-second bounce risk: lands on an empty search box with no idea what to type, no proof it works, and bounces before geocoding their address.

## Ground-truth verdict

Live at https://sunscope-eta.vercel.app/ (HTTP 200, recent deploy 2026-05-29). The shipped artifact is the deep-panel converged build: shareable URL state, PNG export, plain-English verdict, warm-to-cool light ramp, live cast-shadow polygon, geocode confirmation with alternate matches. No fabricated data. Building footprints come from OpenStreetMap via Overpass, sun positions from SunCalc, building heights labeled "measured" vs estimated and surfaced as confidence. Honest product.

**Exposed secret still flagged (NOT rotated per guardrail):** The `VITE_MAPBOX_TOKEN` value (prefix `pk.eyJ1...`, full token redacted from this file) ships in the live JS bundle. Mapbox public tokens are designed to be exposed when URL-restricted, but please verify URL restrictions are set on the token in the Mapbox dashboard, and rotate if not.

## 10-star bets across 5 perspectives

- **Evangelist:** A "share this with my partner" hero artifact that opens directly to a finished result with a permalink the partner can tap and see the same heatmap. The shared image needs the verdict line embedded large so it reads at thumbnail size in iMessage.
- **5-second bounce:** Landing on an empty input with no proof is a churn cliff. Three tappable sample addresses (one each NYC, SF, Chicago) get a visitor to the working product without typing.
- **Growth:** The shared image needs a captured permalink chip ("sunscope-eta.vercel.app/#lat=...") so people who see the screenshot can tap through. The address itself is the SEO body. Long term: pre-rendered OG cards per shared URL via a serverless function.
- **Staff engineer red-team:** Mapbox token in the client bundle is fine if URL-restricted, but the bundle is 1.3MB, code-splitting maplibre-gl and html-to-image is a meaningful bigger bet. A top-level React error boundary now wraps the app (shipped this pass) so a map or WebGL crash shows a recoverable Reload message instead of a blank white screen. Still missing: analytics on geocode-failed events, telemetry to know if the auto-pick face is wrong.
- **Design/taste:** Verdict is one sentence. Heavily-obstructed units read identically to lightly-obstructed ones unless you read the confidence line. A second sentence calling out neighbor obstruction (when present) makes the result trustworthy at a glance.

## Prioritized plan

### Quick wins (this pass, additive only)

1. **Sample-address chips on the search screen** — top win. Three tappable example addresses (NYC, SF, Chicago) below the hint. Files: `src/components/AddressSearch.tsx`, `src/index.css`. Effort S. Deploy N.
2. **Obstruction signal in the verdict** — when the obstructed fraction of daylight hours is high (>=40%), append "Heavily blocked by neighbors" to the verdict. Files: `src/lib/verdict.ts`, `src/lib/obstruction.ts` (export blocked fraction in `UnitAnalysis`). Effort S. Deploy N.
3. **"How this works" disclosure on results** — small expandable line under the SummaryCard footer linking to data sources (OSM, SunCalc). Trust signal for the Reddit audience that asks "but how do you know?" Files: `src/App.tsx`, `src/index.css`. Effort S. Deploy N.
4. **A11y labels** — aria-label on the floor slider, aria-labels on heatmap / timeline. Files: `src/components/FloorSlider.tsx`, `src/components/SunlightTimeline.tsx`, `src/components/YearlyHeatmap.tsx`. Effort S. Deploy N.
5. **Verdict tense fix** — winter month grouping currently uses Dec/Jan/Feb which is correct for Northern Hemisphere; add a note in `verdict.ts` so future hemisphere expansion is clear. Files: `src/lib/verdict.ts`. Effort S. Deploy N.

### Bigger bets (flagged for Michael, not implemented)

6. **Verify Mapbox token URL restriction** in the Mapbox dashboard. If unrestricted, rotate and add a URL allowlist for `sunscope-eta.vercel.app` and any prod alias. Effort S. Deploy Y.
7. **Code-split maplibre-gl and html-to-image** to drop the 1.3MB main bundle to something a 3G connection can load. `vite.config.ts` manualChunks. Effort M. Deploy Y.
8. **Per-URL dynamic OG card** via a small Vercel serverless function that renders the verdict text + address + face + floor into the shared image. Effort M. Deploy Y.
9. **Pre-built result permalinks for top 20 NYC neighborhoods** — SEO landing pages ("Sunlight in Williamsburg") that link into the deep-link state. Effort L. Deploy Y.
10. **Real building-heights backfill** in NYC from open data (NYC PLUTO building heights). The "estimated" heightSource confidence drag is solvable for the densest evangelist city. Effort L. Deploy Y.

### Quick wins (this pass)

6. **Top-level React error boundary** (shipped). `src/components/ErrorBoundary.tsx` wraps `App` in `src/main.tsx`. A render crash from MapLibre/WebGL or an unexpected analysis state now shows a recoverable "Something went wrong, Reload" card reusing the existing `.error-state` styles, instead of a blank white screen that silently loses the visitor. Effort S. Deploy N to verify behavior, builds clean locally.

## Shipped wave 2 (2026-05-30)

**Real-host permalink on the shared card.** The saved/shared PNG footer hard-coded `sunscope.app`, a host that does not resolve (verified: HTTP 000, no DNS answer), while the live app and OG metadata all live on `sunscope-eta.vercel.app` (verified HTTP 200 with a Twitterbot user agent, og.png returns 200 too). A screenshot dropped into a Reddit thread or group chat (the evangelist's core moment) was therefore advertising a dead address. The `SummaryCard` footer now renders the real working host derived from the current page (or the deep-link permalink passed from `App`), so the screenshot points somewhere a viewer can actually tap through to. This directly serves the top evangelist bet (a captured working permalink chip on the shared image). Files: `src/components/SummaryCard.tsx` (new optional `permalink` prop + `permalinkHost` helper), `src/App.tsx` (passes `shareUrl`). Build + tsc pass clean. Additive, no deploy.

**Flag re-confirmed (NOT changed):** `VITE_MAPBOX_TOKEN` is read in `src/lib/geocoding.ts` via `import.meta.env.VITE_MAPBOX_TOKEN`, so Vite inlines it into the client bundle (this is inherent to any `VITE_` var). The `.env` itself is gitignored and not committed. Mapbox public tokens are designed to be exposed when URL-restricted; verify URL restrictions in the Mapbox dashboard and rotate only if unrestricted. Per guardrail this wave did not rotate or block on it. Canonical / og:url / og:image were checked and are already correct, so no URL changes were needed.

## Status

Earlier passes shipped wins 1, 2, 3, 4. The prior pass added the top-level error boundary (win 6). This wave (2) fixed the dead-host footer on the shared card so the shareable artifact carries a working permalink. Bigger bets (Mapbox token URL restriction, code-splitting the 1.3MB bundle, per-URL OG cards, neighborhood SEO pages, PLUTO height backfill) remain flagged for Michael and need a deploy to verify.
