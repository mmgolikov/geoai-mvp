# GeoAI Public Data Source Register v1.6

Date: 2026-06-23

The canonical v1.6 public source catalog lives in `src/lib/external-data/public-source-catalog.ts`.

| Source group | Access mode | Current status | Supports | Cannot support |
| --- | --- | --- | --- | --- |
| DLD / Dubai Pulse public data | manual snapshot / public web CSV | sample fallback or snapshot available | market, rent, project, land, building and unit screening context | live API, ownership, title, official parcel or certified valuation |
| DLD API Gateway | permissioned | permission required | planned official validation path | any current live API claim |
| OSM / Geofabrik | open snapshot | sample fallback or snapshot available | roads, POIs, landuse, transport/access proxies | official municipal GIS or zoning |
| Overture Maps | public download | manual import ready / sample fallback | buildings, places, transportation, divisions | official Dubai GIS or legal boundary conclusions |
| Open-Meteo | API context | connected with fallback | heat/rainfall screening proxy | engineering or insurance-grade hazard assessment |
| NASA POWER | open API | connected with fallback | solar radiation, temperature and wind screening proxy | energy yield certification |
| OpenAQ | open API | connected/fallback | air-quality context | health-grade or regulatory compliance assessment |
| WorldPop | public download | sample fallback | population density / catchment proxy | official census validation |
| Copernicus / Sentinel | token optional / metadata path | token required or sample metadata | availability metadata | imagery analytics or construction monitoring proof |
| Overture/GADM admin context | public download/manual | manual import ready | non-official admin context | official boundaries or zoning |
| GeoDubai / Dubai Municipality | planned validation | planned | official validation roadmap | current live official integration |

Required caveat:

> screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

## License Notes

Every source has dataset-specific license and attribution requirements. The source catalog stores `licenseNote`, `allowedUse`, `forbiddenClaims`, `limitations` and `officialClaimAllowed` so UI and reports can avoid scattered hardcoded source claims.
