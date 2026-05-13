import { useState } from "react";
import { useRouter } from "next/navigation";

import { saveCurrentUserProfile } from "@/lib/profile";
import type { DiscoverFormData } from "@/lib/types";

export function useDiscoverForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<DiscoverFormData>({
    mathScore: "",
    physicsScore: "",
    thirdScore: "",
    personality: "",
  });

  // Hàm cập nhật dữ liệu khi gõ vào ô input
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Hàm xử lý khi bấm nút Gửi
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Ngăn trình duyệt tự tải lại trang
    setIsSubmitting(true);

    try {
      await saveCurrentUserProfile(formData);
      router.push("/dashboard");
    } catch (error) {
      console.error("Lỗi lưu dữ liệu:", error);
      if (error instanceof Error && error.message.includes("đăng nhập")) {
        // Yêu cầu đăng nhập trước khi lưu hồ sơ
        router.push("/login?next=/profile");
        return;
      }

      alert("Không thể lưu hồ sơ, vui lòng thử lại!");
    } finally {
      setIsSubmitting(false);
    }
  };

  return { formData, handleChange, handleSubmit, isSubmitting };
}
