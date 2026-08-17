# Commerce OS Listing Optimization — Pre-merge Hardening

## Branch status

This branch extends the existing prototype without performing automatic marketplace writes.

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
- `release-gate.js` — dependency-free automated release validation.
- `commerce-os-dev.html` — integrated development runtime only.

## Redundancy assessment

The lower-level engines remain intentionally separate because Autopilot composes them and the diagnostic views depend on their individual outputs. `autopilot-engine.js` is the primary queue; stale, economics, learning, and experiment modules are supporting evidence providers and diagnostics.

## Backward compatibility

`state-compatibility.js` only creates missing arrays/objects and advances a schema marker. It never deletes inventory, research, queue, experiment, or learning data and does not rename existing keys.

## Safety boundary

All consequential recommendations are written to the existing `optimizationQueue` as pending proposals. Experiment controls are protected from receiving the tested action. No new module publishes, edits, delists, relists, or reprices a marketplace listing directly.

## Validation

During PR validation three integration defects were identified and fixed before merge:

1. Autopilot referenced the wrong learned-policy global and silently fell back to base stale rules.
2. The development runtime did not load the state-compatibility and pre-merge modules.
3. Autopilot called a non-existent plural forecast-capture API, preventing feedback-loop forecasts from being recorded.

The release gate validates schema migration, learning-store initialization, sold-item exclusion, one recommendation per active item, impact ordering, pending-only approvals, Autopilot run logging, forecast capture, duplicate protection, title limits, unsupported-price safeguards, and absence of a direct marketplace writer.

GitHub Actions `Commerce OS Validation` run 32073733063 completed successfully on PR #1 on August 17, 2026.

## Merge recommendation

The feature branch is ready for review. Merge only after reviewing PR #1 and accepting the current scope. The monolithic `index.html` refactor should remain a separate follow-up to reduce merge risk.
