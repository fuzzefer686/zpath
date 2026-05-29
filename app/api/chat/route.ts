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
      Hãy trả lời bằng tiếng Việt trong khoảng 50-80 từ.
      Chỉ tập trung 2-3 ý chính, có thể dùng bullet ngắn.
      In đậm bằng Markdown các từ khóa quan trọng như **tên trường**, **tên ngành**, **mã chương trình**.
      Không lan man, không mở bài dài, không cam kết chắc chắn đỗ/trượt.
    `;

    const aiReply = await generateGeminiText({
      prompt: systemPrompt,
      config: {
        temperature: 0.2,
        maxOutputTokens: 512,
      },
    });

    return NextResponse.json({ reply: aiReply });
    
  } catch (error) {
    console.error("❌ Lỗi AI Chi tiết:", error);
    return NextResponse.json({ error: 'AI Mentor đang bận, vui lòng thử lại sau!' }, { status: 500 });
  }
}
