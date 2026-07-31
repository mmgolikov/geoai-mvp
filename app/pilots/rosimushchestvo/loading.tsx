import styles from "@/src/pilots/rosimushchestvo/ui/pilot.module.css";

export default function RosimushchestvoPilotLoading() {
  return (
    <main className={styles.loadingRoot} lang="ru" aria-busy="true" aria-label="Загрузка демонстрационного контура">
      <div className={styles.loadingHeader}><span /><span /></div>
      <section className={styles.loadingNotice}>Загружается интерфейс демонстрационного контура. Аналитические показатели появятся только после загрузки фиксированного набора.</section>
      <div className={styles.loadingBlock} />
      <div className={styles.loadingGrid}><div /><div /></div>
    </main>
  );
}
