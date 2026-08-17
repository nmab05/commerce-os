# Commerce OS Listing Optimization — Pre-merge Hardening

## Branch status

This branch extends the existing prototype without modifying `main` and without performing automatic marketplace writes.

## Module boundaries

- `listing-optimizer.js` — listing/title/description/research/pricing recommendation engine.
- `listing-optimizer-integration.js` — adapter into Integrated Item Research.
- `listing-optimizer-bulk.js` — batch listing scoring and proposal generation.
- `stale-inventory-engine.js` — base stale inventory rules.
- `sellthrough-calibration.js` — empirical calibration from sold records.
- `performance-learning.js` — forecast vs realized-outcome feedback.
- `portfolio-economics.js` — expected cash, margin and capital-priority scoring.
- `experiment-framework.js` — treatment/control measurement.
- `experiment-approval-integration.js` — protects controls and logs treatment approvals.
- `action-effect-learning.js` — learns intervention effects from completed experiments.
- `decision-policy-learning.js` — applies learned intervention effects to stale decisions.
- `autopilot-engine.js` — unified daily recommendation queue.
- `state-compatibility.js` — additive-only state initialization/migration.
- `premerge-selfcheck.js` — comprehensive runtime dependency and safety checks.
- `commerce-os-dev.html` — integrated development runtime only.

## Redundancy assessment

The lower-level engines remain intentionally separate because Autopilot composes them and the diagnostic views depend on their individual outputs. They are not independent competing decision systems in production flow: `autopilot-engine.js` is the primary queue; stale, economics, learning, and experiment modules are evidence providers and diagnostics.

`listing-optimizer-bulk.js`, stale decisions and cash-priority views remain useful diagnostic/manual tools but should be considered secondary to Autopilot in the UI.

## Backward compatibility

`state-compatibility.js` only creates missing arrays/objects and advances a schema marker. It never deletes inventory, research, queue, experiment, or learning data and does not rename existing keys.

## Safety boundary

All consequential recommendations are written to the existing `optimizationQueue` as pending proposals. Experiment controls are protected from receiving the tested action. No new module publishes, edits, delists, relists, or reprices a marketplace listing directly.

## Merge recommendation

Merge only after the integrated runtime passes `runCommerceOSPremergeSelfCheck()` and the browser regression harnesses are exercised. After merge, the next architectural task should be moving the monolithic inline application code out of `index.html`; that refactor should remain separate from this feature PR to reduce review risk.
