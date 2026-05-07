export interface UniProgram {
  name: string;
  majorCode?: string;
  programCode: string;
  admissionScore2025: number;
  tuitionPerSemester: number;
}

export interface UniChannel {
  label: string;
  url: string;
  type?: "website" | "facebook" | "group" | "youtube" | "tiktok" | "other";
}

export interface University {
  code: string;
  name: string;
  shortDesc: string;
  tags: string[];
  city: string;
  website?: string;
  heroGradient: string;
  about: string;
  highlights: string[];
  majors: string[];
  programs?: UniProgram[];
  channels?: UniChannel[];
  avatarUrl?: string;
}

export const UNIVERSITIES: University[] = [
  {
    code: "HUST",
    name: "Đại học Bách Khoa Hà Nội",
    shortDesc: "Kỹ thuật & Công nghệ",
    tags: ["Công nghệ", "Kỹ thuật"],
    city: "Hà Nội",
    website: "https://hust.edu.vn",
    heroGradient: "from-orange-500 via-red-500 to-pink-500",
    about:
      "Đại học Bách Khoa Hà Nội là trường đại học kỹ thuật hàng đầu Việt Nam, nổi bật về kỹ sư, công nghệ thông tin và nghiên cứu khoa học.",
    highlights: [
      "Top 1 đào tạo kỹ thuật tại Việt Nam",
      "Mạng lưới doanh nghiệp công nghệ rộng",
      "Cơ sở vật chất hiện đại, lab nghiên cứu lớn",
    ],
    majors: ["CNTT", "Điện - Điện tử", "Cơ khí", "Tự động hóa", "Khoa học dữ liệu", "AI"],
    programs: [
      { name: "Công nghệ Thông tin", majorCode: "CNTT", programCode: "IT1", admissionScore2025: 28.53, tuitionPerSemester: 16 },
      { name: "Khoa học Dữ liệu & AI", majorCode: "DS", programCode: "IT-E10", admissionScore2025: 28.16, tuitionPerSemester: 22 },
      { name: "Kỹ thuật Điều khiển - Tự động hóa", programCode: "EE2", admissionScore2025: 27.22, tuitionPerSemester: 14 },
    ],
  },
  {
    code: "NEU",
    name: "Đại học Kinh tế Quốc dân",
    shortDesc: "Kinh doanh & Quản lý",
    tags: ["Kinh doanh", "Quản lý"],
    city: "Hà Nội",
    website: "https://neu.edu.vn",
    heroGradient: "from-emerald-500 via-teal-500 to-cyan-500",
    about:
      "Đại học Kinh tế Quốc dân là trường đầu ngành về kinh tế, quản trị và tài chính tại Việt Nam.",
    highlights: [
      "Top trường kinh tế tại miền Bắc",
      "Học bổng và trao đổi quốc tế đa dạng",
      "Network alumni mạnh trong giới doanh nghiệp",
    ],
    majors: ["Quản trị Kinh doanh", "Marketing", "Tài chính - Ngân hàng", "Kế toán", "Kinh tế Quốc tế"],
    programs: [
      { name: "Marketing", majorCode: "MKT", programCode: "EBBA01", admissionScore2025: 28.18, tuitionPerSemester: 11 },
      { name: "Tài chính - Ngân hàng", majorCode: "FIN", programCode: "EBBA02", admissionScore2025: 27.65, tuitionPerSemester: 11 },
      { name: "Kinh tế Đối ngoại", majorCode: "KTDN", programCode: "EBBA03", admissionScore2025: 27.95, tuitionPerSemester: 11 },
    ],
  },
  {
    code: "FTU",
    name: "Đại học Ngoại Thương",
    shortDesc: "Kinh doanh & Đối ngoại",
    tags: ["Kinh doanh", "Đối ngoại"],
    city: "Hà Nội",
    website: "https://ftu.edu.vn",
    heroGradient: "from-indigo-500 via-purple-500 to-fuchsia-500",
    about:
      "Đại học Ngoại Thương nổi tiếng với đào tạo Kinh tế đối ngoại, Thương mại quốc tế và sinh viên năng động, giỏi ngoại ngữ.",
    highlights: [
      "Đầu vào tiếng Anh top đầu cả nước",
      "Sinh viên năng động, nhiều câu lạc bộ",
      "Cơ hội thực tập tại tập đoàn đa quốc gia",
    ],
    majors: ["Kinh tế Đối ngoại", "Quản trị Kinh doanh Quốc tế", "Tài chính Quốc tế", "Logistics"],
    programs: [
      { name: "Kinh tế Đối ngoại", majorCode: "KTDN", programCode: "FTU01", admissionScore2025: 28.5, tuitionPerSemester: 12 },
      { name: "Marketing Quốc tế", majorCode: "MKT", programCode: "FTU02", admissionScore2025: 28.1, tuitionPerSemester: 12 },
      { name: "Logistics & Quản lý chuỗi cung ứng", programCode: "FTU04", admissionScore2025: 27.95, tuitionPerSemester: 12 },
    ],
  },
  {
    code: "HNUE",
    name: "Đại học Sư phạm Hà Nội",
    shortDesc: "Giáo dục & Sư phạm",
    tags: ["Giáo dục", "Sư phạm"],
    city: "Hà Nội",
    website: "https://hnue.edu.vn",
    heroGradient: "from-sky-500 via-blue-500 to-indigo-500",
    about:
      "Đại học Sư phạm Hà Nội là cái nôi đào tạo giáo viên và nhà quản lý giáo dục hàng đầu Việt Nam.",
    highlights: [
      "Trường trọng điểm quốc gia về sư phạm",
      "Đa dạng chuyên ngành sư phạm",
      "Học phí ưu đãi cho ngành sư phạm",
    ],
    majors: ["Sư phạm Toán", "Sư phạm Văn", "Sư phạm Anh", "Tâm lý học Giáo dục", "Quản lý Giáo dục"],
    programs: [
      { name: "Sư phạm Toán", majorCode: "SPT", programCode: "SP01", admissionScore2025: 28.6, tuitionPerSemester: 0 },
      { name: "Sư phạm Anh", programCode: "SP03", admissionScore2025: 28.4, tuitionPerSemester: 0 },
      { name: "Quản lý Giáo dục", programCode: "QL01", admissionScore2025: 25.5, tuitionPerSemester: 6 },
    ],
  },
  {
    code: "VNU",
    name: "Đại học Quốc gia Hà Nội",
    shortDesc: "Đa ngành & Nghiên cứu",
    tags: ["Khoa học", "Nghiên cứu"],
    city: "Hà Nội",
    website: "https://vnu.edu.vn",
    heroGradient: "from-amber-500 via-orange-500 to-red-500",
    about: "Đại học Quốc gia Hà Nội là hệ thống đại học đa ngành lớn nhất Việt Nam.",
    highlights: ["Đa ngành, đa lĩnh vực", "Hợp tác quốc tế rộng", "Cơ sở Hòa Lạc hiện đại"],
    majors: ["KHTN", "KHXH&NV", "Ngoại ngữ", "Công nghệ", "Kinh tế", "Y Dược"],
    programs: [
      { name: "Công nghệ Thông tin", majorCode: "CNTT", programCode: "VNU-IT", admissionScore2025: 27.8, tuitionPerSemester: 13 },
      { name: "Khoa học Dữ liệu", majorCode: "DS", programCode: "VNU-DS", admissionScore2025: 27.2, tuitionPerSemester: 14 },
      { name: "Y khoa", majorCode: "YKHOA", programCode: "VNU-MED", admissionScore2025: 27.1, tuitionPerSemester: 25 },
    ],
  },
  {
    code: "UEH",
    name: "Đại học Kinh tế TP.HCM",
    shortDesc: "Kinh doanh & Tài chính",
    tags: ["Kinh doanh", "Tài chính"],
    city: "TP.HCM",
    website: "https://ueh.edu.vn",
    heroGradient: "from-pink-500 via-rose-500 to-red-500",
    about: "UEH là trường top đầu khối kinh tế phía Nam với phong cách đào tạo hiện đại, hội nhập quốc tế.",
    highlights: ["Chương trình tiên tiến chuẩn quốc tế", "Network doanh nghiệp lớn ở phía Nam", "Đa dạng học bổng"],
    majors: ["Tài chính", "Kế toán - Kiểm toán", "Marketing", "Kinh doanh Quốc tế"],
    programs: [
      { name: "Marketing", majorCode: "MKT", programCode: "UEH-MKT", admissionScore2025: 27.4, tuitionPerSemester: 16 },
      { name: "Tài chính", majorCode: "FIN", programCode: "UEH-FIN", admissionScore2025: 27.2, tuitionPerSemester: 16 },
      { name: "Kinh doanh Quốc tế", majorCode: "KTDN", programCode: "UEH-KDQT", admissionScore2025: 27.55, tuitionPerSemester: 17 },
    ],
  },
  {
    code: "HMU",
    name: "Đại học Y Hà Nội",
    shortDesc: "Y khoa & Sức khỏe",
    tags: ["Y khoa", "Sức khỏe"],
    city: "Hà Nội",
    website: "https://hmu.edu.vn",
    heroGradient: "from-red-500 via-rose-500 to-pink-500",
    about: "Đại học Y Hà Nội là cái nôi đào tạo bác sĩ và nhân lực y tế chất lượng cao của cả nước.",
    highlights: ["Lịch sử hơn 120 năm", "Hệ thống bệnh viện thực hành lớn", "Đào tạo bác sĩ nội trú uy tín"],
    majors: ["Y khoa", "Răng - Hàm - Mặt", "Y học Dự phòng", "Điều dưỡng"],
    programs: [
      { name: "Y khoa", majorCode: "YKHOA", programCode: "YK01", admissionScore2025: 28.85, tuitionPerSemester: 27 },
      { name: "Răng - Hàm - Mặt", programCode: "RHM01", admissionScore2025: 28.45, tuitionPerSemester: 27 },
      { name: "Điều dưỡng", programCode: "DD01", admissionScore2025: 24.7, tuitionPerSemester: 14 },
    ],
  },
  {
    code: "HLU",
    name: "Đại học Luật Hà Nội",
    shortDesc: "Luật & Pháp lý",
    tags: ["Luật", "Pháp lý"],
    city: "Hà Nội",
    website: "https://hlu.edu.vn",
    heroGradient: "from-slate-600 via-gray-700 to-zinc-800",
    about: "Đại học Luật Hà Nội là trường đầu ngành đào tạo cử nhân luật và nhân lực pháp lý.",
    highlights: [
      "Đầu ngành đào tạo luật phía Bắc",
      "Nhiều chương trình chất lượng cao",
      "Cơ hội việc làm trong toà án, viện kiểm sát",
    ],
    majors: ["Luật học", "Luật Kinh tế", "Luật Quốc tế", "Luật Thương mại Quốc tế"],
    programs: [
      { name: "Luật Kinh tế", majorCode: "LKT", programCode: "LKT01", admissionScore2025: 27.36, tuitionPerSemester: 9 },
      { name: "Luật học", programCode: "LH01", admissionScore2025: 26.5, tuitionPerSemester: 8 },
      { name: "Luật Thương mại Quốc tế", programCode: "LTMQT", admissionScore2025: 26.95, tuitionPerSemester: 9 },
    ],
  },
];

export const getUniversity = (code: string) =>
  UNIVERSITIES.find((university) => university.code.toLowerCase() === code.toLowerCase());
