import { buildCareerMatches } from "@/lib/matching-engine";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAuth } from "@/components/zpath/AuthProvider";

export function useDashboard() {
  const { user, userProfile, isLoading, errorMessage } = useUserProfile();
  const { logout } = useAuth();
  const matches = userProfile ? buildCareerMatches(userProfile) : [];

  // Hàm đăng xuất
  const handleLogout = async () => {
    await logout();
  };

  // Trả về những dữ liệu mà giao diện cần
  return {
    user,
    userProfile,
    matches,
    isLoading,
    errorMessage,
    handleLogout,
  };
}
