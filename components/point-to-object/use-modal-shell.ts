"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "summary",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

export function useModalShell(onEscape: () => void): RefObject<HTMLElement | null> {
  const containerRef = useRef<HTMLElement>(null);
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousBodyOverflow = document.body.style.overflow;
    const inerted: Array<{ element: HTMLElement; wasInert: boolean }> = [];

    let activeBranch: HTMLElement = container;
    while (activeBranch.parentElement) {
      const parent = activeBranch.parentElement;
      for (const sibling of parent.children) {
        if (sibling !== activeBranch && sibling instanceof HTMLElement) {
          inerted.push({ element: sibling, wasInert: sibling.inert });
          sibling.inert = true;
        }
      }
      if (parent === document.body) break;
      activeBranch = parent;
    }

    document.body.style.overflow = "hidden";
    const initialFocus = container.querySelector<HTMLElement>("[data-modal-initial-focus]") ?? container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    initialFocus?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onEscapeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [...container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)]
        .filter((element) => !element.hidden && element.getClientRects().length > 0);
      if (!focusable.length) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !container.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      for (const { element, wasInert } of inerted) element.inert = wasInert;
      previouslyFocused?.focus();
    };
  }, []);

  return containerRef;
}
