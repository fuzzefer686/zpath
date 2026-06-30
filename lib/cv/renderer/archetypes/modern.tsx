// modern archetype — full-width accent header block + decorative section titles.
// 1-column body with generous spacing; respects sectionsConfig.order + visibility.
import React from "react";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { CVDocument, SectionsConfig } from "@/lib/cv/types";
import type { LayoutConfig, Palette } from "../layoutConfig";
import type { BaseStyles } from "./shared";
import { DENSITY_TOKENS, SPACING_TOKENS } from "../layoutConfig";
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

// Styles used by section renderers (BaseStyles-compatible — overrides some keys).
function buildSectionStyles(layout: LayoutConfig, c: Palette): BaseStyles {
  const base = buildBaseStyles(layout, c);
  const sz = (n: number) => Math.round(n * layout.fontScale * 10) / 10;
  const dens = DENSITY_TOKENS[layout.density];
  const font = layout.fontFamily;
  // Modern: section title uses accent underline line (thicker, accent color)
  const modernSectionTitle = StyleSheet.create({
    s: {
      fontSize: sz(9.5), fontFamily: font, fontWeight: 700, color: c.primary,
      borderBottomWidth: 1.5, borderBottomColor: c.accent,
      paddingBottom: 2, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.6,
    },
  }).s;
  // Modern summary: side bar accent, no fill background
  const modernSummaryBox = StyleSheet.create({
    s: { backgroundColor: "transparent", borderRadius: 0, borderLeftWidth: 3, borderLeftColor: c.accent, padding: "5px 8px", marginBottom: 10 },
  }).s;
  const modernSummaryText = StyleSheet.create({
    s: { fontSize: sz(8), fontFamily: font, color: c.text, lineHeight: dens.lineHeight },
  }).s;
  return { ...base, sectionTitle: modernSectionTitle, summaryBox: modernSummaryBox, summaryText: modernSummaryText };
}

// Page-level styles (NOT part of BaseStyles — used directly in JSX).
function buildPageStyles(layout: LayoutConfig, c: Palette) {
  const sz = (n: number) => Math.round(n * layout.fontScale * 10) / 10;
  const dens = DENSITY_TOKENS[layout.density];
  const space = SPACING_TOKENS[layout.spacing];
  const font = layout.fontFamily;
  const hPad = layout.spacing === "compact" ? 28 : layout.spacing === "spacious" ? 46 : 36;
  const vPad = layout.spacing === "compact" ? 20 : layout.spacing === "spacious" ? 38 : 28;
  return StyleSheet.create({
    page: {
      fontFamily: font, fontSize: sz(9), color: c.text,
      padding: `${vPad}px ${hPad}px`,
      lineHeight: dens.lineHeight, backgroundColor: c.white,
    },
    headerBlock: {
      marginTop: -vPad, marginLeft: -hPad, marginRight: -hPad,
      backgroundColor: c.primary,
      padding: `${vPad + 4}px ${hPad}px ${vPad - 4}px`,
      marginBottom: 14,
      flexDirection: "row" as const, alignItems: "center" as const, gap: 14,
    },
    avatar: {
      width: 60, height: 60, borderRadius: 30, objectFit: "cover" as const,
      borderWidth: 2, borderColor: "rgba(255,255,255,0.6)",
    },
    avatarPlaceholder: {
      width: 60, height: 60, borderRadius: 30,
      backgroundColor: "rgba(255,255,255,0.2)",
      alignItems: "center" as const, justifyContent: "center" as const,
      borderWidth: 2, borderColor: "rgba(255,255,255,0.5)",
    },
    avatarInitial: { color: "#FFFFFF", fontSize: sz(22), fontFamily: font, fontWeight: 700 },
    headerText: { flex: 1 },
    name: { fontSize: sz(20), fontFamily: font, fontWeight: 700, color: "#FFFFFF", marginBottom: 2 },
    headline: { fontSize: sz(10), fontFamily: font, color: "rgba(255,255,255,0.85)", fontWeight: 600, marginBottom: 6, lineHeight: 1.3 },
    contactRow: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 10 },
    contactItem: { fontSize: sz(7.5), fontFamily: font, color: "rgba(255,255,255,0.75)" },
    twoCol: { flexDirection: "row" as const, gap: space.twoColGap },
    col: { flex: 1 },
  });
}

export function ModernDocument({ doc, layout, palette }: { doc: CVDocument; layout: LayoutConfig; palette: Palette }) {
  const sectionStyles = buildSectionStyles(layout, palette);
  const pg = buildPageStyles(layout, palette);
  const { basic, summary, education, experiences, skills, certificates, awards, activities, personality, sectionsConfig } = doc;
  const config = sectionsConfig as Partial<SectionsConfig>;
  const order = config.order ?? layout.sectionsOrder;
  const vis: Record<string, boolean> = config.visibility ?? {};
  const show = (k: string) => vis[k] !== false;
  const initials = basic.fullName
    ? basic.fullName.split(" ").map((w) => w[0]).slice(-2).join("").toUpperCase() : "CV";

  return (
      <Document title={basic.fullName ?? "CV"} author="ZPath CV Builder" creator="ZPath" producer="@react-pdf/renderer">
        <Page size="A4" style={pg.page}>
          {/* Full-width accent header — bleeds to page edges via negative margin */}
          <View style={pg.headerBlock}>
            {layout.showPhoto && (
              basic.avatarUrl
                ? <Image style={pg.avatar} src={basic.avatarUrl} />  // eslint-disable-line jsx-a11y/alt-text
                : <View style={pg.avatarPlaceholder}><Text style={pg.avatarInitial}>{initials}</Text></View>
            )}
            <View style={pg.headerText}>
              {basic.fullName && <Text style={pg.name}>{basic.fullName}</Text>}
              {summary.headline && <Text style={pg.headline}>{summary.headline}</Text>}
              {(basic.phone || basic.email || basic.address) && (
                <View style={pg.contactRow}>
                  {basic.phone   && <Text style={pg.contactItem}>📞 {basic.phone}</Text>}
                  {basic.email   && <Text style={pg.contactItem}>✉ {basic.email}</Text>}
                  {basic.address && <Text style={pg.contactItem}>📍 {basic.address}</Text>}
                </View>
              )}
            </View>
          </View>

          {show("summary") && summary.objective && (
            <View style={sectionStyles.summaryBox}>
              <Text style={sectionStyles.summaryText}>{summary.objective}</Text>
            </View>
          )}

          {order.filter(show).map((key) => {
            switch (key) {
              case "education": return <EducationSection key={key} s={sectionStyles} items={education} />;
              case "experience_skills": return (
                <View key={key} style={pg.twoCol}>
                  <View style={pg.col}><ExperienceSection s={sectionStyles} items={experiences} /></View>
                  <View style={pg.col}><SkillsSection s={sectionStyles} items={skills} palette={palette} /></View>
                </View>
              );
              case "certs_awards": return (
                <View key={key} style={pg.twoCol}>
                  <View style={pg.col}><CertsSection s={sectionStyles} items={certificates} /></View>
                  <View style={pg.col}><AwardsSection s={sectionStyles} items={awards} /></View>
                </View>
              );
              case "activities": return <ActivitiesSection key={key} s={sectionStyles} items={activities} />;
              case "personality": return <PersonalitySection key={key} s={sectionStyles} items={personality ?? []} />;
              default: return null;
            }
          })}
        </Page>
      </Document>
  );
}
