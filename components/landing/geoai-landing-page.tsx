"use client";

import { getImageProps } from "next/image";
import Link from "next/link";
import { useState, type KeyboardEvent } from "react";

import { IdentitySymbol } from "@/components/design-system/identity-symbol";
import { usePointObjectLocale } from "@/components/point-to-object/locale-provider";

import { landingContent, landingRoleKeys, type LandingRoleKey } from "./content";
import styles from "./landing.module.css";

const mapHref = "/prototype/point-to-object";
const projectsHref = "/projects";
const requestHref = "/request-access";
const { props: widePreview } = getImageProps({
  src: "/landing/sprint07-workspace-capture.png",
  alt: "",
  width: 3418,
  height: 1602,
  loading: "eager",
  fetchPriority: "high",
  // The image is deliberately windowed and enlarged inside its frame; request
  // enough of the original bitmap for that covered region at retina density.
  sizes: "(max-width: 1199px) 150vw, 1224px"
});
const { props: narrowPreview } = getImageProps({
  src: "/landing/sprint07-workspace-capture.png",
  alt: "",
  width: 3418,
  height: 1602,
  sizes: "230vw"
});

export function GeoAILandingPage() {
  const { locale, setLocale } = usePointObjectLocale();
  const copy = landingContent[locale];
  const [activeRole, setActiveRole] = useState<LandingRoleKey>("developer");
  const role = copy.roles.items[activeRole];

  function moveRoleFocus(event: KeyboardEvent<HTMLButtonElement>, roleKey: LandingRoleKey) {
    const currentIndex = landingRoleKeys.indexOf(roleKey);
    const movement = event.key === "ArrowRight" || event.key === "ArrowDown"
      ? 1
      : event.key === "ArrowLeft" || event.key === "ArrowUp"
        ? -1
        : 0;
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? landingRoleKeys.length - 1
        : movement === 0
          ? currentIndex
          : (currentIndex + movement + landingRoleKeys.length) % landingRoleKeys.length;

    if (nextIndex === currentIndex && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const nextRole = landingRoleKeys[nextIndex];
    setActiveRole(nextRole);
    document.getElementById(`role-tab-${nextRole}`)?.focus();
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.brand} aria-label="GeoAI home">
            <IdentitySymbol className={styles.brandMark} />
            <span>
              <strong>GeoAI</strong>
              <small>{copy.brandSubtitle}</small>
            </span>
          </Link>

          <nav className={styles.desktopNav} aria-label={copy.actions.menu}>
            <a href="#product">{copy.nav[0]}</a>
            <a href="#roles">{copy.nav[1]}</a>
            <a href="#boundaries">{copy.nav[2]}</a>
          </nav>

          <div className={styles.headerActions}>
            <div className={styles.localeSwitch} role="group" aria-label={locale === "en" ? "Language" : "Язык"}>
              {(["en", "ru"] as const).map((language) => (
                <button
                  key={language}
                  type="button"
                  className={locale === language ? styles.localeActive : undefined}
                  aria-pressed={locale === language}
                  onClick={() => setLocale(language)}
                >
                  {language.toUpperCase()}
                </button>
              ))}
            </div>
            <Link href="/profile" className={styles.profileLink}>{copy.actions.profile}</Link>
            <Link href={mapHref} className={styles.headerCta}>{copy.actions.openMap}</Link>
          </div>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{copy.hero.eyebrow}</p>
            <h1>{copy.hero.title}</h1>
            <p className={styles.heroBody}>{copy.hero.body}</p>
            <div className={styles.heroActions}>
              <Link href={mapHref} className={styles.primaryAction}>{copy.actions.openMap}</Link>
              <Link href={requestHref} className={styles.secondaryAction}>{copy.actions.request}</Link>
            </div>
            <p className={styles.heroNote}>{copy.hero.note}</p>
          </div>

          <figure className={styles.productPreview}>
            <div className={styles.previewMeta}>
              <span>{copy.hero.previewLabel}</span>
              <span>{copy.workflow.paths.slice(0, 3).map((path) => path.name).join(" · ")}</span>
            </div>
            <div className={styles.previewScene}>
              <Link href={mapHref} className={styles.previewLink} aria-label={copy.actions.openMap}>
                <picture className={styles.previewPicture}>
                  <source media="(max-width: 620px)" srcSet={narrowPreview.srcSet} sizes={narrowPreview.sizes} width={430} height={400} />
                  {/* getImageProps retains Next optimization; picture selects one asset without a hidden-image preload. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img {...widePreview} className={styles.previewImage} alt={copy.hero.previewAlt} />
                </picture>
              </Link>
              <nav className={styles.objectActions} aria-label={copy.hero.objectActions}>
                {(["analyse", "find", "create"] as const).map((mode, index) => (
                  <Link key={mode} href={`${mapHref}?mode=${mode}`} className={styles.objectAction}>
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      {mode === "analyse" ? <path d="M5 19V5M5 19h14M9 15v-4M13 15V7M17 15v-6" /> : mode === "find" ? <><circle cx="10.5" cy="10.5" r="5.5" /><path d="m15 15 4 4" /></> : <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z M4 7.5l8 4.5 8-4.5M12 12v9" />}
                    </svg>
                    {copy.hero.objectActionLabels[index]}
                  </Link>
                ))}
              </nav>
            </div>
            <figcaption>
              <span>{copy.hero.previewCaption}</span>
              <span className={styles.previewAttribution}>
                <a href="https://openfreemap.org/" target="_blank" rel="noopener noreferrer">OpenFreeMap</a>
                {" © "}<a href="https://openmaptiles.org/" target="_blank" rel="noopener noreferrer">OpenMapTiles</a>
                {" · "}<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">{locale === "en" ? "Data from OpenStreetMap" : "Данные OpenStreetMap"}</a>
              </span>
            </figcaption>
          </figure>
        </div>
      </section>

      <section id="product" className={styles.section}>
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>{copy.workflow.eyebrow}</p>
          <h2>{copy.workflow.title}</h2>
          <p>{copy.workflow.body}</p>
        </div>
        <div className={styles.workflowGrid}>
          {copy.workflow.paths.map((path) => (
            <article key={path.number} className={styles.workflowCard}>
              <div className={styles.cardTopline}>
                <span>{path.number}</span>
                <strong>{path.name}</strong>
                {path.localOnly ? <small>{copy.workflow.localLabel}</small> : null}
              </div>
              <h3>{path.title}</h3>
              <p>{path.body}</p>
              <Link href={path.href}>{path.action}<span aria-hidden="true"> →</span></Link>
            </article>
          ))}
        </div>
      </section>

      <section id="roles" className={`${styles.section} ${styles.rolesSection}`}>
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>{copy.roles.eyebrow}</p>
          <h2>{copy.roles.title}</h2>
          <p>{copy.roles.body}</p>
        </div>

        <div className={styles.roleShell}>
          <div className={styles.roleTabs} role="tablist" aria-label={copy.roles.label}>
            {landingRoleKeys.map((roleKey) => (
              <button
                key={roleKey}
                id={`role-tab-${roleKey}`}
                type="button"
                role="tab"
                aria-selected={activeRole === roleKey}
                aria-controls="role-panel"
                tabIndex={activeRole === roleKey ? 0 : -1}
                onClick={() => setActiveRole(roleKey)}
                onKeyDown={(event) => moveRoleFocus(event, roleKey)}
              >
                {copy.roles.items[roleKey].label}
              </button>
            ))}
          </div>
          <div
            id="role-panel"
            className={styles.rolePanel}
            role="tabpanel"
            aria-labelledby={`role-tab-${activeRole}`}
          >
            <div>
              <p className={styles.roleLabel}>{role.label}</p>
              <h3>{role.title}</h3>
              <p>{role.body}</p>
              <Link href={mapHref} className={styles.primaryAction}>{role.action}</Link>
            </div>
            <ul>
              {role.outcomes.map((outcome, index) => (
                <li key={outcome}><span>0{index + 1}</span>{outcome}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className={styles.consumerStrip}>
          <div>
            <strong>{copy.roles.consumerTitle}</strong>
            <p>{copy.roles.consumerBody}</p>
          </div>
          <Link href={mapHref}>{copy.roles.consumerAction}<span aria-hidden="true"> →</span></Link>
        </div>
      </section>

      <section id="boundaries" className={`${styles.section} ${styles.boundarySection}`}>
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>{copy.boundary.eyebrow}</p>
          <h2>{copy.boundary.title}</h2>
          <p>{copy.boundary.body}</p>
        </div>
        <div className={styles.boundaryGrid}>
          <article className={styles.availableCard}>
            <p className={styles.boundaryLabel}>{copy.boundary.currentLabel}</p>
            <h3>{copy.boundary.currentTitle}</h3>
            <ul>{copy.boundary.current.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
          <article className={styles.gatedCard}>
            <p className={styles.boundaryLabel}>{copy.boundary.gatedLabel}</p>
            <h3>{copy.boundary.gatedTitle}</h3>
            <ul>{copy.boundary.gated.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
        </div>
        <div className={styles.sourceNote}>
          <p><strong>{copy.boundary.sourceLabel}</strong>{copy.boundary.sourceBody}</p>
          <p className={styles.caveat}>{copy.boundary.caveat}</p>
        </div>
      </section>

      <section className={styles.finalCta}>
        <div>
          <p className={styles.eyebrow}>{copy.final.eyebrow}</p>
          <h2>{copy.final.title}</h2>
          <p>{copy.final.body}</p>
        </div>
        <div className={styles.finalActions}>
          <Link href={mapHref} className={styles.primaryAction}>{copy.actions.openMap}</Link>
          <Link href={requestHref} className={styles.secondaryAction}>{copy.actions.request}</Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <Link href="/" className={styles.footerBrand}><IdentitySymbol />GeoAI</Link>
          <nav aria-label={copy.actions.menu}>
            <a href="#product">{copy.footer.product}</a>
            <Link href={projectsHref}>{copy.footer.projects}</Link>
            <Link href="/profile">{copy.footer.profile}</Link>
          </nav>
          <p>{copy.footer.rights}</p>
        </div>
      </footer>
    </main>
  );
}
