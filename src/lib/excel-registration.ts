import * as XLSX from "xlsx";

export interface ExcelRegistrationRow {
  rowNumber: number;
  fullName: string;
  email?: string;
  phone?: string;
  institution: string;
  competitionName: string;
  category?: "individu" | "kelompok" | string;
  teamName?: string;
  teamMembers?: string[];
  raw?: Record<string, any>;
}

export interface CompetitionTemplateItem {
  id: string;
  name: string;
  shortName?: string;
  type: "individu" | "kelompok" | string;
  minMembers?: number;
  maxMembers?: number;
  status: string;
}

/**
 * Normalisasi satu baris dari objek JSON hasil parsing Excel (sheet_to_json).
 * Menoleransi variasi penamaan kolom header (huruf besar/kecil, spasi, tanda bintang, dsb).
 */
export function normalizeExcelRow(
  rawRow: Record<string, any>,
  rowNumber: number
): ExcelRegistrationRow {
  const getFieldValue = (candidateKeys: string[]): string => {
    for (const key of Object.keys(rawRow)) {
      const cleanKey = key
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ""); // buang spasi, simbol, bintang, dll
      for (const cand of candidateKeys) {
        if (cleanKey.includes(cand)) {
          const val = rawRow[key];
          if (val !== undefined && val !== null) {
            return String(val).trim();
          }
        }
      }
    }
    return "";
  };

  const fullName = getFieldValue([
    "namapeserta",
    "namalengkap",
    "nama",
    "peserta",
  ]);
  const email = getFieldValue(["email", "surel"]);
  const phone = getFieldValue([
    "whatsapp",
    "wa",
    "telepon",
    "telp",
    "phone",
    "nohp",
    "hp",
    "kontak",
  ]);
  const institution = getFieldValue([
    "asalinstansi",
    "instansi",
    "sekolah",
    "asalsekolah",
    "lembaga",
    "madrasah",
    "kampus",
  ]);
  const competitionName = getFieldValue([
    "cabanglomba",
    "lomba",
    "namalomba",
    "cabang",
    "kompetisi",
  ]);
  const categoryRaw = getFieldValue([
    "kategori",
    "jenislomba",
    "tipe",
  ]).toLowerCase();
  const teamName = getFieldValue(["namatim", "tim", "group", "namakelompok"]);
  const teamMembersRaw = getFieldValue([
    "anggotatim",
    "anggota",
    "anggotakelompok",
    "members",
    "rombongan",
  ]);

  // Parse anggota tim yang dipisahkan koma, titik koma, atau baris baru
  const teamMembers = teamMembersRaw
    ? teamMembersRaw
        .split(/[,;\n\r]+/)
        .map((m) => m.trim())
        .filter((m) => m.length > 0)
    : [];

  const category =
    categoryRaw.includes("kelompok") ||
    categoryRaw.includes("tim") ||
    categoryRaw.includes("beregu")
      ? "kelompok"
      : categoryRaw.includes("individu") || categoryRaw.includes("perorangan")
      ? "individu"
      : undefined;

  return {
    rowNumber,
    fullName,
    email: email || undefined,
    phone: phone || undefined,
    institution,
    competitionName,
    category,
    teamName: teamName || undefined,
    teamMembers,
    raw: rawRow,
  };
}

/**
 * Parse file buffer Excel (.xlsx / .xls) menjadi daftar baris pendaftaran terstruktur.
 */
export function parseRegistrationExcelBuffer(
  buffer: ArrayBuffer | Buffer
): ExcelRegistrationRow[] {
  const wb = XLSX.read(buffer, { type: "buffer" });
  if (!wb.SheetNames || wb.SheetNames.length === 0) {
    throw new Error("File Excel tidak memiliki lembar kerja (worksheet).");
  }

  // Cari sheet 'Template_Pendaftaran' atau ambil sheet pertama
  const targetSheetName =
    wb.SheetNames.find((s) =>
      s.toLowerCase().replace(/[^a-z0-9]/g, "").includes("template")
    ) || wb.SheetNames[0];

  const ws = wb.Sheets[targetSheetName];
  if (!ws) {
    throw new Error(`Lembar kerja "${targetSheetName}" tidak dapat dibaca.`);
  }

  const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, {
    defval: "",
    raw: false,
  });

  const parsedRows: ExcelRegistrationRow[] = [];
  rawRows.forEach((row, index) => {
    // Nomor baris di Excel biasanya index + 2 (baris 1 = header)
    const rowNumber = index + 2;
    const normalized = normalizeExcelRow(row, rowNumber);

    // Abaikan baris kosong total
    if (
      !normalized.fullName &&
      !normalized.institution &&
      !normalized.competitionName
    ) {
      return;
    }

    parsedRows.push(normalized);
  });

  return parsedRows;
}

/**
 * Buat workbook Excel (.xlsx) resmi untuk template pendaftaran peserta lomba.
 */
