// Maps a Vietnamese province/city name to a coarse region bucket so the UniMap
// directory can offer a "Khu vực" filter without per-school region data.

export const VN_REGIONS = [
  "Hà Nội",
  "TP.HCM",
  "Miền Bắc",
  "Miền Trung",
  "Miền Nam",
] as const;

export type VnRegion = (typeof VN_REGIONS)[number];

// Province lists are intentionally partial: they cover the provinces most likely
// to appear in the dataset. Anything unmatched falls back by simple heuristics.
const NORTH_PROVINCES = [
  "bac giang",
  "bac kan",
  "bac ninh",
  "cao bang",
  "dien bien",
  "ha giang",
  "ha nam",
  "hai duong",
  "hai phong",
  "hoa binh",
  "hung yen",
  "lai chau",
  "lang son",
  "lao cai",
  "nam dinh",
  "ninh binh",
  "phu tho",
  "quang ninh",
  "son la",
  "thai binh",
  "thai nguyen",
  "tuyen quang",
  "vinh phuc",
  "yen bai",
];

const CENTRAL_PROVINCES = [
  "thanh hoa",
  "nghe an",
  "ha tinh",
  "quang binh",
  "quang tri",
  "hue",
  "thua thien hue",
  "da nang",
  "quang nam",
  "quang ngai",
  "binh dinh",
  "phu yen",
  "khanh hoa",
  "ninh thuan",
  "binh thuan",
  "kon tum",
  "gia lai",
  "dak lak",
  "dak nong",
  "lam dong",
];

const SOUTH_PROVINCES = [
  "ba ria",
  "vung tau",
  "binh duong",
  "binh phuoc",
  "dong nai",
  "tay ninh",
  "long an",
  "tien giang",
  "ben tre",
  "tra vinh",
  "vinh long",
  "dong thap",
  "an giang",
  "kien giang",
  "can tho",
  "hau giang",
  "soc trang",
  "bac lieu",
  "ca mau",
];

/** Strip Vietnamese diacritics and lowercase for tolerant matching. */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .trim();
}

export function cityToRegion(city: string | null | undefined): VnRegion | null {
  if (!city) return null;
  const normalized = normalize(city);
  if (!normalized) return null;

  if (normalized.includes("ha noi") || normalized === "hanoi") return "Hà Nội";
  if (
    normalized.includes("ho chi minh") ||
    normalized.includes("hcm") ||
    normalized.includes("sai gon")
  ) {
    return "TP.HCM";
  }

  if (NORTH_PROVINCES.some((province) => normalized.includes(province))) return "Miền Bắc";
  if (CENTRAL_PROVINCES.some((province) => normalized.includes(province))) return "Miền Trung";
  if (SOUTH_PROVINCES.some((province) => normalized.includes(province))) return "Miền Nam";

  return null;
}
