import * as XLSX from 'xlsx';
import { BankSoalRecord, PesertaRecord, TipeSoal } from '../types/cbt';
import { generateId, hashSyncSimple } from './crypto';

export interface ParsedPesertaPreviewRow {
  rowIndex: number;
  nis: string;
  nama: string;
  kelas: string;
  password: string;
  valid: boolean;
  errors: string[];
}

export interface ParsedSoalPreviewRow {
  rowIndex: number;
  nomor: number;
  pertanyaan: string;
  opsi_a: string;
  opsi_b: string;
  opsi_c: string;
  opsi_d: string;
  opsi_e: string;
  kunci_jawaban: string;
  bobot: number;
  tipe_soal: TipeSoal;
  kategori: string;
  valid: boolean;
  errors: string[];
}

const VALID_TIPE_SOAL: TipeSoal[] = [
  'PG',
  'PG_KOMPLEKS',
  'BENAR_SALAH',
  'ISIAN_SINGKAT',
  'URAIAN',
];

export function downloadTemplatePeserta(format: 'xlsx' | 'csv') {
  const rows = [
    {
      NIS: '2026101',
      nama: 'Ahmad Fauzi Ramadhan',
      kelas: 'XII IPA 1',
      password: 'cbt2026',
    },
    {
      NIS: '2026102',
      nama: 'Nadia Putri Kusuma',
      kelas: 'XII IPA 2',
      password: 'cbt2026',
    },
  ];
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template_Peserta');
  if (format === 'csv') {
    const csv = XLSX.utils.sheet_to_csv(ws);
    triggerTextDownload(csv, 'Template_Import_Peserta.csv', 'text/csv;charset=utf-8;');
  } else {
    XLSX.writeFile(wb, 'Template_Import_Peserta.xlsx');
  }
}

export function downloadTemplateSoal(format: 'xlsx' | 'csv') {
  const rows = [
    {
      nomor: 1,
      pertanyaan: 'Hasil dari 2x + 5 = 17, maka nilai x adalah...',
      'opsi A': '4',
      'opsi B': '5',
      'opsi C': '6',
      'opsi D': '7',
      'opsi E': '8',
      'kunci jawaban': 'C',
      bobot: 10,
      'tipe soal': 'PG',
      kategori: 'Matematika',
    },
    {
      nomor: 2,
      pertanyaan: 'Pilihlah dua bilangan prima di bawah ini!',
      'opsi A': '9',
      'opsi B': '11',
      'opsi C': '15',
      'opsi D': '17',
      'opsi E': '21',
      'kunci jawaban': 'B,D',
      bobot: 15,
      'tipe soal': 'PG_KOMPLEKS',
      kategori: 'Matematika',
    },
    {
      nomor: 3,
      pertanyaan: 'Air murni mendidih pada suhu 100 derajat Celcius pada tekanan 1 atm.',
      'opsi A': 'Benar',
      'opsi B': 'Salah',
      'opsi C': '',
      'opsi D': '',
      'opsi E': '',
      'kunci jawaban': 'BENAR',
      bobot: 10,
      'tipe soal': 'BENAR_SALAH',
      kategori: 'Fisika',
    },
    {
      nomor: 4,
      pertanyaan: 'Sebutkan simbol kimia untuk unsur Emas!',
      'opsi A': '',
      'opsi B': '',
      'opsi C': '',
      'opsi D': '',
      'opsi E': '',
      'kunci jawaban': 'Au',
      bobot: 10,
      'tipe soal': 'ISIAN_SINGKAT',
      kategori: 'Kimia',
    },
    {
      nomor: 5,
      pertanyaan: 'Jelaskan perbedaan utama antara rangkaian listrik seri dan paralel!',
      'opsi A': '',
      'opsi B': '',
      'opsi C': '',
      'opsi D': '',
      'opsi E': '',
      'kunci jawaban': 'arus,tegangan,percabangan',
      bobot: 20,
      'tipe soal': 'URAIAN',
      kategori: 'Fisika',
    },
  ];
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template_Bank_Soal');
  if (format === 'csv') {
    const csv = XLSX.utils.sheet_to_csv(ws);
    triggerTextDownload(csv, 'Template_Bank_Soal.csv', 'text/csv;charset=utf-8;');
  } else {
    XLSX.writeFile(wb, 'Template_Bank_Soal.xlsx');
  }
}

export async function parsePesertaFile(
  file: File,
  existingNisSet: Set<string>
): Promise<ParsedPesertaPreviewRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  const seenInFile = new Set<string>();
  return raw.map((row, idx) => {
    const norm: Record<string, string> = {};
    Object.keys(row).forEach((k) => {
      norm[k.trim().toLowerCase()] = String(row[k] ?? '').trim();
    });
    const nis = norm['nis'] || norm['id'] || norm['id peserta'] || '';
    const nama = norm['nama'] || norm['nama lengkap'] || '';
    const kelas = norm['kelas'] || '';
    const password = norm['password'] || norm['kata sandi'] || '123456';

    const errors: string[] = [];
    if (!nis) errors.push('NIS kosong');
    if (!nama) errors.push('Nama kosong');
    if (!kelas) errors.push('Kelas kosong');
    if (nis && seenInFile.has(nis)) errors.push('NIS duplikat di file');
    if (nis && existingNisSet.has(nis)) errors.push('NIS sudah terdaftar');
    if (nis) seenInFile.add(nis);

    return {
      rowIndex: idx + 2,
      nis,
      nama,
      kelas,
      password,
      valid: errors.length === 0,
      errors,
    };
  });
}

