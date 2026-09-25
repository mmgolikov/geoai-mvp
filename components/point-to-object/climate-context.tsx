"use client";
import { useId, useState } from "react";
import type { PointObjectClimate } from "@/src/lib/prototype/point-to-object-climate-contract";
import { usePointObjectLocale } from "./locale-provider";
import styles from "./climate-context.module.css";

/** Twelve-month same-unit line comparison; humidity has a separate 0–100% scale. */
export function PointObjectClimateContext({ climate }: { climate?: PointObjectClimate }) {
  const { locale } = usePointObjectLocale(); const titleId = useId();
  const [humidity, setHumidity] = useState(false);
  if (!climate) return null;
  const ru = locale === "ru";
  if (climate.status !== "available") return <p className={styles.limit} data-testid="climate-unavailable">{ru ? `Региональный климат за ${climate.year}: источник недоступен.` : `Regional climate ${climate.year}: source unavailable.`}</p>;
  const months = climate.months;
  const labels = months.map(m => new Intl.DateTimeFormat(ru ? "ru" : "en", { month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(climate.year, m.month - 1, 15))).replace(".", ""));
  const low = humidity ? 0 : Math.floor(Math.min(...months.map(m => m.temperatureC)) / 5) * 5 - 5;
  const high = humidity ? 100 : Math.ceil(Math.max(...months.map(m => m.maximumTemperatureC)) / 5) * 5 + 5;
  const x = (i: number) => 38 + i * 26; const y = (v: number) => 150 - (v - low) / (high - low) * 125;
  const values = months.map(m => humidity ? m.relativeHumidityPct : m.temperatureC);
  const line = (series: number[]) => series.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const temperatureLabel = ru ? "Температура воздуха" : "Air temperature"; const humidityLabel = ru ? "Влажность" : "Humidity";
  return <section className={styles.card} aria-labelledby={titleId} data-testid="climate-context" data-year={climate.year}>
    <header><h3 id={titleId}>{ru ? "Сезонный климат региона" : "Regional seasonal climate"}</h3><p>{climate.year} · NASA POWER · MERRA-2 · 0.5° × 0.625°</p>
      <div className={styles.controls} role="group" aria-label={ru ? "Показатель климата" : "Climate measure"}>
        <button type="button" aria-pressed={!humidity} onClick={() => setHumidity(false)}>{temperatureLabel}</button>
        <button type="button" aria-pressed={humidity} onClick={() => setHumidity(true)}>{humidityLabel}</button>
      </div></header>
    <svg className={styles.chart} viewBox="0 0 348 181" role="img" aria-label={`${humidity ? humidityLabel : temperatureLabel}, ${climate.year}, ${humidity ? "%" : "°C"}`}>
      <text x="8" y="13">{humidity ? "%" : "°C"}</text>
      {[0, 1, 2, 3, 4].map(t => { const value = low + (high - low) * t / 4; return <g key={t}><line x1="38" x2="324" y1={y(value)} y2={y(value)} className={styles.grid} /><text x="30" y={y(value) + 3} textAnchor="end">{Number(value.toFixed(1))}</text></g>; })}
      <polyline points={line(values)} fill="none" stroke="#087F8C" strokeWidth="2.5" />
      {!humidity ? <polyline points={line(months.map(m => m.maximumTemperatureC))} fill="none" stroke="#344054" strokeWidth="2" strokeDasharray="5 4" /> : null}
      {months.map((m, i) => <g key={m.month}><circle cx={x(i)} cy={y(values[i])} r="3" fill="#087F8C"><title>{labels[i]}: {values[i]} {humidity ? "%" : "°C"}</title></circle><text x={x(i)} y="169" textAnchor="middle">{labels[i]}</text></g>)}
    </svg>
    <p className={styles.legend}>{humidity ? (ru ? "Относительная влажность на высоте 2 м · RH2M" : "Relative humidity at 2 m · RH2M") : (ru ? "━ Средняя T2M   ┄ Максимальная серия T2M_MAX · °C" : "━ Mean T2M   ┄ Maximum series T2M_MAX · °C")}</p>
    <p className={styles.limit}>{ru ? "Региональная ячейка, не измерение на участке. Воздух на высоте 2 м, не поверхность. T2M_MAX — месячный показатель максимума, не абсолютный экстремум и не оценка теплового комфорта." : "Regional grid cell, not a site measurement. Air at 2 m, not surface temperature. T2M_MAX is the monthly maximum metric, not an absolute extreme or a thermal-comfort assessment."}</p>
    <details><summary>{ru ? "12 месяцев и источник" : "12 months & source"}</summary>
      <div className={styles.tableWrap}><table><caption>{climate.year} · NASA POWER</caption><thead><tr><th>{ru ? "Месяц" : "Month"}</th><th>T2M °C</th><th>T2M_MAX °C</th><th>RH2M %</th></tr></thead><tbody>{months.map((m, i) => <tr key={m.month}><th scope="row">{labels[i]}</th><td>{m.temperatureC}</td><td>{m.maximumTemperatureC}</td><td>{m.relativeHumidityPct}</td></tr>)}</tbody></table></div>
      <p>{climate.source.attribution} · {climate.source.apiVersion}. {ru ? "Период" : "Period"}: {climate.source.observedStart} – {climate.source.observedEnd}. {ru ? "Получено" : "Acquired"}: <time dateTime={climate.source.acquiredAt}>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(climate.source.acquiredAt))}</time>.</p>
      <a href={climate.source.referenceUrl} target="_blank" rel="noreferrer">NASA POWER · {ru ? "Источник и атрибуция" : "Source & attribution"}</a>
    </details>
  </section>;
}
