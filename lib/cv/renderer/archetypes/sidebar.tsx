// sidebar archetype — colored left panel (avatar + contact + skills) + white right content.
// sectionsConfig.visibility respected; column assignment is fixed by the archetype.
import React from "react";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { CVDocument, SectionsConfig } from "@/lib/cv/types";
import type { LayoutConfig, Palette } from "../layoutConfig";
import { DENSITY_TOKENS, tint } from "../layoutConfig";
import {
  ActivitiesSection,
  AwardsSection,
  buildBaseStyles,
  CertsSection,
  EducationSection,
  ExperienceSection,
  PersonalitySection,
  SkillsSectionDark,
} from "./shared";

function buildStyles(layout: LayoutConfig, c: Palette) {
  const base = buildBaseStyles(layout, c);
  const sz = (n: number) => Math.round(n * layout.fontScale * 10) / 10;
  const dens = DENSITY_TOKENS[layout.density];
  const font = layout.fontFamily;
  const sidebarBg = c.primary;
  const sidebarText = "#FFFFFF";
  const sidebarMuted = "rgba(255,255,255,0.72)";
  const extra = StyleSheet.create({
    page: {
      fontFamily: font, fontSize: sz(9), color: c.text,
      lineHeight: dens.lineHeight, backgroundColor: c.white, flexDirection: "row",
    },
    sidebar: { width: "29%", backgroundColor: sidebarBg, padding: "24px 12px" },
    content: { flex: 1, padding: "24px 16px 24px 14px" },
    avatar: { width: 64, height: 64, borderRadius: 32, objectFit: "cover", borderWidth: 2, borderColor: sidebarText, marginBottom: 10, alignSelf: "center" },
    avatarPlaceholder: { width: 64, height: 64, borderRadius: 32, backgroundColor: tint(c.primary, 0.3), alignItems: "center", justifyContent: "center", marginBottom: 10, alignSelf: "center", borderWidth: 2, borderColor: sidebarText },
    avatarInitial: { color: sidebarText, fontSize: sz(22), fontFamily: font, fontWeight: 700 },
    sidebarName: { fontSize: sz(12), fontFamily: font, fontWeight: 700, color: sidebarText, textAlign: "center", marginBottom: 2 },
    sidebarHeadline: { fontSize: sz(8), fontFamily: font, color: sidebarMuted, textAlign: "center", marginBottom: 10, lineHeight: 1.3 },
    sidebarSep: { borderTopWidth: 0.5, borderTopColor: "rgba(255,255,255,0.25)", marginVertical: 8 },
    sidebarLabel: { fontSize: sz(6.5), fontFamily: font, color: sidebarMuted, marginBottom: 1, textTransform: "uppercase", letterSpacing: 0.4 },
    sidebarValue: { fontSize: sz(7.5), fontFamily: font, color: sidebarText, marginBottom: 5 },
    rightHeadline: { fontSize: sz(20), fontFamily: font, fontWeight: 700, color: c.text, marginBottom: 3 },
    rightSubhead: { fontSize: sz(10), fontFamily: font, color: c.accent, fontWeight: 600, marginBottom: 10 },
  });
  return { ...base, ...extra };
}

export function SidebarDocument({ doc, layout, palette }: { doc: CVDocument; layout: LayoutConfig; palette: Palette }) {
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
          {/* Colored sidebar */}
          <View style={styles.sidebar}>
            {layout.showPhoto && (
              basic.avatarUrl
                ? <Image style={styles.avatar} src={basic.avatarUrl} />  // eslint-disable-line jsx-a11y/alt-text
                : <View style={styles.avatarPlaceholder}><Text style={styles.avatarInitial}>{initials}</Text></View>
            )}
            <Text style={styles.sidebarName}>{basic.fullName ?? ""}</Text>
            {summary.headline && <Text style={styles.sidebarHeadline}>{summary.headline}</Text>}

            {(basic.phone || basic.email || basic.address) && (
              <><View style={styles.sidebarSep} />
              {basic.phone   && <><Text style={styles.sidebarLabel}>Điện thoại</Text><Text style={styles.sidebarValue}>{basic.phone}</Text></>}
              {basic.email   && <><Text style={styles.sidebarLabel}>Email</Text><Text style={styles.sidebarValue}>{basic.email}</Text></>}
              {basic.address && <><Text style={styles.sidebarLabel}>Địa chỉ</Text><Text style={styles.sidebarValue}>{basic.address}</Text></>}
              </>
            )}

            {show("experience_skills") && skills.length > 0 && (
              <><View style={styles.sidebarSep} /><SkillsSectionDark s={styles} items={skills} /></>
            )}
          </View>

          {/* Right content */}
          <View style={styles.content}>
            {show("summary") && summary.objective && (
              <View style={styles.summaryBox}>
                <Text style={styles.summaryText}>{summary.objective}</Text>
              </View>
            )}
            {show("education") && <EducationSection s={styles} items={education} />}
            {show("experience_skills") && <ExperienceSection s={styles} items={experiences} />}
            {show("certs_awards") && certificates.length > 0 && <CertsSection s={styles} items={certificates} />}
            {show("certs_awards") && awards.length > 0 && <AwardsSection s={styles} items={awards} />}
            {show("activities") && <ActivitiesSection s={styles} items={activities} />}
            {show("personality") && <PersonalitySection s={styles} items={personality ?? []} />}
          </View>
        </Page>
      </Document>
  );
}
