// ReactPdfRenderer — default, deterministic, server-side only (Node.js runtime).
// Font: NotoSans (full Vietnamese diacritics). Run scripts/download-fonts.sh once.
import path from "path";
import React from "react";
import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";

import type { CVDocument, CertItem, EducationItem, ExperienceItem, SkillItem, AwardItem, ActivityItem, PersonalityItem, SectionsConfig } from "@/lib/cv/types";
import { certLabel } from "@/lib/cv/certCatalog";
import type { CVRenderer } from "./types";

// ---------------------------------------------------------------------------
// Font registration (runs once per process)
// ---------------------------------------------------------------------------
const FONTS_DIR = path.join(process.cwd(), "public", "fonts");

Font.register({
  family: "NotoSans",
  fonts: [
    { src: path.join(FONTS_DIR, "NotoSans-Regular.ttf"),    fontWeight: 400 },
    { src: path.join(FONTS_DIR, "NotoSans-Bold.ttf"),       fontWeight: 700 },
    { src: path.join(FONTS_DIR, "NotoSans-Italic.ttf"),     fontWeight: 400, fontStyle: "italic" },
    { src: path.join(FONTS_DIR, "NotoSans-BoldItalic.ttf"), fontWeight: 700, fontStyle: "italic" },
  ],
});

// Disable hyphenation for Vietnamese — word-break rules differ.
Font.registerHyphenationCallback((word) => [word]);

// ---------------------------------------------------------------------------
// Stylesheet
// ---------------------------------------------------------------------------
const COLOR = {
  primary:  "#4F46E5",
  text:     "#1F2937",
  muted:    "#6B7280",
  border:   "#E5E7EB",
  bg:       "#F9FAFB",
  white:    "#FFFFFF",
  badge:    "#EEF2FF",
  badgeText:"#4338CA",
} as const;

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSans",
    fontSize: 9,
    color: COLOR.text,
    padding: "28px 36px",
    lineHeight: 1.5,
    backgroundColor: COLOR.white,
  },
  // Header
  header: { flexDirection: "row", alignItems: "flex-start", marginBottom: 16, gap: 14 },
  avatar: { width: 64, height: 64, borderRadius: 32, objectFit: "cover" },
  avatarPlaceholder: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLOR.primary, alignItems: "center", justifyContent: "center" },
  avatarInitial: { color: COLOR.white, fontSize: 24, fontWeight: 700 },
  headerRight: { flex: 1, justifyContent: "center" },
  name: { fontSize: 20, fontWeight: 700, color: COLOR.text, marginBottom: 3, letterSpacing: 0.2 },
  // Headline = role/subtitle. Medium weight + breathing room so it reads as a
  // subtitle under the name, not a cramped second title.
  headline: { fontSize: 10.5, color: COLOR.primary, fontWeight: 600, marginBottom: 8, lineHeight: 1.3 },
  // Contact row separated from the name block with a hairline for clear hierarchy.
  contactRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingTop: 6, borderTopWidth: 1, borderTopColor: COLOR.border },
  contactItem: { fontSize: 8, color: COLOR.muted },
  // Sections
  section: { marginTop: 12 },
  sectionTitle: {
    fontSize: 10, fontWeight: 700, color: COLOR.primary,
    borderBottomWidth: 1, borderBottomColor: COLOR.primary,
    paddingBottom: 2, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5,
  },
  // Entries
  entry: { marginBottom: 7 },
  entryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  entryTitle: { fontSize: 9, fontWeight: 700, flex: 1 },
  entryDate: { fontSize: 8, color: COLOR.muted, flexShrink: 0, marginLeft: 8 },
  entrySubtitle: { fontSize: 8, color: COLOR.muted, marginBottom: 2 },
  entryBody: { fontSize: 8, color: COLOR.text, lineHeight: 1.4 },
  // Skills
  skillsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  skillBadge: { backgroundColor: COLOR.badge, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  skillText: { fontSize: 8, color: COLOR.badgeText, fontWeight: 700 },
  skillDots: { flexDirection: "row", gap: 2, marginTop: 1 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  dotFilled: { backgroundColor: COLOR.primary },
  dotEmpty:  { backgroundColor: COLOR.border },
  // Inline badge
  badge: { backgroundColor: COLOR.badge, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 },
  badgeText: { fontSize: 7, color: COLOR.badgeText, fontWeight: 700 },
  // Summary box
  summaryBox: {
    backgroundColor: COLOR.bg, borderLeftWidth: 3, borderLeftColor: COLOR.primary,
    padding: "6px 10px", borderRadius: 3, marginBottom: 4,
  },
  summaryText: { fontSize: 8.5, color: COLOR.text, lineHeight: 1.5 },
  // Two-column grid (skills / certs)
  twoCol: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
});

