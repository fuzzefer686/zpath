"use client";

import { useEffect, useState } from "react";

export function useActiveAdmissionSection(sectionIds: string[]) {
  const [activeId, setActiveId] = useState(sectionIds[0] ?? "");

  useEffect(() => {
    if (!sectionIds.length) return undefined;

    const visibleSections = new Map<string, number>();

    function syncFromHash() {
      const hashId = window.location.hash.slice(1);
      if (sectionIds.includes(hashId)) {
        setActiveId(hashId);
      }
    }

    syncFromHash();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visibleSections.set(entry.target.id, entry.intersectionRatio);
          } else {
            visibleSections.delete(entry.target.id);
          }
        }

        if (!visibleSections.size) return;

        const nextActiveId = [...visibleSections.entries()].sort(
          ([leftId, leftRatio], [rightId, rightRatio]) =>
            rightRatio - leftRatio ||
            sectionIds.indexOf(leftId) - sectionIds.indexOf(rightId),
        )[0]?.[0];

        if (nextActiveId) {
          setActiveId(nextActiveId);
        }
      },
      {
        rootMargin: "-24% 0px -58% 0px",
        threshold: [0.12, 0.28, 0.44, 0.6],
      },
    );

    for (const id of sectionIds) {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    }

    window.addEventListener("hashchange", syncFromHash);

    return () => {
      observer.disconnect();
      window.removeEventListener("hashchange", syncFromHash);
    };
  }, [sectionIds]);

  return activeId;
}
