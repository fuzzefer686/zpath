// Shared section renderers and StyleCtx used by all 4 archetype components.
// Keeps section content in one place; archetypes only control page layout.
import React from "react";
import { StyleSheet, Text, View } from "@react-pdf/renderer";

import type {
  ActivityItem,
  AwardItem,
  CertItem,
  EducationItem,
  ExperienceItem,
  PersonalityItem,
  SkillItem,
} from "@/lib/cv/types";
import { certLabel } from "@/lib/cv/certCatalog";
import type { LayoutConfig, Palette } from "../layoutConfig";
import { DENSITY_TOKENS, SPACING_TOKENS } from "../layoutConfig";

// ---------------------------------------------------------------------------
// Base styles — built from LayoutConfig tokens, used by all section renderers.
// Each archetype passes these (or a superset) via StyleCtx.
// ---------------------------------------------------------------------------
export function buildBaseStyles(layout: LayoutConfig, c: Palette) {
  const scale = layout.fontScale;
  const sz = (n: number) => Math.round(n * scale * 10) / 10;
  const dens = DENSITY_TOKENS[layout.density];
  const space = SPACING_TOKENS[layout.spacing];
  const font = layout.fontFamily;

  return StyleSheet.create({
    // page is archetype-specific, not here
    section: { marginTop: space.sectionTop },
    sectionTitle: {
      fontSize: sz(9.5), fontFamily: font, fontWeight: 700, color: c.primary,
      borderBottomWidth: 1, borderBottomColor: c.primary,
      paddingBottom: 2, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5,
    },
    entry: { marginBottom: dens.entryBottom },
    entryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    entryTitle: { fontSize: sz(9), fontFamily: font, fontWeight: 700, flex: 1 },
    entryDate: { fontSize: sz(7.5), fontFamily: font, color: c.muted, flexShrink: 0, marginLeft: 6 },
    entrySubtitle: { fontSize: sz(7.5), fontFamily: font, color: c.muted, marginBottom: 2 },
    entryBody: { fontSize: sz(7.5), fontFamily: font, color: c.text, lineHeight: Math.max(1.3, dens.lineHeight - 0.1) },
    skillsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
    skillBadge: { backgroundColor: c.badge, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3 },
    skillText: { fontSize: sz(7.5), fontFamily: font, color: c.badgeText, fontWeight: 700 },
    skillDots: { flexDirection: "row", gap: 2, marginTop: 1 },
    dot: { width: 4, height: 4, borderRadius: 2 },
    dotFilled: { backgroundColor: c.primary },
    dotEmpty: { backgroundColor: c.border },
    summaryBox: {
      backgroundColor: c.summaryBg, borderLeftWidth: 3, borderLeftColor: c.primary,
      padding: "5px 8px", borderRadius: 2, marginBottom: 4,
    },
    summaryText: { fontSize: sz(8), fontFamily: font, color: c.text, lineHeight: dens.lineHeight },
    twoCol: { flexDirection: "row", gap: space.twoColGap },
    col: { flex: 1 },
  });
}

export type BaseStyles = ReturnType<typeof buildBaseStyles>;

// ---------------------------------------------------------------------------
// Styles are threaded explicitly via the `s` prop (NOT React context).
// React.createContext is unavailable in Next's server graph — it throws
// "createContext only works in Client Components" — and these renderers run
// server-side under @react-pdf's reconciler. Passing styles as a prop also
// keeps the renderer a pure function, safe under concurrent render() calls.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Helper atoms
// ---------------------------------------------------------------------------
export function SectionTitle({ s, children, color }: { s: BaseStyles; children: string; color?: string }) {
  return (
    <Text style={color ? { ...s.sectionTitle, color, borderBottomColor: color } : s.sectionTitle}>
      {children}
    </Text>
  );
}

export function DateRange({
  s, start, end, isCurrent,
}: { s: BaseStyles; start?: string | number | null; end?: string | number | null; isCurrent?: boolean }) {
  if (!start && !end) return null;
  const endLabel = isCurrent ? "Hiện tại" : (end ?? "?");
  return <Text style={s.entryDate}>{start ?? "?"} – {endLabel}</Text>;
}

