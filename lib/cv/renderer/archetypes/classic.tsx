// classic archetype — 1 column, header top, sections flow down.
// Equivalent to the original layout from Task 2A but uses shared renderers.
import React from "react";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { CVDocument, SectionsConfig } from "@/lib/cv/types";
import type { LayoutConfig, Palette } from "../layoutConfig";
import { SPACING_TOKENS } from "../layoutConfig";
import {
  ActivitiesSection,
  AwardsSection,
  buildBaseStyles,
  CertsSection,
  EducationSection,
  ExperienceSection,
  PersonalitySection,
  SkillsSection,
} from "./shared";

function buildStyles(layout: LayoutConfig, c: Palette) {
  const base = buildBaseStyles(layout, c);
  const sz = (n: number) => Math.round(n * layout.fontScale * 10) / 10;
  const space = SPACING_TOKENS[layout.spacing];
  const font = layout.fontFamily;
  const extra = StyleSheet.create({
    page: {
      fontFamily: font, fontSize: sz(9), color: c.text,
      padding: space.pagePadding, lineHeight: 1.5, backgroundColor: c.white,
    },
    header: { flexDirection: "row", alignItems: "flex-start", marginBottom: space.headerBottom, gap: 12 },
    avatar: { width: 60, height: 60, borderRadius: 30, objectFit: "cover" },
    avatarPlaceholder: { width: 60, height: 60, borderRadius: 30, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" },
    avatarInitial: { color: c.white, fontSize: sz(22), fontFamily: font, fontWeight: 700 },
    headerRight: { flex: 1 },
    name: { fontSize: sz(19), fontFamily: font, fontWeight: 700, color: c.text, marginBottom: 2 },
    headline: { fontSize: sz(10), fontFamily: font, color: c.accent, fontWeight: 600, marginBottom: 6, lineHeight: 1.3 },
    contactRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingTop: 5, borderTopWidth: 1, borderTopColor: c.border },
    contactItem: { fontSize: sz(7.5), fontFamily: font, color: c.muted },
    summaryWrap: { marginBottom: 4 },
  });
  return { ...base, ...extra };
}

export function ClassicDocument({ doc, layout, palette }: { doc: CVDocument; layout: LayoutConfig; palette: Palette }) {
  const styles = buildStyles(layout, palette);
  const { basic, summary, education, experiences, skills, certificates, awards, activities, personality, sectionsConfig } = doc;
  const config = sectionsConfig as Partial<SectionsConfig>;
  const order = config.order ?? layout.sectionsOrder;
  const vis: Record<string, boolean> = config.visibility ?? {};
  const show = (k: string) => vis[k] !== false;
  const initials = basic.fullName
    ? basic.fullName.split(" ").map((w) => w[0]).slice(-2).join("").toUpperCase() : "CV";

  return (
      <Document title={basic.fullName ?? "CV"} author="ZPath CV Builder" creator="ZPath" producer="@react-pdf/renderer">
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            {layout.showPhoto && (
              basic.avatarUrl
                ? <Image style={styles.avatar} src={basic.avatarUrl} />  // eslint-disable-line jsx-a11y/alt-text
                : <View style={styles.avatarPlaceholder}><Text style={styles.avatarInitial}>{initials}</Text></View>
            )}
            <View style={styles.headerRight}>
              {basic.fullName && <Text style={styles.name}>{basic.fullName}</Text>}
              {summary.headline && <Text style={styles.headline}>{summary.headline}</Text>}
              {(basic.phone || basic.email || basic.address) && (
                <View style={styles.contactRow}>
                  {basic.phone   && <Text style={styles.contactItem}>📞 {basic.phone}</Text>}
                  {basic.email   && <Text style={styles.contactItem}>✉ {basic.email}</Text>}
                  {basic.address && <Text style={styles.contactItem}>📍 {basic.address}</Text>}
                </View>
              )}
            </View>
          </View>

          {show("summary") && summary.objective && (
            <View style={styles.summaryBox}>
              <Text style={styles.summaryText}>{summary.objective}</Text>
            </View>
          )}

          {order.filter(show).map((key) => {
            switch (key) {
              case "education": return <EducationSection key={key} s={styles} items={education} />;
              case "experience_skills": return (
                <View key={key} style={styles.twoCol}>
                  <View style={styles.col}><ExperienceSection s={styles} items={experiences} /></View>
                  <View style={styles.col}><SkillsSection s={styles} items={skills} palette={palette} /></View>
                </View>
              );
              case "certs_awards": return (
                <View key={key} style={styles.twoCol}>
                  <View style={styles.col}><CertsSection s={styles} items={certificates} /></View>
                  <View style={styles.col}><AwardsSection s={styles} items={awards} /></View>
                </View>
              );
              case "activities": return <ActivitiesSection key={key} s={styles} items={activities} />;
              case "personality": return <PersonalitySection key={key} s={styles} items={personality ?? []} />;
              default: return null;
            }
          })}
        </Page>
      </Document>
  );
}
