const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs-extra");
const path = require("path");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function cleanText(text) {
    return text.replace(/\s+/g, " ").trim();
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

async function readJson(filename) {
    const filePath = path.join(__dirname, "..", "data_crawl", filename);
    return fs.readJson(filePath);
}

async function saveJson(filename, data) {
    const filePath = path.join(__dirname, "..", "data_crawl", filename);
    await fs.writeJson(filePath, data, { spaces: 2 });
    console.log(`Saved: ${filePath}`);
}

async function crawlDetail(url) {
    try {
        const html = await fetchHtml(url);
        const $ = cheerio.load(html);

        const title = cleanText($("h1").first().text());

        const headings = [];
        $("h2, h3").each((_, el) => {
            const heading = cleanText($(el).text());
            if (heading) headings.push(heading);
        });

        const articleText = cleanText(
            $("article").text() || $("main").text() || $("body").text()
        );

        return {
            title,
            url,
            headings,
            text: articleText,
        };
    } catch (error) {
        return {
            url,
            error: error.message,
        };
    }
}

async function main() {
    const majors = await readJson("majors.json");
    const schools = await readJson("schools_hanoi.json");

    const majorDetails = [];

    console.log("Crawling major details...");

    for (const major of majors) {
        console.log(`Major: ${major.major_name}`);

        const detail = await crawlDetail(major.major_url);

        majorDetails.push({
            ...major,
            detail,
        });

        await delay(800);
    }

    await saveJson("major_details.json", majorDetails);

    const schoolDetails = [];

    console.log("Crawling school details...");

    for (const school of schools) {
        console.log(`School: ${school.school_name}`);

        const detail = await crawlDetail(school.school_url);

        schoolDetails.push({
            ...school,
            detail,
        });

        await delay(800);
    }

    await saveJson("school_details_hanoi.json", schoolDetails);

    console.log("Done.");
}

main().catch((error) => {
    console.error("Detail crawler failed:", error.message);
    process.exit(1);
});