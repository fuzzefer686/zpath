'use client';

import Link from 'next/link';
import { Briefcase, MessageCircle, LogOut } from 'lucide-react';
import { useDashboard } from '../../hooks/useDashboard';
import { CareerCard } from '../../components/CareerCard';

export default function DashboardPage() {
  // 1. GỌI LOGIC TỪ HOOK
  const { googleUser, userProfile, matches, isLoading, errorMessage, handleLogout } = useDashboard();

  // 2. XỬ LÝ CÁC TRẠNG THÁI CHỜ/LỖI
  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Đang tải dữ liệu...</div>;

  if (errorMessage) {
    return <div className="min-h-screen flex items-center justify-center p-4 text-center">{errorMessage}</div>;
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
        <h2 className="text-2xl font-bold mb-4">Chào bạn, bạn chưa có hồ sơ ZPATH</h2>
        <p className="mb-6 max-w-md text-gray-600">
          Hãy tạo hồ sơ cá nhân để ZPATH có đủ dữ liệu tư vấn ngành học phù hợp.
        </p>
        <Link href="/profile" className="bg-zpath-gradient text-white px-6 py-3 rounded-full">
          Tạo hồ sơ
        </Link>
      </div>
    );
  }

  // 3. LẮP RÁP GIAO DIỆN CHÍNH
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* HEADER */}
        <header className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            {googleUser?.user_metadata?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={googleUser.user_metadata.avatar_url} alt="Avatar" className="w-16 h-16 rounded-full" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-100" />
            )}
            <div>
              <h1 className="text-2xl font-bold">Chào mừng trở lại, {googleUser?.user_metadata?.full_name} 👋</h1>
              <p className="text-gray-600">Nhóm: <span className="font-bold">{userProfile.personality}</span></p>
              <p className="text-sm text-gray-500 mt-1">Tổng điểm hiện tại: {userProfile.scores.total.toFixed(1)} / 30</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex gap-2 text-gray-500 hover:text-red-500 transition"><LogOut/> Đăng xuất</button>
        </header>

        <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-zpath-dark">Ho so va matching da duoc dong bo</h2>
            <p className="text-gray-600 mt-2">Dashboard va AI Mentor dang cung su dung mot ho so tu Supabase va cung mot matching engine rule-based.</p>
          </div>
          <Link href="/chat" className="inline-flex items-center justify-center gap-2 bg-zpath-gradient text-white px-6 py-3 rounded-full font-semibold">
            <MessageCircle size={18} />
            Tro chuyen voi AI Mentor
          </Link>
        </section>

        {/* DANH SÁCH NGÀNH NGHỀ - Sử dụng Component tái sử dụng */}
        <section>
          <h2 className="text-xl font-bold flex gap-2 mb-6"><Briefcase /> Top Ngành Phù Hợp Nhất</h2>
          <div className="grid gap-6">
            {matches.map((career, index) => (
              <CareerCard key={career.id} career={career} index={index} />
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