export async function parseSoalFile(file: File): Promise<ParsedSoalPreviewRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  return raw.map((row, idx) => {
    const norm: Record<string, string> = {};
    Object.keys(row).forEach((k) => {
      norm[k.trim().toLowerCase()] = String(row[k] ?? '').trim();
    });

    const nomor = Number(norm['nomor'] || idx + 1) || idx + 1;
    const pertanyaan = norm['pertanyaan'] || norm['soal'] || '';
    const opsi_a = norm['opsi a'] || norm['opsi_a'] || norm['a'] || '';
    const opsi_b = norm['opsi b'] || norm['opsi_b'] || norm['b'] || '';
    const opsi_c = norm['opsi c'] || norm['opsi_c'] || norm['c'] || '';
    const opsi_d = norm['opsi d'] || norm['opsi_d'] || norm['d'] || '';
    const opsi_e = norm['opsi e'] || norm['opsi_e'] || norm['e'] || '';
    const kunci_jawaban = (norm['kunci jawaban'] || norm['kunci_jawaban'] || norm['kunci'] || '').trim();
    const bobot = Number(norm['bobot'] || 10);
    const rawTipe = (norm['tipe soal'] || norm['tipe_soal'] || norm['tipe'] || 'PG')
      .toUpperCase()
      .replace(/\s+/g, '_') as TipeSoal;
    const kategori = norm['kategori'] || norm['mapel'] || 'Umum';

    const errors: string[] = [];
    if (!pertanyaan) errors.push('Pertanyaan wajib diisi');
    if (!VALID_TIPE_SOAL.includes(rawTipe)) {
      errors.push(`Tipe soal tidak valid (${rawTipe})`);
    }
    if (rawTipe === 'PG' && (!opsi_a || !opsi_b)) {
      errors.push('PG minimal butuh Opsi A & B');
    }
    if (rawTipe !== 'URAIAN' && !kunci_jawaban) {
      errors.push('Kunci jawaban wajib diisi');
    }
    if (Number.isNaN(bobot) || bobot <= 0) {
      errors.push('Bobot harus > 0');
    }

    return {
      rowIndex: idx + 2,
      nomor,
      pertanyaan,
      opsi_a,
      opsi_b,
      opsi_c,
      opsi_d,
      opsi_e,
      kunci_jawaban: rawTipe === 'PG' || rawTipe === 'PG_KOMPLEKS' ? kunci_jawaban.toUpperCase() : kunci_jawaban,
      bobot: Number.isNaN(bobot) ? 10 : bobot,
      tipe_soal: VALID_TIPE_SOAL.includes(rawTipe) ? rawTipe : 'PG',
      kategori,
      valid: errors.length === 0,
      errors,
    };
  });
}

export function previewRowsToPesertaRecords(
  rows: ParsedPesertaPreviewRow[],
  kelasMap: Map<string, string>
): PesertaRecord[] {
  return rows
    .filter((r) => r.valid)
    .map((r) => ({
      id_peserta: generateId('PST'),
      nis: r.nis,
      nama: r.nama,
      id_kelas: kelasMap.get(r.kelas.toLowerCase()) || 'KLS-AUTO',
      nama_kelas: r.kelas,
      password_hash: hashSyncSimple(r.password),
      password_plain_hint: r.password,
      status_login: 'Offline',
      session_token: '',
      last_active: '-',
    }));
}

export function previewRowsToSoalRecords(rows: ParsedSoalPreviewRow[]): BankSoalRecord[] {
  return rows
    .filter((r) => r.valid)
    .map((r) => ({
      id_soal: generateId('SOL'),
      nomor: r.nomor,
      pertanyaan: r.pertanyaan,
      gambar_url: '',
      opsi_a: r.opsi_a,
      opsi_b: r.opsi_b,
      opsi_c: r.opsi_c,
      opsi_d: r.opsi_d,
      opsi_e: r.opsi_e,
      kunci_jawaban: r.kunci_jawaban,
      bobot: r.bobot,
      tipe_soal: r.tipe_soal,
      kategori: r.kategori,
    }));
}

export function exportRowsToExcelOrCsv(
  rows: Record<string, unknown>[],
  sheetName: string,
  fileNameBase: string,
  format: 'xlsx' | 'csv'
) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  if (format === 'csv') {
    const csv = XLSX.utils.sheet_to_csv(ws);
    triggerTextDownload(csv, `${fileNameBase}.csv`, 'text/csv;charset=utf-8;');
  } else {
    XLSX.writeFile(wb, `${fileNameBase}.xlsx`);
  }
}

export function triggerTextDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
