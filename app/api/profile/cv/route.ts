import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/zpath-auth";
import { supabaseServer } from "@/src/lib/db/supabaseServer";

export const runtime = "nodejs";

const signEvidenceUrl = async (url: string | null) => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  try {
    const { data: signedData, error: signedError } = await supabaseServer.storage
      .from("cv-evidence")
      .createSignedUrl(url, 1800); // 30 minutes TTL
    if (signedError) {
      console.error(`Failed to create signed URL for path "${url}":`, signedError);
      return null;
    }
    return signedData?.signedUrl || null;
  } catch (err) {
    console.error(`Error signing URL for path "${url}":`, err);
    return null;
  }
};

export async function GET() {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }

    const userId = auth.user.id;

    // Fetch cv_profile
    let { data: cvProfile, error: profileError } = await supabaseServer
      .from("cv_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError) throw profileError;

    // If no CV profile exists, create one on the fly
    if (!cvProfile) {
      const { data: newCvProfile, error: createError } = await supabaseServer
        .from("cv_profiles")
        .insert({
          user_id: userId,
          full_name: auth.user.username,
          email: auth.user.email,
          phone: auth.user.phone,
        })
        .select("*")
        .single();

      if (createError) throw createError;
      cvProfile = newCvProfile;
    }

    // Fetch the rest of the CV blocks
    const [
      { data: education, error: eduError },
      { data: experiences, error: expError },
      { data: skills, error: skillsError },
      { data: certificates, error: certsError },
      { data: awards, error: awardsError },
      { data: activities, error: actsError },
    ] = await Promise.all([
      supabaseServer.from("cv_education").select("*").eq("user_id", userId),
      supabaseServer.from("cv_experiences").select("*").eq("user_id", userId).order("start_date", { ascending: false }),
      supabaseServer.from("cv_skills").select("*").eq("user_id", userId),
      supabaseServer.from("cv_certificates").select("*").eq("user_id", userId),
      supabaseServer.from("cv_awards").select("*").eq("user_id", userId),
      supabaseServer.from("cv_activities").select("*").eq("user_id", userId).order("start_date", { ascending: false }),
    ]);

    if (eduError) throw eduError;
    if (expError) throw expError;
    if (skillsError) throw skillsError;
    if (certsError) throw certsError;
    if (awardsError) throw awardsError;
    if (actsError) throw actsError;

    // Recompute the completeness score from the current blocks (config-driven,
    // weights live in cv_section_weights). The RPC persists the value onto
    // cv_profiles.completeness_score and returns it; since the client re-fetches
    // after every mutation, this keeps the score fresh on every read.
    const { data: completenessScore, error: scoreError } = await supabaseServer.rpc(
      "compute_completeness_score",
      { p_user_id: userId },
    );
    if (scoreError) throw scoreError;
    if (cvProfile && typeof completenessScore === "number") {
      cvProfile.completeness_score = completenessScore;
    }

    // Sign evidence_urls for certificates and awards
    const processedCertificates = certificates
      ? await Promise.all(
          certificates.map(async (cert) => ({
            ...cert,
            evidence_url: await signEvidenceUrl(cert.evidence_url),
          }))
        )
      : [];

    const processedAwards = awards
      ? await Promise.all(
          awards.map(async (award) => ({
            ...award,
            evidence_url: await signEvidenceUrl(award.evidence_url),
          }))
        )
      : [];

    return NextResponse.json({
      profile: cvProfile,
      education: education || [],
      experiences: experiences || [],
      skills: skills || [],
      certificates: processedCertificates,
      awards: processedAwards,
      activities: activities || [],
    });
  } catch (error) {
    console.error("GET /api/profile/cv error:", error);
    return NextResponse.json(
      { error: "Không thể lấy thông tin CV của bạn." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }

    const userId = auth.user.id;
    const body = await request.json();
    const { action, data } = body;

    if (!action) {
      return NextResponse.json({ error: "Thiếu trường action." }, { status: 400 });
    }

    switch (action) {
      // 1. Update basic info
      case "update_basic": {
        const { full_name, date_of_birth, gender, phone, email, address, avatar_url } = data || {};
        const { data: updated, error } = await supabaseServer
          .from("cv_profiles")
          .update({
            full_name: full_name?.trim(),
            date_of_birth: date_of_birth || null,
            gender: gender || null,
            phone: phone?.trim(),
            email: email?.trim(),
            address: address?.trim(),
            avatar_url: avatar_url || null,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .select("*")
          .single();

        if (error) throw error;
        return NextResponse.json({ success: true, profile: updated });
      }

      // 2. Update summary / objective
      case "update_summary": {
        const { headline, summary, target_major_code, target_career } = data || {};
        const { data: updated, error } = await supabaseServer
          .from("cv_profiles")
          .update({
            headline: headline?.trim(),
            summary: summary?.trim(),
            target_major_code: target_major_code || null,
            target_career: target_career?.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .select("*")
          .single();

        if (error) throw error;
        return NextResponse.json({ success: true, profile: updated });
      }

      // Action to update CV sections layout (order and visibility)
      case "update_layout": {
        const { sections_config } = data || {};
        if (!sections_config) {
          return NextResponse.json({ error: "Thiếu cấu hình bố cục." }, { status: 400 });
        }
        const { data: updated, error } = await supabaseServer
          .from("cv_profiles")
          .update({
            sections_config,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .select("*")
          .single();

        if (error) throw error;
        return NextResponse.json({ success: true, profile: updated });
      }

      // 3. CRUD cv_education
      case "save_education": {
        const { id, level, school_name, school_code, gpa, grade_10, grade_11, grade_12, subjects, start_year, end_year, is_current, linked_transcript_id } = data || {};
        if (!level || !school_name) {
          return NextResponse.json({ error: "Thiếu thông tin trình độ hoặc tên trường." }, { status: 400 });
        }
        const payload = {
          user_id: userId,
          level,
          school_name,
          school_code: school_code || null,
          gpa: gpa !== undefined ? gpa : null,
          grade_10: grade_10 !== undefined ? grade_10 : null,
          grade_11: grade_11 !== undefined ? grade_11 : null,
          grade_12: grade_12 !== undefined ? grade_12 : null,
          subjects: subjects || null,
          start_year: start_year || null,
          end_year: end_year || null,
          is_current: !!is_current,
          linked_transcript_id: linked_transcript_id || null,
        };

        let result;
        if (id) {
          const { data: updated, error } = await supabaseServer
            .from("cv_education")
            .update(payload)
            .eq("id", id)
            .eq("user_id", userId)
            .select("*")
            .single();
          if (error) throw error;
          result = updated;
        } else {
          const { data: inserted, error } = await supabaseServer
            .from("cv_education")
            .insert(payload)
            .select("*")
            .single();
          if (error) throw error;
          result = inserted;
        }
        return NextResponse.json({ success: true, data: result });
      }

      case "delete_education": {
        const { id } = data || {};
        if (!id) return NextResponse.json({ error: "Thiếu ID bản ghi." }, { status: 400 });
        const { error } = await supabaseServer
          .from("cv_education")
          .delete()
          .eq("id", id)
          .eq("user_id", userId);
        if (error) throw error;
        return NextResponse.json({ success: true });
      }

      // 4. CRUD cv_experiences
      case "save_experience": {
        const { id, type, title, organization, description, start_date, end_date, is_current, sort_order } = data || {};
        if (!title) {
          return NextResponse.json({ error: "Thiếu tiêu đề kinh nghiệm." }, { status: 400 });
        }
        const payload = {
          user_id: userId,
          type: type || "project",
          title,
          organization: organization || null,
          description: description || null,
          start_date: start_date || null,
          end_date: end_date || null,
          is_current: !!is_current,
          sort_order: sort_order || 0,
        };

        let result;
        if (id) {
          const { data: updated, error } = await supabaseServer
            .from("cv_experiences")
            .update(payload)
            .eq("id", id)
            .eq("user_id", userId)
            .select("*")
            .single();
          if (error) throw error;
          result = updated;
        } else {
          const { data: inserted, error } = await supabaseServer
            .from("cv_experiences")
            .insert(payload)
            .select("*")
            .single();
          if (error) throw error;
          result = inserted;
        }
        return NextResponse.json({ success: true, data: result });
      }

      case "delete_experience": {
        const { id } = data || {};
        if (!id) return NextResponse.json({ error: "Thiếu ID bản ghi." }, { status: 400 });
        const { error } = await supabaseServer
          .from("cv_experiences")
          .delete()
          .eq("id", id)
          .eq("user_id", userId);
        if (error) throw error;
        return NextResponse.json({ success: true });
      }

      // 5. CRUD cv_skills
      case "save_skill": {
        const { id, name, category, proficiency, source, is_confirmed } = data || {};
        if (!name) {
          return NextResponse.json({ error: "Thiếu tên kỹ năng." }, { status: 400 });
        }
        const payload = {
          user_id: userId,
          name,
          category: category || "other",
          proficiency: proficiency || 3,
          source: source || "self",
          is_confirmed: is_confirmed !== undefined ? !!is_confirmed : true,
        };

        let result;
        if (id) {
          const { data: updated, error } = await supabaseServer
            .from("cv_skills")
            .update(payload)
            .eq("id", id)
            .eq("user_id", userId)
            .select("*")
            .single();
          if (error) throw error;
          result = updated;
        } else {
          const { data: inserted, error } = await supabaseServer
            .from("cv_skills")
            .insert(payload)
            .select("*")
            .single();
          if (error) throw error;
          result = inserted;
        }
        return NextResponse.json({ success: true, data: result });
      }

      case "delete_skill": {
        const { id } = data || {};
        if (!id) return NextResponse.json({ error: "Thiếu ID bản ghi." }, { status: 400 });
        const { error } = await supabaseServer
          .from("cv_skills")
          .delete()
          .eq("id", id)
          .eq("user_id", userId);
        if (error) throw error;
        return NextResponse.json({ success: true });
      }

      // 6. CRUD cv_certificates
      case "save_certificate": {
        const { id, cert_type_code, score, issued_date, expiry_date, evidence_url, is_verified } = data || {};
        if (!cert_type_code || !score) {
          return NextResponse.json({ error: "Thiếu loại chứng chỉ hoặc điểm số." }, { status: 400 });
        }

        let finalEvidenceUrl = evidence_url || null;
        if (id) {
          const { data: existing } = await supabaseServer
            .from("cv_certificates")
            .select("evidence_url")
            .eq("id", id)
            .eq("user_id", userId)
            .maybeSingle();

          if (existing) {
            if (evidence_url && (evidence_url.startsWith("http://") || evidence_url.startsWith("https://"))) {
              finalEvidenceUrl = existing.evidence_url;
            } else if (!evidence_url && existing.evidence_url) {
              try {
                await supabaseServer.storage.from("cv-evidence").remove([existing.evidence_url]);
              } catch (err) {
                console.error("Failed to delete storage file on evidence removal:", err);
              }
              finalEvidenceUrl = null;
            }
          }
        }

        const payload = {
          user_id: userId,
          cert_type_code,
          score,
          issued_date: issued_date || null,
          expiry_date: expiry_date || null,
          evidence_url: finalEvidenceUrl,
          is_verified: !!is_verified,
        };

        let result;
        if (id) {
          const { data: updated, error } = await supabaseServer
            .from("cv_certificates")
            .update(payload)
            .eq("id", id)
            .eq("user_id", userId)
            .select("*")
            .single();
          if (error) throw error;
          result = updated;
        } else {
          const { data: inserted, error } = await supabaseServer
            .from("cv_certificates")
            .insert(payload)
            .select("*")
            .single();
          if (error) throw error;
          result = inserted;
        }
        return NextResponse.json({ success: true, data: result });
      }

      case "delete_certificate": {
        const { id } = data || {};
        if (!id) return NextResponse.json({ error: "Thiếu ID bản ghi." }, { status: 400 });

        const { data: existing } = await supabaseServer
          .from("cv_certificates")
          .select("evidence_url")
          .eq("id", id)
          .eq("user_id", userId)
          .maybeSingle();

        if (existing?.evidence_url) {
          try {
            await supabaseServer.storage.from("cv-evidence").remove([existing.evidence_url]);
          } catch (err) {
            console.error("Failed to delete storage file on certificate deletion:", err);
          }
        }

        const { error } = await supabaseServer
          .from("cv_certificates")
          .delete()
          .eq("id", id)
          .eq("user_id", userId);
        if (error) throw error;
        return NextResponse.json({ success: true });
      }

      // 7. CRUD cv_awards
      case "save_award": {
        const { id, title, level, rank, issuer, award_year, evidence_url } = data || {};
        if (!title) {
          return NextResponse.json({ error: "Thiếu tên giải thưởng." }, { status: 400 });
        }

        let finalEvidenceUrl = evidence_url || null;
        if (id) {
          const { data: existing } = await supabaseServer
            .from("cv_awards")
            .select("evidence_url")
            .eq("id", id)
            .eq("user_id", userId)
            .maybeSingle();

          if (existing) {
            if (evidence_url && (evidence_url.startsWith("http://") || evidence_url.startsWith("https://"))) {
              finalEvidenceUrl = existing.evidence_url;
            } else if (!evidence_url && existing.evidence_url) {
              try {
                await supabaseServer.storage.from("cv-evidence").remove([existing.evidence_url]);
              } catch (err) {
                console.error("Failed to delete storage file on evidence removal:", err);
              }
              finalEvidenceUrl = null;
            }
          }
        }

        const payload = {
          user_id: userId,
          title,
          level: level || "school",
          rank: rank || null,
          issuer: issuer || null,
          award_year: award_year || null,
          evidence_url: finalEvidenceUrl,
        };

        let result;
        if (id) {
          const { data: updated, error } = await supabaseServer
            .from("cv_awards")
            .update(payload)
            .eq("id", id)
            .eq("user_id", userId)
            .select("*")
            .single();
          if (error) throw error;
          result = updated;
        } else {
          const { data: inserted, error } = await supabaseServer
            .from("cv_awards")
            .insert(payload)
            .select("*")
            .single();
          if (error) throw error;
          result = inserted;
        }
        return NextResponse.json({ success: true, data: result });
      }

      case "delete_award": {
        const { id } = data || {};
        if (!id) return NextResponse.json({ error: "Thiếu ID bản ghi." }, { status: 400 });

        const { data: existing } = await supabaseServer
          .from("cv_awards")
          .select("evidence_url")
          .eq("id", id)
          .eq("user_id", userId)
          .maybeSingle();

        if (existing?.evidence_url) {
          try {
            await supabaseServer.storage.from("cv-evidence").remove([existing.evidence_url]);
          } catch (err) {
            console.error("Failed to delete storage file on award deletion:", err);
          }
        }

        const { error } = await supabaseServer
          .from("cv_awards")
          .delete()
          .eq("id", id)
          .eq("user_id", userId);
        if (error) throw error;
        return NextResponse.json({ success: true });
      }

      // 8. CRUD cv_activities
      case "save_activity": {
        const { id, title, role, organization, description, start_date, end_date, hours, sort_order } = data || {};
        if (!title) {
          return NextResponse.json({ error: "Thiếu tên hoạt động ngoại khóa." }, { status: 400 });
        }
        const payload = {
          user_id: userId,
          title,
          role: role || null,
          organization: organization || null,
          description: description || null,
          start_date: start_date || null,
          end_date: end_date || null,
          hours: hours !== undefined ? hours : null,
          sort_order: sort_order || 0,
        };

        let result;
        if (id) {
          const { data: updated, error } = await supabaseServer
            .from("cv_activities")
            .update(payload)
            .eq("id", id)
            .eq("user_id", userId)
            .select("*")
            .single();
          if (error) throw error;
          result = updated;
        } else {
          const { data: inserted, error } = await supabaseServer
            .from("cv_activities")
            .insert(payload)
            .select("*")
            .single();
          if (error) throw error;
          result = inserted;
        }
        return NextResponse.json({ success: true, data: result });
      }

      case "delete_activity": {
        const { id } = data || {};
        if (!id) return NextResponse.json({ error: "Thiếu ID bản ghi." }, { status: 400 });
        const { error } = await supabaseServer
          .from("cv_activities")
          .delete()
          .eq("id", id)
          .eq("user_id", userId);
        if (error) throw error;
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });
    }
  } catch (error) {
    console.error("POST /api/profile/cv error:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi cập nhật thông tin CV." },
      { status: 500 },
    );
  }
}
