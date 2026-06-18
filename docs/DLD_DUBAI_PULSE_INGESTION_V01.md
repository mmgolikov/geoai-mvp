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

Market area metrics are marked as `sample_fixture` for v0.1 and are used as conservative validation/scoring support when matched. They are not live official market data and must be validated before underwriting.

## How Imported Metrics Are Used

GeoAI now loads `data/normalized/market_area_metrics.json` through the market metrics layer in:

```text
src/lib/market-metrics/
```

When a user runs Express Analysis, GeoAI attempts to match the selected point or object to imported market metrics. If a match is found, imported sample metrics support:

- market context display
- investment attractiveness interpretation
- development potential interpretation
- liquidity and rental demand proxy scoring
- pipeline pressure / absorption risk context
- evidence cards and memo language
- report and print Market Data Basis sections

Imported sample metrics do not replace climate, heat, flood, planning, title, ownership, or official regulatory validation.

## Matching Logic

Matching is deterministic and dependency-free:

1. exact normalized area name match
2. alias match
3. partial text match
4. nearest seed area fallback from coordinates
5. seed_static / generic Dubai fallback

Supported aliases include:

- `Jumeirah Village Circle` <-> `JVC`
- `MBR City` / `Meydan` -> `Meydan / MBR City`
- `Marina` -> `Dubai Marina`
- `Downtown` -> `Downtown Dubai`
- `Dubai South` -> `Dubai South`

The match result exposes:

- matched area
- match type
- confidence
- source mode
- whether imported metrics were used
- compact metric snapshot

## Source Mode Meanings

- `imported_sample`: local synthetic/sample CSV output from the ingestion prototype.
- `imported_csv`: future user-provided official/open CSV export.
- `seed_static`: bundled demo-normalized market context.
- `fallback_demo`: generic fallback when no area match is available.

## Scoring Caveats

Imported metrics influence scores conservatively:

- liquidity and rental demand proxies are capped for tiny samples
- transaction count below 5 lowers effective confidence
- pipeline proxy increases pressure/risk where relevant
- investment and development scenarios use metrics more directly
- climate/risk scenarios use metrics only as market exposure context

Current fixtures are tiny sample data, so outputs should usually remain low/medium confidence and require official validation.

## Verify Imported Metrics Are Used

1. Run:

```bash
npm run ingest:dld
```

2. Confirm:

```text
data/normalized/market_area_metrics.json
```

3. Open `/workspace`.
4. Select or click a Dubai area represented in the sample fixtures:
   - Dubai Marina
   - Business Bay
   - Downtown Dubai
   - JVC
   - Meydan / MBR City
   - Dubai South
5. Run Express Analysis.
6. Confirm Market Context shows `imported_sample`, matched area and match confidence.
7. Confirm Evidence / Data Used includes imported DLD / Dubai Pulse-style market metrics.
8. Confirm print/report includes Market Data Basis.

You can also inspect:

```text
/api/market-metrics
```

This debug endpoint returns source mode, imported metric count, area names and fallback status.

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
- Imported metrics influence scoring only through conservative proxy adjustments.
- No large datasets committed.

## Next Steps

- Add real DLD / Dubai Pulse API connector when access and terms are confirmed.
- Add area boundary matching and canonical area registry.
- Add PostGIS geometry enrichment for market areas.
- Build market comps engine.
- Build rental demand model.
- Build development pipeline and delivery risk model.
- Connect imported metrics into analysis as explicitly labeled validation evidence.
