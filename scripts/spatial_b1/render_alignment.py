from __future__ import annotations

import argparse
import json
import textwrap
from pathlib import Path
from typing import Any

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
from matplotlib.patches import Patch
from shapely.geometry import shape
from shapely.ops import transform

from common import TARGETS, TO_WORKING, target_point_working, target_selection_area_working


def read_features(bundle_dir: Path, layer: str) -> list[dict[str, Any]]:
    path = bundle_dir / "geometry" / f"{layer}.geojson"
    return json.loads(path.read_text("utf-8"))["features"]


def working_geometry(feature: dict[str, Any]):
    return transform(TO_WORKING.transform, shape(feature["geometry"]))


def plot_geometry(axis, geometry, *, edge: str, face: str = "none", width: float = 1.0, alpha: float = 1.0, zorder: int = 1) -> None:
    if geometry.is_empty:
        return
    if geometry.geom_type == "Polygon":
        x, y = geometry.exterior.xy
        axis.fill(x, y, facecolor=face, edgecolor=edge, linewidth=width, alpha=alpha, zorder=zorder)
        for interior in geometry.interiors:
            ix, iy = interior.xy
            axis.fill(ix, iy, facecolor="white", edgecolor=edge, linewidth=max(0.5, width / 2), zorder=zorder + 0.1)
        return
    if geometry.geom_type in {"LineString", "LinearRing"}:
        x, y = geometry.xy
        axis.plot(x, y, color=edge, linewidth=width, alpha=alpha, zorder=zorder)
        return
    if geometry.geom_type == "Point":
        axis.scatter([geometry.x], [geometry.y], color=edge, s=18, alpha=alpha, zorder=zorder)
        return
    if hasattr(geometry, "geoms"):
        for part in geometry.geoms:
            plot_geometry(axis, part, edge=edge, face=face, width=width, alpha=alpha, zorder=zorder)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--bundle-dir", required=True)
    parser.add_argument("--output-dir", required=True)
    arguments = parser.parse_args()

    bundle_dir = Path(arguments.bundle_dir)
    output_dir = Path(arguments.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    selected = {feature["metadata"]["focusAoiId"]: feature for feature in read_features(bundle_dir, "selected-aoi")}
    selection_report = json.loads((bundle_dir / "target-distance-report.json").read_text("utf-8"))
    target_records = {record["targetId"]: record for record in selection_report["targets"]}
    buildings = read_features(bundle_dir, "buildings")
    transport = read_features(bundle_dir, "transport")
    water = read_features(bundle_dir, "water")
    landuse = read_features(bundle_dir, "landuse")

    for target_id, target in TARGETS.items():
        feature = selected[target_id]
        anchor = target_point_working(target_id)
        focus = target_selection_area_working(target_id)
        selected_geometry = working_geometry(feature)
        context_window = anchor.buffer(1_100)

        record = target_records[target_id]
        figure, axis = plt.subplots(figsize=(10.8, 8.4), dpi=150)
        figure.patch.set_facecolor("white")
        axis.set_facecolor("#f7f8fa")
        for context_feature in landuse:
            geometry = working_geometry(context_feature)
            if geometry.intersects(context_window):
                plot_geometry(axis, geometry, edge="#a5b79c", face="#e8efe4", width=0.7, alpha=0.8, zorder=1)
        for context_feature in water:
            geometry = working_geometry(context_feature)
            if geometry.intersects(context_window):
                plot_geometry(axis, geometry, edge="#78a9c4", face="#dcecf4", width=0.8, alpha=0.9, zorder=2)
        nearby_buildings = []
        for building in buildings:
            geometry = working_geometry(building)
            if geometry.intersects(context_window):
                nearby_buildings.append((anchor.distance(geometry.representative_point()), geometry))
        for _, geometry in sorted(nearby_buildings, key=lambda item: item[0])[:180]:
            plot_geometry(axis, geometry, edge="#9ba3ad", face="#d9dde2", width=0.45, alpha=0.85, zorder=3)
        for corridor in transport:
            geometry = working_geometry(corridor)
            if geometry.intersects(context_window):
                plot_geometry(axis, geometry, edge="#596b7a", width=1.25, alpha=0.9, zorder=4)

        plot_geometry(axis, focus, edge="#3f6d91", width=1.5, alpha=0.95, zorder=5)
        plot_geometry(axis, selected_geometry, edge="#b64f19", face="#f3a36b", width=2.4, alpha=0.9, zorder=7)
        axis.scatter([anchor.x], [anchor.y], marker="x", color="#9c1e1e", s=90, linewidths=2.2, zorder=8, label="Seeded target anchor")
        point_on_surface = selected_geometry.representative_point()
        axis.plot([anchor.x, point_on_surface.x], [anchor.y, point_on_surface.y], color="#9c1e1e", linestyle="--", linewidth=1.0, zorder=6)

        axis.set_xlim(anchor.x - 1_100, anchor.x + 1_100)
        axis.set_ylim(anchor.y - 1_100, anchor.y + 1_100)
        axis.set_aspect("equal", adjustable="box")
        axis.grid(True, color="#cfd5db", linewidth=0.5, alpha=0.75)
        axis.set_xlabel("EPSG:32640 easting (metres)")
        axis.set_ylabel("EPSG:32640 northing (metres)")
        axis.set_title(f"{target['name']} — B1 open-context source alignment", loc="left", fontsize=13, fontweight="bold")
        distance = feature["metadata"]["targetDistanceMetres"]
        provider_id = feature["sourceFeatureId"]
        checksum = feature["geometryChecksum"]
        alternatives = record.get("nearestRejectedAlternatives", [])[:3]
        alternative_lines = [
            f"  #{candidate['rank']} {candidate.get('sourceName') or 'Unnamed open-context footprint'} | "
            f"{candidate['areaSqm']:.3f} sqm | {candidate['anchorDistanceMetres']:.3f} m | "
            f"{candidate['reason'].split(';', 1)[0]}"
            for candidate in alternatives
        ] or ["  None recorded"]
        detail_lines = [
                f"Anchor: {target['latitude']:.6f}, {target['longitude']:.6f}",
                f"Selected object: {feature['name']}",
                f"Source object name: {feature.get('sourceObjectName') or 'Unnamed'}",
                f"Canonical GeoAI key: {feature['featureKey']}",
                f"Source: {feature['metadata']['provider']} | Provider ID: {provider_id}",
                f"Area: {feature['areaSqm']:.3f} sqm | Anchor distance: {distance:.3f} m",
                f"sourceUpdatedAt: {feature.get('sourceUpdatedAt') or 'unknown'} | Freshness: {feature['freshnessStatus']}",
                f"Context area: {feature['contextArea']} | Geometry role: {feature['geometryRole']}",
                f"Selected candidate rank: {feature['metadata']['selectedCandidateRank']}",
                "Nearest rejected alternatives:",
                *alternative_lines,
                f"Geometry SHA-256: {checksum}",
                "Open-context caveat: Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.",
            ]
        detail = "\n".join(
            wrapped
            for line in detail_lines
            for wrapped in (textwrap.wrap(line, width=138, subsequent_indent="    ") or [""])
        )
        figure.text(0.075, 0.012, detail, ha="left", va="bottom", fontsize=7.4, family="monospace", color="#26323c")
        legend_items = [
            Line2D([0], [0], color="#3f6d91", linewidth=1.5, label="1,000 m focus boundary"),
            Line2D([0], [0], marker="x", color="#9c1e1e", linestyle="none", markersize=8, markeredgewidth=2, label="Seeded target anchor"),
            Patch(facecolor="#f3a36b", edgecolor="#b64f19", label="Selected AOI / source footprint"),
            Patch(facecolor="#d9dde2", edgecolor="#9ba3ad", label="Nearby open buildings"),
            Line2D([0], [0], color="#596b7a", linewidth=1.25, label="Open transport context"),
            Patch(facecolor="#dcecf4", edgecolor="#78a9c4", label="Open water context"),
            Patch(facecolor="#e8efe4", edgecolor="#a5b79c", label="Open land-use context"),
        ]
        axis.legend(handles=legend_items, loc="upper right", frameon=True, framealpha=0.95, fontsize=7.2)
        figure.subplots_adjust(left=0.08, right=0.98, top=0.90, bottom=0.34)
        output_path = output_dir / f"source-alignment-{target_id}.png"
        figure.savefig(
            output_path,
            facecolor="white",
            edgecolor="white",
            transparent=False,
            metadata={"Software": "GeoAI B1 alignment evidence"},
        )
        plt.close(figure)
        print(output_path)


if __name__ == "__main__":
    main()