// ---------------------------------------------------------------------------
// Helper sub-components
// ---------------------------------------------------------------------------
function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function DateRange({ start, end, isCurrent }: { start?: string | number | null; end?: string | number | null; isCurrent?: boolean }) {
  if (!start && !end) return null;
  const endLabel = isCurrent ? "Hiện tại" : (end ?? "?");
  return <Text style={styles.entryDate}>{start ?? "?"} – {endLabel}</Text>;
}

function SkillDots({ level }: { level: number }) {
  return (
    <View style={styles.skillDots}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={[styles.dot, i <= level ? styles.dotFilled : styles.dotEmpty]} />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Section renderers
// ---------------------------------------------------------------------------
function EducationSection({ items }: { items: EducationItem[] }) {
  if (!items.length) return null;
  return (
    <View style={styles.section}>
      <SectionTitle>Học vấn</SectionTitle>
      {items.map((edu) => (
        <View key={edu.id} style={styles.entry}>
          <View style={styles.entryHeader}>
            <Text style={styles.entryTitle}>{edu.schoolName}</Text>
            <DateRange start={edu.startYear} end={edu.endYear} isCurrent={edu.isCurrent} />
          </View>
          <Text style={styles.entrySubtitle}>{edu.level}</Text>
          {(edu.gpa || edu.grade12 || edu.grade11 || edu.grade10) && (
            <Text style={styles.entryBody}>
              {[
                edu.gpa       && `GPA: ${edu.gpa}`,
                edu.grade12   && `Lớp 12: ${edu.grade12}`,
                edu.grade11   && `Lớp 11: ${edu.grade11}`,
                edu.grade10   && `Lớp 10: ${edu.grade10}`,
              ].filter(Boolean).join("  |  ")}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

function ExperienceSection({ items }: { items: ExperienceItem[] }) {
  if (!items.length) return null;
  return (
    <View style={styles.section}>
      <SectionTitle>Kinh nghiệm & Dự án</SectionTitle>
      {items.map((exp) => (
        <View key={exp.id} style={styles.entry}>
          <View style={styles.entryHeader}>
            <Text style={styles.entryTitle}>{exp.title}</Text>
            <DateRange start={exp.startDate} end={exp.endDate} isCurrent={exp.isCurrent} />
          </View>
          {exp.organization && <Text style={styles.entrySubtitle}>{exp.organization}</Text>}
          {exp.description  && <Text style={styles.entryBody}>{exp.description}</Text>}
        </View>
      ))}
    </View>
  );
}

function SkillsSection({ items }: { items: SkillItem[] }) {
  if (!items.length) return null;
  return (
    <View style={styles.section}>
      <SectionTitle>Kỹ năng</SectionTitle>
      <View style={styles.skillsWrap}>
        {items.map((skill) => (
          <View key={skill.id} style={styles.skillBadge}>
            <Text style={styles.skillText}>{skill.name}</Text>
            {skill.proficiency && <SkillDots level={skill.proficiency} />}
          </View>
        ))}
      </View>
    </View>
  );
}

function CertsSection({ items }: { items: CertItem[] }) {
  if (!items.length) return null;
  return (
    <View style={styles.section}>
      <SectionTitle>Chứng chỉ</SectionTitle>
      {items.map((cert) => (
        <View key={cert.id} style={styles.entry}>
          <View style={styles.entryHeader}>
            <Text style={styles.entryTitle}>{certLabel(cert.code)}</Text>
            {cert.issuedDate && <Text style={styles.entryDate}>{cert.issuedDate}</Text>}
          </View>
          <Text style={styles.entryBody}>
            Điểm: {cert.score ?? "—"}
            {!cert.inCatalog && "  (chứng chỉ khác)"}
          </Text>
        </View>
      ))}
    </View>
  );
}

function AwardsSection({ items }: { items: AwardItem[] }) {
  if (!items.length) return null;
  return (
    <View style={styles.section}>
      <SectionTitle>Thành tích & Giải thưởng</SectionTitle>
      {items.map((award) => (
        <View key={award.id} style={styles.entry}>
          <View style={styles.entryHeader}>
            <Text style={styles.entryTitle}>{award.title}</Text>
            {award.awardYear && <Text style={styles.entryDate}>{award.awardYear}</Text>}
          </View>
          <Text style={styles.entrySubtitle}>
            {[award.rank, award.level, award.issuer].filter(Boolean).join(" · ")}
          </Text>
        </View>
      ))}
    </View>
  );
}

function ActivitiesSection({ items }: { items: ActivityItem[] }) {
  if (!items.length) return null;
  return (
    <View style={styles.section}>
      <SectionTitle>Hoạt động ngoại khóa</SectionTitle>
      {items.map((act) => (
        <View key={act.id} style={styles.entry}>
          <View style={styles.entryHeader}>
            <Text style={styles.entryTitle}>{act.title}</Text>
            <DateRange start={act.startDate} end={act.endDate} />
          </View>
          {act.role         && <Text style={styles.entrySubtitle}>{act.role}{act.organization && ` · ${act.organization}`}</Text>}
          {act.description  && <Text style={styles.entryBody}>{act.description}</Text>}
        </View>
      ))}
    </View>
  );
}

function PersonalitySection({ items }: { items: PersonalityItem[] }) {
  if (!items || !items.length) return null;
  return (
    <View style={styles.section}>
      <SectionTitle>Kết quả tính cách</SectionTitle>
      {items.map((item) => (
        <View key={item.id} style={styles.entry}>
          <View style={styles.entryHeader}>
            <Text style={styles.entryTitle}>{item.testSlug.toUpperCase()}: {item.resultCode}</Text>
          </View>
          {item.summary && <Text style={styles.entryBody}>{item.summary}</Text>}
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Root document component
// ---------------------------------------------------------------------------
function CvDocument({ doc }: { doc: CVDocument }) {
  const { basic, summary, education, experiences, skills, certificates, awards, activities, personality, sectionsConfig } = doc;
  const config = sectionsConfig as Partial<SectionsConfig>;
  const order: string[] = config.order ?? [
    "basic", "summary", "education", "experience_skills", "certs_awards", "activities", "personality",
  ];
  const visibility: Record<string, boolean> = config.visibility ?? {};
  const isVisible = (key: string) => visibility[key] !== false;

  const initials = basic.fullName
    ? basic.fullName.split(" ").map((w) => w[0]).slice(-2).join("").toUpperCase()
    : "CV";

  return (
    <Document
      title={basic.fullName ?? "CV"}
      author="ZPath CV Builder"
      creator="ZPath"
      producer="@react-pdf/renderer"
    >
      <Page size="A4" style={styles.page}>
        {/* Header — always rendered */}
        <View style={styles.header}>
          {basic.avatarUrl ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image style={styles.avatar} src={basic.avatarUrl} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>{initials}</Text>
            </View>
          )}
          <View style={styles.headerRight}>
            {basic.fullName && <Text style={styles.name}>{basic.fullName}</Text>}
            {summary.headline && <Text style={styles.headline}>{summary.headline}</Text>}
            {(basic.phone || basic.email || basic.address) && (
              <View style={styles.contactRow}>
                {basic.phone && <Text style={styles.contactItem}>📞 {basic.phone}</Text>}
                {basic.email && <Text style={styles.contactItem}>✉ {basic.email}</Text>}
                {basic.address && <Text style={styles.contactItem}>📍 {basic.address}</Text>}
              </View>
            )}
          </View>
        </View>

        {/* Summary */}
        {isVisible("summary") && summary.objective && (
          <View style={styles.summaryBox}>
            <Text style={styles.summaryText}>{summary.objective}</Text>
          </View>
        )}

        {/* Dynamic sections — respects user-defined order */}
        {order.filter(isVisible).map((key) => {
          switch (key) {
            case "education":
              return <EducationSection key={key} items={education} />;
            case "experience_skills":
              return (
                <View key={key} style={styles.twoCol}>
                  <View style={styles.col}><ExperienceSection items={experiences} /></View>
                  <View style={styles.col}><SkillsSection items={skills} /></View>
                </View>
              );
            case "certs_awards":
              return (
                <View key={key} style={styles.twoCol}>
                  <View style={styles.col}><CertsSection items={certificates} /></View>
                  <View style={styles.col}><AwardsSection items={awards} /></View>
                </View>
              );
            case "activities":
              return <ActivitiesSection key={key} items={activities} />;
            case "personality":
              return <PersonalitySection key={key} items={personality || []} />;
            default:
              return null;
          }
        })}
      </Page>
    </Document>
  );
}

// ---------------------------------------------------------------------------
// Renderer implementation
// ---------------------------------------------------------------------------
export class ReactPdfRenderer implements CVRenderer {
  async render(doc: CVDocument, _templateId: string): Promise<Uint8Array> {
    void _templateId;
    const buffer = await renderToBuffer(<CvDocument doc={doc} />);
    return new Uint8Array(buffer);
  }
}
