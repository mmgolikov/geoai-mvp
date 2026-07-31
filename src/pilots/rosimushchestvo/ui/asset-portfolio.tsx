"use client";

import type { DemoAsset, ScenarioAssessment } from "../domain";
import { archetypeLabels, formatMetric, scenarioGroupLabels, useStatusLabels, verificationLabels } from "./formatters";
import styles from "./pilot.module.css";

interface AssetPortfolioProps {
  assets: DemoAsset[];
  selectedAssetId: DemoAsset["id"];
  assessments: Map<DemoAsset["id"], ScenarioAssessment>;
  onSelect: (assetId: DemoAsset["id"]) => void;
}

export function AssetPortfolio({ assets, selectedAssetId, assessments, onSelect }: AssetPortfolioProps) {
  return (
    <section className={styles.listPanel} aria-labelledby="asset-list-title">
      <div className={styles.sectionHeadingCompact}>
        <div>
          <p className={styles.eyebrow}>Синхронизированный список</p>
          <h2 id="asset-list-title">Объекты портфеля</h2>
        </div>
        <span className={styles.neutralBadge}>{assets.length}</span>
      </div>

      {assets.length === 0 ? (
        <div className={styles.emptyState} role="status">
          <span aria-hidden="true">⌕</span>
          <div>
            <strong>По заданным условиям объекты не найдены</strong>
            <p>Измените параметры кастомного запроса или вернитесь к полному портфелю.</p>
          </div>
        </div>
      ) : (
        <div className={styles.assetGrid} data-testid="asset-list">
          {assets.map((asset) => {
            const assessment = assessments.get(asset.id);
            const selected = asset.id === selectedAssetId;
            return (
              <article
                key={asset.id}
                className={styles.assetCard}
                data-asset-id={asset.id}
                data-selected={selected}
              >
                <button
                  type="button"
                  className={styles.assetOpenButton}
                  aria-pressed={selected}
                  aria-label={`Открыть паспорт: ${asset.title}`}
                  onClick={() => onSelect(asset.id)}
                >
                  <span className={styles.assetId}>{asset.id}</span>
                  <span className={styles.assetTitle}>{asset.title}</span>
                </button>
                <div className={styles.assetMeta}>
                  <span>{asset.district}</span>
                  <span>{archetypeLabels[asset.archetype]}</span>
                  <span>{formatMetric(asset.areaSquareMeters, " м²")}</span>
                </div>
                <div className={styles.assetStatusRow}>
                  <span className={styles.statusChip} data-tone={asset.verificationStatus === "conflicting" ? "danger" : asset.verificationStatus === "incomplete" ? "warning" : "neutral"}>
                    {verificationLabels[asset.verificationStatus]}
                  </span>
                  <span className={styles.useStatus}>{useStatusLabels[asset.useStatus]}</span>
                </div>
                {assessment ? (
                  <p className={styles.assetAssessment}>
                    <span aria-hidden="true">→</span> {scenarioGroupLabels[assessment.group]}
                  </p>
                ) : null}
                <p className={styles.syntheticLabel}>Синтетическая запись; не является сведением RFI или ЕГРН.</p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
