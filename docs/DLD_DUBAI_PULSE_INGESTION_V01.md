# DLD / Dubai Pulse Ingestion Prototype v0.1

GeoAI DLD / Dubai Pulse Ingestion v0.1 is an offline/manual CSV ingestion prototype. It prepares the product to normalize Dubai real estate market datasets into a consistent shape for future market comps, rental demand, pipeline validation, and evidence workflows.

This is not a live production integration. It does not call DLD, Dubai Pulse, Data Dubai, or any external API.

## Purpose

- Parse sample CSV exports with tolerant column mapping.
- Normalize transaction, rent, and project records.
- Generate market area metrics by Dubai area.
- Produce validation summaries and warnings.
- Write local normalized JSON outputs.
- Optionally write market areas and metrics to Supabase when configured.

## Supported Dataset Families

### DLD Transactions

Supported possible fields include:

- transaction date
- procedure / transaction type
- property type and subtype
- area / area name / location
- project / master project
- property usage
- amount / transaction value / price
- property size / transaction size / size
- rooms
- freehold flag
- latitude / longitude

### DLD Rents / Rental Contracts

Supported possible fields include:

- contract start and end date
- area
- property type and subtype
- annual amount / rent value
- property size
- rooms

### DLD Projects / Registered Projects

Supported possible fields include:

- project name
- developer name
- area
- project status
- completion date
- project type
- unit count

## Column Aliases

The parser normalizes headers by trimming whitespace, lowercasing, removing punctuation, and converting spaces to underscores.

Examples:

- `Transaction Date`, `transaction_date`, `instance_date` -> `transactionDate`
- `Amount`, `Transaction Value`, `Value AED` -> `amountAed`
- `Area`, `Area Name`, `location` -> `areaName`
- `Property Size (sq.m)`, `transaction_size_sqm`, `size_sqm` -> `sizeSqm`
- `Procedure Type`, `Transaction Type` -> `transactionType`
- `Project`, `Project Name` -> `projectName`
- `Developer`, `Developer Name` -> `developerName`

Missing fields lower record confidence and are reported as warnings where appropriate. The script keeps usable rows instead of failing on partial data.

## Sample Files

Synthetic parser fixtures live in:

```text
data/samples/
```

Files:

- `dld_transactions_sample.csv`
- `dld_rents_sample.csv`
- `dld_projects_sample.csv`

These fixtures are tiny and synthetic. They are not official DLD or Dubai Pulse records.

## Run Ingestion

```bash
npm run ingest:dld
```

The command writes:

```text
data/normalized/dld_transactions_normalized.json
data/normalized/dld_rents_normalized.json
data/normalized/dld_projects_normalized.json
data/normalized/market_area_metrics.json
data/normalized/ingestion_report.json
```

## Outputs

Normalized outputs include:

- normalized transactions with price per sqm
- normalized rent records with rent per sqm
- normalized project pipeline records
- market area metrics with liquidity, rental demand, and pipeline proxies
- ingestion report with row counts, warnings, confidence distribution, and output paths

Market area metrics are marked as `sample_fixture` for v0.1 and are available for validation workflow only. They are not yet wired into scoring.

## Optional Supabase Behavior

If Supabase environment variables are configured, the script attempts a best-effort write to:

- `sources`
- `market_areas`
- `market_metrics`

If Supabase is not configured or the write fails, local JSON output still succeeds.

No fake official geometries are inserted. Market areas are saved without boundary geometry unless real geometry is provided in a future workflow.

## Data Licensing And Access Caution

Official or open Dubai real estate datasets may have specific usage, attribution, redistribution, and licensing terms. Before using real exports in a pilot:

- confirm permitted use
- preserve source metadata
- document freshness and coverage
- avoid mixing sample fixture data with official evidence
- avoid presenting unvalidated imports as decision-grade

## Limitations

- No live API connector.
- No scraping.
- No credentials.
- No auth or multi-tenancy.
- No area boundary matching.
- No PostGIS geometry enrichment.
- No official validation claims.
- No scoring changes yet.
- No large datasets committed.

## Next Steps

- Add real DLD / Dubai Pulse API connector when access and terms are confirmed.
- Add area boundary matching and canonical area registry.
- Add PostGIS geometry enrichment for market areas.
- Build market comps engine.
- Build rental demand model.
- Build development pipeline and delivery risk model.
- Connect imported metrics into analysis as explicitly labeled validation evidence.
