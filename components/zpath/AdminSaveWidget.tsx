"use client";

import { useAdminEdit } from "./AdminEditContext";
import { Button } from "@/components/ui/button";
import { Save, X, Loader2, Edit3 } from "lucide-react";
import { useState } from "react";

export function AdminSaveWidget() {
  const { isAdmin, pendingChanges, commitChanges, discardChanges, isEditMode, setIsEditMode } = useAdminEdit();
  const [isSaving, setIsSaving] = useState(false);

  if (!isAdmin) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await commitChanges();
      alert("Đã lưu các thay đổi lên Supabase thành công!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Không rõ nguyên nhân";
      alert("Lỗi khi lưu: " + message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isEditMode && pendingChanges.length === 0) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button onClick={() => setIsEditMode(true)} variant="outline" className="shadow-lg border-primary text-primary hover:bg-primary/10 rounded-full h-12 px-6">
          <Edit3 className="mr-2 h-4 w-4" /> Bật chế độ sửa trang (Admin)
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 animate-in slide-in-from-bottom-5">
      <div className="flex items-center gap-3 rounded-2xl border-2 border-primary/30 bg-background p-4 shadow-2xl">
        <div className="flex flex-col">
          <span className="text-sm font-bold">Chế độ Admin</span>
          {pendingChanges.length > 0 ? (
            <span className="text-xs text-muted-foreground">{pendingChanges.length} thay đổi chưa lưu</span>
          ) : (
            <span className="text-xs text-muted-foreground">Click vào text để sửa</span>
          )}
        </div>
        
        <div className="ml-4 flex items-center gap-2">
          {pendingChanges.length > 0 && (
            <Button variant="ghost" size="sm" onClick={discardChanges} disabled={isSaving}>
              <X className="mr-1 h-4 w-4" /> Hủy
            </Button>
          )}
          <Button variant="hero" size="sm" onClick={handleSave} disabled={isSaving || pendingChanges.length === 0}>
            {isSaving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
            Lưu lên Server
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsEditMode(false)} disabled={isSaving} className="ml-2">
            Tắt Edit
          </Button>
        </div>
      </div>
    </div>
  );
}
