const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs-extra");
const path = require("path");

const BASE_URL = "https://trangedu.com";

const URLS = {
    majors: "https://trangedu.com/nganh/",
    hanoiSchools: "https://trangedu.com/khu-vuc/dai-hoc-hoc-vien-tai-ha-noi/",
};

function cleanText(text) {
    return text.replace(/\s+/g, " ").trim();
}

function absoluteUrl(href) {
    if (!href) return null;

    try {
        return new URL(href, BASE_URL).href;
    } catch {
        return null;
    }
}

async function fetchHtml(url) {
    const response = await axios.get(url, {
        headers: {
            "User-Agent":
                "Mozilla/5.0 educational-project-crawler/1.0; contact: your-email@example.com",
            Accept: "text/html,application/xhtml+xml",
        },
        timeout: 20000,
    });

    return response.data;
}

async function saveJson(filename, data) {
    const outputPath = path.join(__dirname, "..", "data_crawl", filename);
    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeJson(outputPath, data, { spaces: 2 });
    console.log(`Saved: ${outputPath}`);
}

async function saveCsv(filename, data) {
    if (!data.length) return;

    const outputPath = path.join(__dirname, "..", "data_crawl", filename);
    const headers = Object.keys(data[0]);

    const rows = [
        headers.join(","),
        ...data.map((item) =>
            headers
                .map((header) => {
                    const value = item[header] ?? "";
                    return `"${String(value).replace(/"/g, '""')}"`;
                })
                .join(",")
        ),
    ];

    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeFile(outputPath, rows.join("\n"), "utf8");
    console.log(`Saved: ${outputPath}`);
}
async function crawlMajors() {
    const html = await fetchHtml(URLS.majors);
    const $ = cheerio.load(html);

    const majors = [];

    const majorUrlMap = new Map();

    $("a").each((_, el) => {
        const name = cleanText($(el).text());
        const href = $(el).attr("href");
        const url = absoluteUrl(href);

        if (!name || !url) return;

        if (
            url.includes("/nganh/") &&
            url !== URLS.majors &&
            !name.toLowerCase().includes("ngành nghề")
        ) {
            majorUrlMap.set(name, url);
        }
    });

    const rawText = $("article").text() || $("main").text() || $("body").text();

    const lines = rawText
        .split("\n")
        .map((line) => cleanText(line))
        .filter(Boolean);

    let currentGroup = null;
    let pendingGroup = null;

    for (const line of lines) {
        /**
         * Bỏ qua các dòng tổng quan.
         */
        if (
            line === "22 nhóm ngành" ||
            line === "390 ngành" ||
            line.includes("Trang chủ") ||
            line.includes("adsbygoogle") ||
            line.includes("Mở tất cả") ||
            line.includes("Thu gọn")
        ) {
            continue;
        }

        /**
         * Nếu dòng là "42 ngành", "21 ngành", ...
         * thì dòng ngay trước đó chính là tên nhóm ngành.
         */
        const countOnlyMatch = line.match(/^(\d+)\s+ngành$/i);

        if (countOnlyMatch && pendingGroup) {
            currentGroup = pendingGroup;
            pendingGroup = null;
            continue;
        }

        /**
         * Dòng mô tả nhóm thường bắt đầu bằng:
         * "Nhóm ngành Khoa học giáo dục..."
         * Không lấy dòng này làm ngành.
         */
        if (line.toLowerCase().startsWith("nhóm ngành")) {
            continue;
        }

        /**
         * Nhận diện ngành:
         * Ví dụ:
         * Giáo dục học7140101
         * Marketing7340115
         * Khoa học máy tính7480101
         */
        const majorMatch = line.match(/^(.+?)(\d{7}|—)$/);

        if (majorMatch) {
            const majorName = cleanText(majorMatch[1]);
            const majorCode = majorMatch[2] === "—" ? null : majorMatch[2];

            if (majorName.toLowerCase().includes("tên ngành")) continue;

            majors.push({
                group_name: currentGroup,
                major_name: majorName,
                major_code: majorCode,
                major_url: majorUrlMap.get(majorName) || null,
            });

            continue;
        }

        /**
         * Nếu chưa phải ngành, chưa phải mô tả, khả năng cao là tên nhóm ngành.
         * Ví dụ:
         * Khoa học giáo dục và Đào tạo giáo viên
         */
        if (
            !line.includes("Danh sách") &&
            !line.includes("Tìm kiếm") &&
            !line.includes("Bấm vào")
        ) {
            pendingGroup = line;
        }
    }

    const uniqueMajors = Array.from(
        new Map(
            majors.map((item) => [
                `${item.major_code || "no-code"}-${item.major_name}`,
                item,
            ])
        ).values()
    );

    return uniqueMajors;
}

async function crawlHanoiSchools() {
    const html = await fetchHtml(URLS.hanoiSchools);
    const $ = cheerio.load(html);

    const schools = [];

    /**
     * Trang Hà Nội có dạng:
     * STT + link tên trường + mã trường
     * Ví dụ: 1 Đại học Bách khoa Hà Nội BKA
     */

    $("a").each((_, el) => {
        const schoolName = cleanText($(el).text());
        const href = $(el).attr("href");
        const schoolUrl = absoluteUrl(href);

        if (!schoolName || !schoolUrl) return;

        const isSchool =
            schoolName.includes("Đại học") ||
            schoolName.includes("Học viện") ||
            schoolName.includes("Trường");

        if (!isSchool) return;

        const parentText = cleanText($(el).parent().text());

        const codeMatch = parentText.match(/\b[A-Z]{2,5}\b/g);

        schools.push({
            school_name: schoolName,
            school_code: codeMatch ? codeMatch[codeMatch.length - 1] : null,
            area: "Hà Nội",
            school_url: schoolUrl,
        });
    });

    const uniqueSchools = Array.from(
        new Map(schools.map((item) => [item.school_url, item])).values()
    );

    return uniqueSchools;
}

async function main() {
    console.log("Crawling majors...");
    const majors = await crawlMajors();

    await saveJson("majors.json", majors);
    await saveCsv("majors.csv", majors);

    console.log(`Majors crawled: ${majors.length}`);

    console.log("Crawling Hanoi schools...");
    const schools = await crawlHanoiSchools();

    await saveJson("schools_hanoi.json", schools);
    await saveCsv("schools_hanoi.csv", schools);

    console.log(`Hanoi schools crawled: ${schools.length}`);

    console.log("Done.");
}

main().catch((error) => {
    console.error("Crawler failed:", error.message);
    process.exit(1);
});