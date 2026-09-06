"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type KeyboardEvent } from "react";

import { IdentitySymbol } from "@/components/design-system/identity-symbol";
import { usePointObjectLocale } from "@/components/point-to-object/locale-provider";

import { landingContent, landingRoleKeys, type LandingRoleKey } from "./content";
import styles from "./landing.module.css";

const mapHref = "/prototype/point-to-object";

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
              <Link href="/projects" className={styles.secondaryAction}>{copy.actions.projects}</Link>
            </div>
            <p className={styles.heroNote}>{copy.hero.note}</p>
          </div>

          <figure className={styles.productPreview}>
            <div className={styles.previewMeta}>
              <span>{copy.hero.previewLabel}</span>
              <span>{copy.workflow.paths.slice(0, 3).map((path) => path.name).join(" · ")}</span>
            </div>
            <Image
              src={locale === "en"
                ? "/landing/geoai-map-workspace-preview.png"
                : "/landing/geoai-map-workspace-preview-ru.png"}
              alt={copy.hero.previewAlt}
              width={1280}
              height={720}
              priority
              sizes="(max-width: 767px) 94vw, (max-width: 1199px) 88vw, 760px"
            />
            <figcaption>{copy.hero.previewCaption}</figcaption>
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
          <Link href="/projects" className={styles.secondaryAction}>{copy.actions.projects}</Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <Link href="/" className={styles.footerBrand}><IdentitySymbol />GeoAI</Link>
          <nav aria-label={copy.actions.menu}>
            <a href="#product">{copy.footer.product}</a>
            <Link href="/projects">{copy.footer.projects}</Link>
            <Link href="/profile">{copy.footer.profile}</Link>
          </nav>
          <p>{copy.footer.rights}</p>
        </div>
      </footer>
    </main>
  );
}
