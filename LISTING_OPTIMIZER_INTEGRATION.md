# Listing Optimization Intelligence — Integration

Development branch: `agent/listing-optimization-intelligence`

## What is implemented

- `listing-optimizer.js` — pure recommendation engine for title, description, research strength and evidence-backed pricing.
- `listing-optimizer-harness.html` — standalone browser harness.
- `listing-optimizer-integration.js` — adapter for the existing Integrated Item Research > Listing tab.

## Integration behavior

The adapter intentionally preserves the Commerce OS safety model:

1. Select a Vendoo inventory item in Integrated Item Research.
2. Saved comparable research is read from `state.compResearch[item.id]`.
3. The optimizer creates a scored package for title, description and research strength.
4. The Listing tab receives an improved proposed title and structured description.
5. Clicking the existing Add listing proposals action creates approval-queue records.
6. Pricing is proposed only when saved research contains an evidence-based recommended price.
7. No marketplace or Vendoo write is performed by this module.

## Required script order when merged into the prototype

Load these immediately before the closing `</body>` tag, after the existing inline Commerce OS application script:

```html
<script src="listing-optimizer.js"></script>
<script src="listing-optimizer-integration.js"></script>
```

This order lets the adapter override the prototype's basic `generateListingResearchDraft()` and `createListingResearchProposals()` functions while reusing its existing state, approval queue, persistence and UI.

## Next production step

Move the monolithic inline application JavaScript out of `index.html` into a dedicated app file. This will make optimizer integration, automated testing, versioning and future modules safer than repeatedly replacing the large single-file prototype.