export function SkillDots({ s, level, primary, border }: { s: BaseStyles; level: number; primary: string; border: string }) {
  return (
    <View style={s.skillDots}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={[s.dot, i <= level ? { backgroundColor: primary } : { backgroundColor: border }]} />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Section content renderers — palette passed for dot colours.
// ---------------------------------------------------------------------------
export function EducationSection({ s, items }: { s: BaseStyles; items: EducationItem[] }) {
  if (!items.length) return null;
  return (
    <View style={s.section}>
      <SectionTitle s={s}>Học vấn</SectionTitle>
      {items.map((edu) => (
        <View key={edu.id} style={s.entry}>
          <View style={s.entryHeader}>
            <Text style={s.entryTitle}>{edu.schoolName}</Text>
            <DateRange s={s} start={edu.startYear} end={edu.endYear} isCurrent={edu.isCurrent} />
          </View>
          <Text style={s.entrySubtitle}>{edu.level}</Text>
          {(edu.gpa || edu.grade12 || edu.grade11 || edu.grade10) && (
            <Text style={s.entryBody}>
              {[
                edu.gpa     && `GPA: ${edu.gpa}`,
                edu.grade12 && `Lớp 12: ${edu.grade12}`,
                edu.grade11 && `Lớp 11: ${edu.grade11}`,
                edu.grade10 && `Lớp 10: ${edu.grade10}`,
              ].filter(Boolean).join("  |  ")}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

export function ExperienceSection({ s, items }: { s: BaseStyles; items: ExperienceItem[] }) {
  if (!items.length) return null;
  return (
    <View style={s.section}>
      <SectionTitle s={s}>Kinh nghiệm & Dự án</SectionTitle>
      {items.map((exp) => (
        <View key={exp.id} style={s.entry}>
          <View style={s.entryHeader}>
            <Text style={s.entryTitle}>{exp.title}</Text>
            <DateRange s={s} start={exp.startDate} end={exp.endDate} isCurrent={exp.isCurrent} />
          </View>
          {exp.organization && <Text style={s.entrySubtitle}>{exp.organization}</Text>}
          {exp.description  && <Text style={s.entryBody}>{exp.description}</Text>}
        </View>
      ))}
    </View>
  );
}

export function SkillsSection({ s, items, palette }: { s: BaseStyles; items: SkillItem[]; palette: Palette }) {
  if (!items.length) return null;
  return (
    <View style={s.section}>
      <SectionTitle s={s}>Kỹ năng</SectionTitle>
      <View style={s.skillsWrap}>
        {items.map((skill) => (
          <View key={skill.id} style={s.skillBadge}>
            <Text style={s.skillText}>{skill.name}</Text>
            {skill.proficiency && (
              <SkillDots s={s} level={skill.proficiency} primary={palette.primary} border={palette.border} />
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

// Skills section with dark background (for sidebar archetype)
export function SkillsSectionDark({ s, items }: { s: BaseStyles; items: SkillItem[] }) {
  if (!items.length) return null;
  return (
    <View style={s.section}>
      <Text style={{ ...s.sectionTitle, color: "rgba(255,255,255,0.9)", borderBottomColor: "rgba(255,255,255,0.3)" }}>
        KỸ NĂNG
      </Text>
      <View style={s.skillsWrap}>
        {items.map((skill) => (
          <View key={skill.id} style={{ ...s.skillBadge, backgroundColor: "rgba(255,255,255,0.15)" }}>
            <Text style={{ ...s.skillText, color: "#FFFFFF" }}>{skill.name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function CertsSection({ s, items }: { s: BaseStyles; items: CertItem[] }) {
  if (!items.length) return null;
  return (
    <View style={s.section}>
      <SectionTitle s={s}>Chứng chỉ</SectionTitle>
      {items.map((cert) => (
        <View key={cert.id} style={s.entry}>
          <View style={s.entryHeader}>
            <Text style={s.entryTitle}>{certLabel(cert.code)}</Text>
            {cert.issuedDate && <Text style={s.entryDate}>{cert.issuedDate}</Text>}
          </View>
          <Text style={s.entryBody}>
            Điểm: {cert.score ?? "—"}{!cert.inCatalog && "  (chứng chỉ khác)"}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function AwardsSection({ s, items }: { s: BaseStyles; items: AwardItem[] }) {
  if (!items.length) return null;
  return (
    <View style={s.section}>
      <SectionTitle s={s}>Giải thưởng</SectionTitle>
      {items.map((award) => (
        <View key={award.id} style={s.entry}>
          <View style={s.entryHeader}>
            <Text style={s.entryTitle}>{award.title}</Text>
            {award.awardYear && <Text style={s.entryDate}>{award.awardYear}</Text>}
          </View>
          <Text style={s.entrySubtitle}>
            {[award.rank, award.level, award.issuer].filter(Boolean).join(" · ")}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function ActivitiesSection({ s, items }: { s: BaseStyles; items: ActivityItem[] }) {
  if (!items.length) return null;
  return (
    <View style={s.section}>
      <SectionTitle s={s}>Hoạt động ngoại khóa</SectionTitle>
      {items.map((act) => (
        <View key={act.id} style={s.entry}>
          <View style={s.entryHeader}>
            <Text style={s.entryTitle}>{act.title}</Text>
            <DateRange s={s} start={act.startDate} end={act.endDate} />
          </View>
          {act.role && (
            <Text style={s.entrySubtitle}>{act.role}{act.organization && ` · ${act.organization}`}</Text>
          )}
          {act.description && <Text style={s.entryBody}>{act.description}</Text>}
        </View>
      ))}
    </View>
  );
}

export function PersonalitySection({ s, items }: { s: BaseStyles; items: PersonalityItem[] }) {
  if (!items?.length) return null;
  return (
    <View style={s.section}>
      <SectionTitle s={s}>Kết quả tính cách</SectionTitle>
      {items.map((item) => (
        <View key={item.id} style={s.entry}>
          {/* entryTitle has flex:1 (sized for the entryHeader row). Used bare in
              a column it collapses to 0 height and the summary overlaps it, so
              wrap it in the row like every other section. */}
          <View style={s.entryHeader}>
            <Text style={s.entryTitle}>{item.testSlug.toUpperCase()}: {item.resultCode}</Text>
          </View>
          {item.summary && <Text style={s.entryBody}>{item.summary}</Text>}
        </View>
      ))}
    </View>
  );
}
