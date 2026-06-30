// two_column archetype — narrow left (contact/skills/certs) + wide right (edu/experience).
// sectionsConfig.visibility is respected; order is fixed per column.
import React from "react";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { CVDocument, SectionsConfig } from "@/lib/cv/types";
import type { LayoutConfig, Palette } from "../layoutConfig";
import { DENSITY_TOKENS } from "../layoutConfig";
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
  const dens = DENSITY_TOKENS[layout.density];
  const font = layout.fontFamily;
  const extra = StyleSheet.create({
    page: {
      fontFamily: font, fontSize: sz(9), color: c.text,
      lineHeight: dens.lineHeight, backgroundColor: c.white, flexDirection: "row",
    },
    leftCol: {
      width: "31%", backgroundColor: c.bg,
      padding: "24px 12px 24px 16px",
    },
    rightCol: { flex: 1, padding: "24px 16px 24px 12px" },
    avatar: { width: 56, height: 56, borderRadius: 28, objectFit: "cover", marginBottom: 8 },
    avatarPlaceholder: { width: 56, height: 56, borderRadius: 28, backgroundColor: c.primary, alignItems: "center", justifyContent: "center", marginBottom: 8 },
    avatarInitial: { color: c.white, fontSize: sz(20), fontFamily: font, fontWeight: 700 },
    name: { fontSize: sz(13), fontFamily: font, fontWeight: 700, color: c.text, marginBottom: 2 },
    headline: { fontSize: sz(8.5), fontFamily: font, color: c.accent, fontWeight: 600, marginBottom: 8, lineHeight: 1.3 },
    leftLabel: { fontSize: sz(7), fontFamily: font, color: c.muted, marginBottom: 2 },
    leftValue: { fontSize: sz(7.5), fontFamily: font, color: c.text, marginBottom: 6 },
    leftSep: { borderTopWidth: 0.5, borderTopColor: c.border, marginVertical: 8 },
    rightName: { fontSize: sz(20), fontFamily: font, fontWeight: 700, color: c.text, marginBottom: 2 },
    rightHeadline: { fontSize: sz(10), fontFamily: font, color: c.accent, fontWeight: 600, lineHeight: 1.3, marginBottom: 10 },
  });
  return { ...base, ...extra };
}

export function TwoColumnDocument({ doc, layout, palette }: { doc: CVDocument; layout: LayoutConfig; palette: Palette }) {
  const styles = buildStyles(layout, palette);
  const { basic, summary, education, experiences, skills, certificates, awards, activities, personality, sectionsConfig } = doc;
  const config = sectionsConfig as Partial<SectionsConfig>;
  const vis: Record<string, boolean> = config.visibility ?? {};
  const show = (k: string) => vis[k] !== false;
  const initials = basic.fullName
    ? basic.fullName.split(" ").map((w) => w[0]).slice(-2).join("").toUpperCase() : "CV";

  return (
      <Document title={basic.fullName ?? "CV"} author="ZPath CV Builder" creator="ZPath" producer="@react-pdf/renderer">
        <Page size="A4" style={styles.page}>
          {/* Left column — contact, skills, certs, awards */}
          <View style={styles.leftCol}>
            {layout.showPhoto && (
              basic.avatarUrl
                ? <Image style={styles.avatar} src={basic.avatarUrl} />  // eslint-disable-line jsx-a11y/alt-text
                : <View style={styles.avatarPlaceholder}><Text style={styles.avatarInitial}>{initials}</Text></View>
            )}
            <Text style={styles.name}>{basic.fullName ?? ""}</Text>
            {summary.headline && <Text style={styles.headline}>{summary.headline}</Text>}

            <View style={styles.leftSep} />

            {basic.phone && (
              <><Text style={styles.leftLabel}>Điện thoại</Text><Text style={styles.leftValue}>{basic.phone}</Text></>
            )}
            {basic.email && (
              <><Text style={styles.leftLabel}>Email</Text><Text style={styles.leftValue}>{basic.email}</Text></>
            )}
            {basic.address && (
              <><Text style={styles.leftLabel}>Địa chỉ</Text><Text style={styles.leftValue}>{basic.address}</Text></>
            )}

            {show("experience_skills") && skills.length > 0 && (
              <><View style={styles.leftSep} /><SkillsSection s={styles} items={skills} palette={palette} /></>
            )}
            {show("certs_awards") && certificates.length > 0 && (
              <><View style={styles.leftSep} /><CertsSection s={styles} items={certificates} /></>
            )}
            {show("certs_awards") && awards.length > 0 && (
              <><View style={styles.leftSep} /><AwardsSection s={styles} items={awards} /></>
            )}
          </View>

          {/* Right column — summary, education, experience, activities */}
          <View style={styles.rightCol}>
            {show("summary") && summary.objective && (
              <View style={styles.summaryBox}>
                <Text style={styles.summaryText}>{summary.objective}</Text>
              </View>
            )}
            {show("education") && <EducationSection s={styles} items={education} />}
            {show("experience_skills") && <ExperienceSection s={styles} items={experiences} />}
            {show("activities") && <ActivitiesSection s={styles} items={activities} />}
            {show("personality") && <PersonalitySection s={styles} items={personality ?? []} />}
          </View>
        </Page>
      </Document>
  );
}
