"use client";

import { useState } from "react";
import { User, Calendar, Mail, Phone, MapPin, Edit2, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CvProfile } from "@/hooks/useCvData";

interface BasicInfoFormProps {
  profile: CvProfile;
  onSave: (data: any) => Promise<void>;
}

export function BasicInfoForm({ profile, onSave }: BasicInfoFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
