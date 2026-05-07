"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Camera, Save, Trash2, CheckCircle2, ArrowRight, User, GraduationCap, Trophy, MapPin, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, NumberInput, SelectInput } from "@/components/zpath/FormFields";
import { SbtiPicker } from "@/components/zpath/SbtiPicker";
import { REGIONS, SUBJECTS } from "@/types/zpath";
import type { TrialFormData } from "@/types/zpath";
import { EMPTY_PROFILE, type UserProfile, saveProfile as cacheLocal } from "@/types/profile";
import { fetchProfile, upsertProfile } from "@/lib/profile-db";
import { UNIVERSITIES } from "@/data/universities";
import { useUserProfile } from "@/hooks/useUserProfile";

export default function ProfilePage() {
  const { googleUser: user, isLoading: userLoading } = useUserProfile({ requireAuth: true });
  const [data, setData] = useState<UserProfile>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    fetchProfile(user.id)
      .then((p) => setData(p))
      .catch((e) => console.error(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  const update = <K extends keyof UserProfile>(k: K, v: UserProfile[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const onAvatar = (file?: File | null) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Ảnh quá lớn (tối đa 2MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => update("avatar", String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await upsertProfile(user.id, data);
      cacheLocal(data); // also cache locally for fast import
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
      alert("Đã lưu hồ sơ!");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!user) return;
    if (!confirm("Đặt lại toàn bộ hồ sơ?")) return;
    setData(EMPTY_PROFILE);
    try {
      await upsertProfile(user.id, EMPTY_PROFILE);
      cacheLocal(EMPTY_PROFILE);
      alert("Đã đặt lại hồ sơ");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Lỗi");
    }
  };

  if (userLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="container-page py-12 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
              <User className="h-3.5 w-3.5" /> Hồ sơ cá nhân
            </div>
            <h1 className="font-display text-3xl font-bold sm:text-5xl">
              Hồ sơ <span className="text-gradient-hero">{data.name || user?.email?.split("@")[0] || "của bạn"}</span>
            </h1>
            <p className="mt-3 text-muted-foreground">
              Lưu vào tài khoản — đồng bộ ở mọi thiết bị, dùng cho mọi tính năng ZPATH.
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="mt-10 space-y-7 rounded-3xl border-2 border-border bg-card p-6 shadow-md sm:p-8">
          <section className="flex flex-col items-start gap-6 sm:flex-row">
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="group relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-border bg-muted/40 transition-colors hover:border-primary"
              >
                {data.avatar ? (
                  <img src={data.avatar} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <Camera className="h-7 w-7 text-muted-foreground" />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-foreground/40 text-xs font-semibold text-background opacity-0 transition-opacity group-hover:opacity-100">
                  Đổi ảnh
                </div>
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onAvatar(e.target.files?.[0])} />
              <span className="text-[11px] text-muted-foreground">PNG/JPG, ≤2MB</span>
            </div>

            <div className="flex-1 grid w-full gap-4 sm:grid-cols-2">
              <Field label="Họ và tên">
                <input value={data.name} onChange={(e) => update("name", e.target.value)} placeholder="Nguyễn Văn A" className="h-11 w-full rounded-xl border-2 border-input bg-background px-3 text-sm outline-none focus:border-primary" />
              </Field>
              <Field label="Khối lớp">
                <SelectInput value={data.grade} onChange={(e) => update("grade", e.target.value)}>
                  <option value="">— Chọn khối —</option>
                  <option value="10">Lớp 10</option>
                  <option value="11">Lớp 11</option>
                  <option value="12">Lớp 12</option>
                  <option value="other">Khác</option>
                </SelectInput>
              </Field>
              <Field label="Trường THPT">
                <input value={data.school} onChange={(e) => update("school", e.target.value)} placeholder="THPT Chu Văn An..." className="h-11 w-full rounded-xl border-2 border-input bg-background px-3 text-sm outline-none focus:border-primary" />
              </Field>
              <Field label="Trường ĐH mục tiêu">
                <SelectInput value={data.targetUniversity} onChange={(e) => update("targetUniversity", e.target.value)}>
                  <option value="">— Chọn trường —</option>
                  {UNIVERSITIES.map((u) => (
                    <option key={u.code} value={u.code}>{u.code} — {u.name}</option>
                  ))}
                </SelectInput>
              </Field>
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><Sparkles className="h-4 w-4" /></span>
              <h3 className="font-display text-lg font-bold">Tính cách SBTI</h3>
            </div>
            <SbtiPicker value={data.sbti} onChange={(v) => update("sbti", v)} />
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent"><GraduationCap className="h-4 w-4" /></span>
              <h3 className="font-display text-lg font-bold">Điểm thi hiện tại</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Toán"><NumberInput min={0} max={10} step={0.25} value={data.scoreMath || ""} onChange={(e) => update("scoreMath", parseFloat(e.target.value) || 0)} /></Field>
              <Field label="Văn"><NumberInput min={0} max={10} step={0.25} value={data.scoreLiterature || ""} onChange={(e) => update("scoreLiterature", parseFloat(e.target.value) || 0)} /></Field>
              <Field label="Môn tự chọn 1">
                <SelectInput value={data.electiveSubject1} onChange={(e) => update("electiveSubject1", e.target.value as TrialFormData["electiveSubject1"])}>
                  <option value="">— Chọn môn —</option>
                  {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </SelectInput>
              </Field>
              <Field label="Điểm môn 1"><NumberInput min={0} max={10} step={0.25} value={data.electiveScore1 || ""} onChange={(e) => update("electiveScore1", parseFloat(e.target.value) || 0)} /></Field>
              <Field label="Môn tự chọn 2">
                <SelectInput value={data.electiveSubject2} onChange={(e) => update("electiveSubject2", e.target.value as TrialFormData["electiveSubject2"])}>
                  <option value="">— Chọn môn —</option>
                  {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </SelectInput>
              </Field>
              <Field label="Điểm môn 2"><NumberInput min={0} max={10} step={0.25} value={data.electiveScore2 || ""} onChange={(e) => update("electiveScore2", parseFloat(e.target.value) || 0)} /></Field>
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/30 text-foreground"><Trophy className="h-4 w-4" /></span>
              <h3 className="font-display text-lg font-bold">Điểm thưởng</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="IELTS (band)" hint="Để 0 nếu chưa có">
                <NumberInput min={0} max={9} step={0.5} value={data.ielts || ""} onChange={(e) => update("ielts", parseFloat(e.target.value) || 0)} />
              </Field>
              <Field label="Giải văn hóa cao nhất">
                <SelectInput value={data.culturalAward} onChange={(e) => update("culturalAward", e.target.value as UserProfile["culturalAward"])}>
                  <option value="none">Không có</option>
                  <option value="encouragement">Khuyến khích</option>
                  <option value="third">Giải Ba</option>
                  <option value="second">Giải Nhì</option>
                  <option value="first">Giải Nhất</option>
                </SelectInput>
              </Field>
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-tier-high/10 text-tier-high"><MapPin className="h-4 w-4" /></span>
              <h3 className="font-display text-lg font-bold">Khu vực & Giới thiệu</h3>
            </div>
            <div className="grid gap-4">
              <Field label="Tỉnh / Thành phố">
                <SelectInput value={data.region} onChange={(e) => update("region", e.target.value)}>
                  <option value="">— Chọn vùng —</option>
                  {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </SelectInput>
              </Field>
              <Field label="Giới thiệu bản thân (tuỳ chọn)">
                <textarea value={data.bio} onChange={(e) => update("bio", e.target.value)} placeholder="Vài dòng về sở thích, mục tiêu..." rows={3} className="w-full rounded-xl border-2 border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
              </Field>
            </div>
          </section>

          <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="ghost" onClick={handleClear}>
              <Trash2 className="h-4 w-4" /> Đặt lại
            </Button>
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              {saved && (
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-tier-high animate-fade-up">
                  <CheckCircle2 className="h-4 w-4" /> Đã lưu!
                </span>
              )}
              <Button asChild variant="outline">
                <Link href="/landing">Đi tính tỉ lệ <ArrowRight className="h-4 w-4 ml-1" /></Link>
              </Button>
              <Button type="submit" variant="hero" disabled={saving}>
                {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Đang lưu...</> : <><Save className="h-4 w-4 mr-1" /> Lưu hồ sơ</>}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
