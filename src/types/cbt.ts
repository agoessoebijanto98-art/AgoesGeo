export type UserRole = 'admin' | 'peserta';

export type TipeSoal =
  | 'PG'
  | 'PG_KOMPLEKS'
  | 'BENAR_SALAH'
  | 'ISIAN_SINGKAT'
  | 'URAIAN';

export type StatusSesi = 'Belum Masuk' | 'Sedang Ujian' | 'Selesai' | 'Diblokir';

export interface AdminRecord {
  id_admin: string;
  username: string;
  password_hash: string;
  nama_lengkap: string;
  role: 'Super Admin' | 'Proktor';
}

export interface KelasRecord {
  id_kelas: string;
  nama_kelas: string;
  tingkat: string;
  wali_kelas: string;
}

export interface PesertaRecord {
  id_peserta: string;
  nis: string;
  nama: string;
  id_kelas: string;
  nama_kelas: string;
  password_hash: string;
  password_plain_hint?: string;
  status_login: 'Offline' | 'Online';
  session_token: string;
  last_active: string;
}

export interface BankSoalRecord {
  id_soal: string;
  nomor: number;
  pertanyaan: string;
  gambar_url: string;
  opsi_a: string;
  opsi_b: string;
  opsi_c: string;
  opsi_d: string;
  opsi_e: string;
  kunci_jawaban: string;
  bobot: number;
  tipe_soal: TipeSoal;
  kategori: string;
}

export interface UjianRecord {
  id_ujian: string;
  nama_ujian: string;
  mata_pelajaran: string;
  kelas_peserta: string[];
  tanggal: string;
  jam_mulai: string;
  jam_selesai: string;
  durasi_menit: number;
  acak_soal: boolean;
  acak_opsi: boolean;
  tampilkan_nilai: boolean;
  kkm: number;
  token_ujian: string;
  token_hash: string;
  status: 'Aktif' | 'Draft' | 'Selesai';
}

export interface JawabanPesertaRecord {
  id_sesi: string;
  id_ujian: string;
  nis: string;
  nama: string;
  kelas: string;
  status: StatusSesi;
  jawaban_map: Record<string, string>;
  ragu_map: Record<string, boolean>;
  urutan_soal: string[];
  opsi_order_map?: Record<string, string[]>;
  waktu_mulai: string;
  waktu_selesai_target: string;
  tambahan_menit: number;
  jumlah_pelanggaran: number;
  tab_switch_count: number;
  fullscreen_exit_count: number;
  last_activity: string;
  peringatan_admin: string;
  peringatan_timestamp?: string;
}

export interface HasilUjianRecord {
  id_hasil: string;
  id_ujian: string;
  nama_ujian: string;
  nis: string;
  nama: string;
  kelas: string;
  nilai: number;
  jumlah_benar: number;
  jumlah_salah: number;
  waktu_mulai: string;
  waktu_selesai: string;
  jumlah_pelanggaran: number;
  status: 'Tuntas' | 'Belum Tuntas' | 'Dipaksa Selesai';
  detail_benar_map?: Record<string, boolean>;
}

export interface LogPelanggaranRecord {
  id_log: string;
  timestamp: string;
  id_ujian: string;
  nama_ujian: string;
  nis: string;
  nama: string;
  kelas: string;
  jenis_pelanggaran: string;
  jumlah_ke: number;
}

export interface BlokirRecord {
  id_blokir: string;
  nis: string;
  nama: string;
  kelas: string;
  id_ujian: string;
  nama_ujian: string;
  alasan: string;
  waktu_blokir: string;
  status: 'Terblokir' | 'Dibuka';
}

export interface PengaturanRecord {
  nama_sekolah: string;
  max_pindah_tab: number;
  max_keluar_fullscreen: number;
  max_total_pelanggaran: number;
  interval_autosave_detik: number;
  spreadsheet_id: string;
}

export interface CbtDatabase {
  Admin: AdminRecord[];
  Kelas: KelasRecord[];
  Peserta: PesertaRecord[];
  Bank_Soal: BankSoalRecord[];
  Ujian: UjianRecord[];
  Jawaban_Peserta: JawabanPesertaRecord[];
  Hasil_Ujian: HasilUjianRecord[];
  Log_Pelanggaran: LogPelanggaranRecord[];
  Blokir: BlokirRecord[];
  Pengaturan: PengaturanRecord;
}

export interface ActiveAuthSession {
  role: UserRole;
  sessionToken: string;
  username?: string;
  namaLengkap: string;
  nis?: string;
  kelas?: string;
  idUjianTarget?: string;
}
