"use client";

import { useRef, useState } from "react";
import { User, Calendar, Mail, Phone, MapPin, Edit2, Check, X, Loader2, Camera, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CvProfile } from "@/hooks/useCvData";

interface BasicInfoFormProps {
  profile: CvProfile;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  /**
   * Uploads the chosen file as the user's avatar and refreshes CV data so the
   * new photo appears in the CV preview/export. Omit to hide the avatar block.
   */
  onUploadAvatar?: (file: File) => Promise<void>;
}

// Mirror the server-side limits in /api/profile/avatar so we can reject bad
// files before uploading (better UX). Source of truth stays on the server.
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"];

export function BasicInfoForm({ profile, onSave, onUploadAvatar }: BasicInfoFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const initials = (profile.full_name || "")
    .split(" ")
    .map((w) => w[0])
    .slice(-2)
    .join("")
    .toUpperCase();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the input so picking the same file again still fires onChange.
    e.target.value = "";
    if (!file || !onUploadAvatar) return;

    if (!AVATAR_TYPES.includes(file.type)) {
      setAvatarError("Chỉ hỗ trợ ảnh PNG, JPEG hoặc WebP.");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setAvatarError("Ảnh đại diện không được vượt quá 2MB.");
      return;
    }

    setAvatarError(null);
    setIsUploadingAvatar(true);
    try {
      await onUploadAvatar(file);
    } catch {
      setAvatarError("Không thể tải lên ảnh đại diện. Vui lòng thử lại.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const [fullName, setFullName] = useState(profile.full_name || "");
  const [dob, setDob] = useState(profile.date_of_birth || "");
  const [gender, setGender] = useState(profile.gender || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [email, setEmail] = useState(profile.email || "");
  const [address, setAddress] = useState(profile.address || "");

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        full_name: fullName,
        date_of_birth: dob || null,
        gender: gender || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        // Preserve the CV photo: update_basic rewrites avatar_url, so omitting it
        // here would wipe the avatar uploaded above on the next save.
        avatar_url: profile.avatar_url || null,
      });
      setIsEditing(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFullName(profile.full_name || "");
    setDob(profile.date_of_birth || "");
    setGender(profile.gender || "");
    setPhone(profile.phone || "");
    setEmail(profile.email || "");
    setAddress(profile.address || "");
    setIsEditing(false);
  };

  return (
    <div className="space-y-4">
      {onUploadAvatar && (
        <div className="flex items-center gap-4 rounded-xl border border-muted/50 bg-muted/20 p-4">
          {/* Avatar preview + click-to-change */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingAvatar}
            aria-label="Thay ảnh đại diện cho CV"
            className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-background shadow-md outline-none ring-primary/40 focus-visible:ring-2 disabled:opacity-70"
          >
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-xl font-bold text-white">
              {isUploadingAvatar ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="Ảnh đại diện CV" className="h-full w-full object-cover" />
              ) : (
                initials || <User className="h-8 w-8" />
              )}
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/55 opacity-0 transition group-hover:opacity-100">
              <Camera className="h-5 w-5 text-white" />
            </div>
          </button>

          <div className="min-w-0 space-y-1.5">
            <p className="text-sm font-semibold text-foreground">Ảnh đại diện CV</p>
            <p className="text-xs text-muted-foreground">
              Hiển thị ở đầu CV. PNG, JPEG hoặc WebP, tối đa 2MB.
            </p>
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              size="sm"
              disabled={isUploadingAvatar}
              className="h-8 gap-1.5 rounded-xl text-xs"
            >
              {isUploadingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              {isUploadingAvatar ? "Đang tải lên..." : profile.avatar_url ? "Thay ảnh" : "Tải ảnh lên"}
            </Button>
            {avatarError && (
              <p className="flex items-center gap-1 text-xs text-destructive">
                <AlertTriangle className="h-3 w-3 shrink-0" /> {avatarError}
              </p>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/webp"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>
      )}

      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Thông tin cơ bản
        </h4>
        {!isEditing ? (
          <Button
            onClick={() => setIsEditing(true)}
            variant="ghost"
            size="sm"
            className="rounded-xl hover:bg-primary/5 text-primary text-xs flex items-center gap-1.5 h-8 px-2.5"
          >
            <Edit2 className="h-3.5 w-3.5" /> Chỉnh sửa
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              onClick={handleCancel}
              variant="ghost"
              size="sm"
              className="rounded-xl hover:bg-muted text-xs flex items-center gap-1 h-8 px-2.5"
              disabled={isSaving}
            >
              <X className="h-3.5 w-3.5" /> Hủy
            </Button>
            <Button
              onClick={handleSave}
              variant="hero"
              size="sm"
              className="rounded-xl text-xs flex items-center gap-1 h-8 px-2.5"
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              {isSaving ? "Đang lưu..." : "Lưu"}
            </Button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">
              Họ và tên <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary"
              placeholder="Nguyễn Văn A"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">
              Giới tính
            </label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary"
            >
              <option value="">Chọn giới tính</option>
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
              <option value="Khác">Khác</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">
              Ngày sinh
            </label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">
              Số điện thoại
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary"
              placeholder="0912345678"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary"
              placeholder="name@example.com"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">
              Địa chỉ
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary"
              placeholder="Quận Cầu Giấy, Hà Nội"
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-xl bg-muted/30 p-4 border border-muted/50">
          <div className="flex items-center gap-2.5 text-sm">
            <User className="h-4 w-4 text-primary shrink-0" />
            <span className="font-semibold text-foreground">Họ tên:</span>
            <span className="text-muted-foreground">{profile.full_name || "Chưa cập nhật"}</span>
          </div>

          <div className="flex items-center gap-2.5 text-sm">
            <User className="h-4 w-4 text-primary shrink-0" />
            <span className="font-semibold text-foreground">Giới tính:</span>
            <span className="text-muted-foreground">{profile.gender || "Chưa cập nhật"}</span>
          </div>

          <div className="flex items-center gap-2.5 text-sm">
            <Calendar className="h-4 w-4 text-primary shrink-0" />
            <span className="font-semibold text-foreground">Ngày sinh:</span>
            <span className="text-muted-foreground">
              {profile.date_of_birth
                ? new Date(profile.date_of_birth).toLocaleDateString("vi-VN")
                : "Chưa cập nhật"}
            </span>
          </div>

          <div className="flex items-center gap-2.5 text-sm">
            <Phone className="h-4 w-4 text-primary shrink-0" />
            <span className="font-semibold text-foreground">SĐT:</span>
            <span className="text-muted-foreground">{profile.phone || "Chưa cập nhật"}</span>
          </div>

          <div className="flex items-center gap-2.5 text-sm">
            <Mail className="h-4 w-4 text-primary shrink-0" />
            <span className="font-semibold text-foreground">Email:</span>
            <span className="text-muted-foreground truncate">{profile.email || "Chưa cập nhật"}</span>
          </div>

          <div className="flex items-center gap-2.5 text-sm">
            <MapPin className="h-4 w-4 text-primary shrink-0" />
            <span className="font-semibold text-foreground">Địa chỉ:</span>
            <span className="text-muted-foreground truncate">{profile.address || "Chưa cập nhật"}</span>
          </div>
        </div>
      )}
    </div>
  );
}
