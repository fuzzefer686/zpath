import { NextResponse } from 'next/server';
import { generateGeminiText } from '@/src/lib/ai/geminiVertexClient';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, userProfile } = body;

    let totalScore = 0;
    if (userProfile?.scores) {
      totalScore = userProfile.scores.math + userProfile.scores.physics + userProfile.scores.third;
    }

    const systemPrompt = `
      Bạn là ZPATH AI Mentor, chuyên gia hướng nghiệp tại Việt Nam.
      Học sinh: Tính cách ${userProfile?.personality || 'Chưa rõ'}, Điểm: ${totalScore}.
      Câu hỏi: "${message}"
      Hãy trả lời ngắn gọn (dưới 150 chữ), tư vấn thân thiện, cá nhân hóa theo điểm và tính cách.
    `;

    const aiReply = await generateGeminiText({
      prompt: systemPrompt,
    });

    return NextResponse.json({ reply: aiReply });
    
  } catch (error) {
    console.error("❌ Lỗi AI Chi tiết:", error);
    return NextResponse.json({ error: 'AI Mentor đang bận, vui lòng thử lại sau!' }, { status: 500 });
  }
}
