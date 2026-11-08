import * as XLSX from "xlsx";
import type { Participant } from "@/lib/dummy-data";

export interface ExportParticipantsExcelOptions {
  statusFilter?: string;
  searchQuery?: string;
}

/**
 * Buat workbook Excel (.xlsx) resmi untuk data peserta lomba Gebyar Bulan Bahasa.
 */
export function generateParticipantsWorkbook(
  participants: Participant[],
  options?: ExportParticipantsExcelOptions
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // 1. Sheet: Data Peserta
  const headers = [
    "No",
    "No. Registrasi",
    "Nama Lengkap",
    "Asal Instansi / Sekolah",
    "Cabang Lomba",
    "Kategori",
    "Nama Tim",
    "Anggota Tim",
    "Status Verifikasi",
    "Total Poin",
    "No. WhatsApp / HP",
    "Email",
    "Tanggal Pendaftaran",
    "Status Dokumen",
    "Catatan / Alasan Penolakan",
  ];

  const rows = participants.map((p, idx) => {
    let statusText = "Menunggu Verifikasi";
    if (p.status === "terverifikasi") statusText = "Terverifikasi";
    else if (p.status === "ditolak") statusText = "Ditolak";

    const teamMembersText =
      p.teamMembers && p.teamMembers.length > 0 ? p.teamMembers.join("; ") : "-";

    const docsCount = p.documents?.length || 0;
    const validDocsCount = p.documents?.filter((d) => d.status === "valid").length || 0;
    const docsSummary =
      docsCount > 0
        ? `${validDocsCount}/${docsCount} Berkas Disetujui`
        : "Belum Ada Berkas";

    return [
      idx + 1,
      p.registrationNumber || "-",
      p.fullName || "-",
      p.institution || "-",
      p.competitionName || "Belum Memilih Lomba",
      p.category === "kelompok" ? "Kelompok" : "Individu",
      p.teamName || "-",
      teamMembersText,
      statusText,
      p.totalPoints ?? 0,
      p.phone || "-",
      p.email || "-",
      p.registeredAt || "-",
      docsSummary,
      p.rejectionReason || "-",
    ];
  });

  const wsData = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Lebar kolom yang proporsional agar langsung terbaca rapi di Microsoft Excel
  wsData["!cols"] = [
    { wch: 6 }, // No
    { wch: 20 }, // No. Registrasi
    { wch: 30 }, // Nama Lengkap
    { wch: 36 }, // Asal Instansi / Sekolah
    { wch: 30 }, // Cabang Lomba
    { wch: 14 }, // Kategori
    { wch: 25 }, // Nama Tim
    { wch: 45 }, // Anggota Tim
    { wch: 22 }, // Status Verifikasi
    { wch: 12 }, // Total Poin
    { wch: 20 }, // No WA / HP
    { wch: 28 }, // Email
    { wch: 18 }, // Tanggal Pendaftaran
    { wch: 24 }, // Status Dokumen
    { wch: 38 }, // Catatan / Alasan Penolakan
  ];

  XLSX.utils.book_append_sheet(wb, wsData, "Daftar Peserta");

  // 2. Sheet: Ringkasan Statistik
  const compDistribution: Record<string, number> = {};
  participants.forEach((p) => {
    const cName = p.competitionName || "Belum Memilih Lomba";
    compDistribution[cName] = (compDistribution[cName] || 0) + 1;
  });

  const summaryData: (string | number)[][] = [
    ["RINGKASAN EKSPOR DATA PESERTA"],
    ["Nama Acara", "Gebyar Bulan Bahasa dan Kebudayaan"],
    ["Penyelenggara", "SMK DINAMIKA PEMBANGUNAN 2 JAKARTA"],
    ["Waktu Pengunduhan", new Date().toLocaleString("id-ID")],
    ["Filter Status", options?.statusFilter ? options.statusFilter.replace(/_/g, " ").toUpperCase() : "SEMUA"],
    ["Kata Kunci Pencarian", options?.searchQuery || "-"],
    ["Total Peserta Diekspor", participants.length],
    [],
    ["REKAPITULASI STATUS VERIFIKASI"],
    ["Status", "Jumlah Peserta"],
    ["Terverifikasi", participants.filter((p) => p.status === "terverifikasi").length],
    ["Menunggu Verifikasi", participants.filter((p) => p.status === "menunggu_verifikasi").length],
    ["Ditolak", participants.filter((p) => p.status === "ditolak").length],
    [],
    ["REKAPITULASI PER CABANG LOMBA"],
    ["Nama Cabang Lomba", "Jumlah Peserta / Tim"],
    ...Object.entries(compDistribution)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => [name, count]),
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary["!cols"] = [{ wch: 32 }, { wch: 26 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan Statistik");

  return wb;
}

/**
 * Memicu pengunduhan file Excel langsung di browser pengguna.
 */
export function downloadParticipantsExcel(
  participants: Participant[],
  options?: ExportParticipantsExcelOptions
) {
  if (!participants || participants.length === 0) return;

  const wb = generateParticipantsWorkbook(participants, options);
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(
    now.getHours()
  )}${pad(now.getMinutes())}`;

  const filterPart =
    options?.statusFilter && options.statusFilter !== "semua"
      ? `_${options.statusFilter}`
      : "";

  const filename = `Data_Peserta_Gebyar_Bulan_Bahasa${filterPart}_${dateStr}.xlsx`;

  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