export function createRegistrationTemplateWorkbook(
  competitions: CompetitionTemplateItem[]
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // 1. Sheet: Template Pendaftaran
  const templateHeaders = [
    "No",
    "Nama Lengkap Peserta *",
    "Email Peserta",
    "No WhatsApp / Telepon",
    "Asal Instansi / Sekolah *",
    "Cabang Lomba *",
    "Kategori (Individu / Kelompok)",
    "Nama Tim (Khusus Kelompok)",
    "Anggota Tim (Pisahkan Koma)",
  ];

  const sampleRows = [
    [
      1,
      "Ahmad Fauzan",
      "ahmad.fauzan@smkdp2.sch.id",
      "081234567890",
      "SMK Digital Plus 2 Jakarta",
      "Cipta & Baca Puisi",
      "Individu",
      "",
      "",
    ],
    [
      2,
      "Siti Nurhaliza",
      "siti.nurhaliza@sman1jkt.sch.id",
      "081298765432",
      "SMAN 1 Jakarta",
      "Duta Bahasa Pelajar",
      "Individu",
      "",
      "",
    ],
    [
      3,
      "Budi Santoso",
      "tim.film@smkdp2.sch.id",
      "085712345678",
      "SMK Digital Plus 2 Jakarta",
      "Produksi Film Pendek",
      "Kelompok",
      "Tim Lentera Sineas",
      "Rian Pratama, Dewi Lestari, Maya Putri",
    ],
  ];

  const wsTemplateData = [templateHeaders, ...sampleRows];
  const wsTemplate = XLSX.utils.aoa_to_sheet(wsTemplateData);

  // Lebar kolom yang proporsional
  wsTemplate["!cols"] = [
    { wch: 6 }, // No
    { wch: 28 }, // Nama Lengkap
    { wch: 30 }, // Email
    { wch: 22 }, // No WA
    { wch: 32 }, // Asal Instansi
    { wch: 32 }, // Cabang Lomba
    { wch: 28 }, // Kategori
    { wch: 26 }, // Nama Tim
    { wch: 45 }, // Anggota Tim
  ];

  XLSX.utils.book_append_sheet(wb, wsTemplate, "Template Pendaftaran");

  // 2. Sheet: Daftar Cabang Lomba (sebagai referensi admin saat mengisi)
  const compHeaders = [
    "No",
    "Nama Cabang Lomba",
    "Kategori",
    "Min Anggota Tim",
    "Max Anggota Tim",
    "Status Pendaftaran",
  ];

  const compRows = (competitions || []).map((c, idx) => [
    idx + 1,
    c.name,
    c.type === "kelompok" ? "Kelompok (Beregu)" : "Individu (Perorangan)",
    c.type === "kelompok" ? c.minMembers || 2 : 1,
    c.type === "kelompok" ? c.maxMembers || 10 : 1,
    c.status.toUpperCase(),
  ]);

  const wsComps = XLSX.utils.aoa_to_sheet([compHeaders, ...compRows]);
  wsComps["!cols"] = [
    { wch: 6 },
    { wch: 35 },
    { wch: 25 },
    { wch: 18 },
    { wch: 18 },
    { wch: 22 },
  ];

  XLSX.utils.book_append_sheet(wb, wsComps, "Daftar Cabang Lomba");

  // 3. Sheet: Petunjuk Pengisian
  const petunjukRows = [
    ["PANDUAN PENGISIAN TEMPLATE IMPORT PESERTA LOMBA GEBYAR BULAN BAHASA"],
    [""],
    ["1. Kolom Bertanda Bintang (*) Wajib Diisi:"],
    ["   - Nama Lengkap Peserta : Nama lengkap peserta yang akan didaftarkan."],
    ["   - Asal Instansi / Sekolah : Nama sekolah atau instansi peserta (Contoh: SMK Digital Plus 2 Jakarta)."],
    ["   - Cabang Lomba : Tuliskan persis seperti nama lomba di sheet 'Daftar Cabang Lomba'."],
    [""],
    ["2. Kolom Opsional / Pendukung:"],
    ["   - Email Peserta : Jika dikosongkan, sistem akan membuatkan email sistem otomatis."],
    ["   - No WhatsApp : Nomor kontak peserta untuk koordinasi panitia."],
    [""],
    ["3. Ketentuan Lomba Beregu / Kelompok (Contoh: Film Pendek, Vokal Grup, Palang Pintu):"],
    ["   - Masukkan nama ketua tim pada kolom 'Nama Lengkap Peserta'."],
    ["   - Isi kolom 'Nama Tim' dengan nama regu/kelompok."],
    ["   - Masukkan nama-nama anggota tim pada kolom 'Anggota Tim' dipisahkan dengan tanda koma (,)."],
    ["     Contoh: Budi Santoso, Siti Rahmawati, Dewi Lestari"],
    [""],
    ["4. Pencocokan Data Peserta:"],
    ["   - Jika peserta sudah pernah terdaftar di aplikasi (cocok nama + sekolah atau email), sistem otomatis menghubungkannya."],
    ["   - Jika peserta belum ada, sistem akan otomatis mendaftarkan profil peserta baru dengan nomor registrasi unik."],
    ["   - Jika peserta sudah terdaftar di cabang lomba yang sama, baris tersebut akan dilaporkan duplikat dan diabaikan."],
  ];

  const wsPetunjuk = XLSX.utils.aoa_to_sheet(petunjukRows);
  wsPetunjuk["!cols"] = [{ wch: 90 }];

  XLSX.utils.book_append_sheet(wb, wsPetunjuk, "Petunjuk Pengisian");

  return wb;
}

