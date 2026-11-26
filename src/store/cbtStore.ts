import { createInitialSeedDatabase } from '../data/seedData';
import {
  ActiveAuthSession,
  BankSoalRecord,
  CbtDatabase,
  HasilUjianRecord,
  JawabanPesertaRecord,
  KelasRecord,
  PengaturanRecord,
  PesertaRecord,
  UjianRecord,
} from '../types/cbt';
import { generateExamToken, generateId, hashSyncSimple } from '../utils/crypto';

const DB_STORAGE_KEY = 'ujiankita_cbt_db_v1';
const AUTH_SESSION_KEY = 'ujiankita_cbt_auth_v1';
const CHANNEL_NAME = 'ujiankita_cbt_sync_channel';

export function loadDatabase(): CbtDatabase {
  try {
    const raw = localStorage.getItem(DB_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CbtDatabase;
      if (parsed && parsed.Admin && parsed.Peserta && parsed.Ujian) {
        if (parsed.Pengaturan?.nama_sekolah === 'SMA Negeri Nusantara Digital') {
          parsed.Pengaturan.nama_sekolah = 'SMAN 1 Pamekasan';
          saveDatabase(parsed, false);
        }
        return parsed;
      }
    }
  } catch {
    // Abaikan error parse dan buat ulang dari seed
  }
  const seed = createInitialSeedDatabase();
  saveDatabase(seed, false);
  return seed;
}

export function saveDatabase(db: CbtDatabase, broadcast = true) {
  localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(db));
  if (broadcast && typeof BroadcastChannel !== 'undefined') {
    const ch = new BroadcastChannel(CHANNEL_NAME);
    ch.postMessage({ type: 'DB_UPDATED', ts: Date.now() });
    ch.close();
  }
}

export function resetDatabaseToSeed(): CbtDatabase {
  const seed = createInitialSeedDatabase();
  saveDatabase(seed, true);
  return seed;
}

export function loadAuthSession(): ActiveAuthSession | null {
  try {
    const raw = sessionStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ActiveAuthSession;
  } catch {
    return null;
  }
}

export function saveAuthSession(session: ActiveAuthSession | null) {
  if (!session) {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
  } else {
    sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  }
}

export function subscribeDatabaseSync(onSync: (db: CbtDatabase) => void): () => void {
  const handleStorage = (e: StorageEvent) => {
    if (e.key === DB_STORAGE_KEY) {
      onSync(loadDatabase());
    }
  };
  window.addEventListener('storage', handleStorage);

  let ch: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== 'undefined') {
    ch = new BroadcastChannel(CHANNEL_NAME);
    ch.onmessage = () => {
      onSync(loadDatabase());
    };
  }

  return () => {
    window.removeEventListener('storage', handleStorage);
    if (ch) ch.close();
  };
}

/**
 * Evaluasi jawaban satu soal untuk 5 tipe soal:
 * PG, PG_KOMPLEKS, BENAR_SALAH, ISIAN_SINGKAT, URAIAN
 */
export function evaluateSingleQuestion(soal: BankSoalRecord, jawabanRaw: string): boolean {
  const ans = (jawabanRaw || '').trim();
  if (!ans) return false;

  const kunci = (soal.kunci_jawaban || '').trim();
  if (soal.tipe_soal === 'PG') {
    return ans.toUpperCase() === kunci.toUpperCase();
  }
  if (soal.tipe_soal === 'PG_KOMPLEKS') {
    const ansSet = ans
      .toUpperCase()
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .sort()
      .join(',');
    const keySet = kunci
      .toUpperCase()
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .sort()
      .join(',');
    return ansSet.length > 0 && ansSet === keySet;
  }
  if (soal.tipe_soal === 'BENAR_SALAH') {
    return ans.toUpperCase() === kunci.toUpperCase();
  }
  if (soal.tipe_soal === 'ISIAN_SINGKAT') {
    const acceptedKeys = kunci
      .split('|')
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);
    return acceptedKeys.includes(ans.toLowerCase());
  }
  if (soal.tipe_soal === 'URAIAN') {
    // Rubrik kata kunci untuk penilaian awal otomatis
    const keywords = kunci
      .split(',')
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);
    if (keywords.length === 0) return ans.length >= 10;
    const lowerAns = ans.toLowerCase();
    const matched = keywords.filter((kw) => lowerAns.includes(kw));
    return matched.length >= Math.ceil(keywords.length / 2);
  }
  return false;
}

export function gradeExamSession(
  db: CbtDatabase,
  sesi: JawabanPesertaRecord,
  ujian: UjianRecord,
  forced = false
): HasilUjianRecord {
  const soalList = db.Bank_Soal.filter((s) =>
    sesi.urutan_soal.includes(s.id_soal)
  );
  const effectiveSoalList = soalList.length > 0 ? soalList : db.Bank_Soal;

  let totalBobot = 0;
  let earnedBobot = 0;
  let jumlahBenar = 0;
  let jumlahSalah = 0;
  const detailBenarMap: Record<string, boolean> = {};

  for (const soal of effectiveSoalList) {
    totalBobot += soal.bobot;
    const ans = sesi.jawaban_map[soal.id_soal] || '';
    const isCorrect = evaluateSingleQuestion(soal, ans);
    detailBenarMap[soal.id_soal] = isCorrect;
    if (isCorrect) {
      jumlahBenar += 1;
      earnedBobot += soal.bobot;
    } else {
      jumlahSalah += 1;
    }
  }

  const nilai = totalBobot > 0 ? Math.round((earnedBobot / totalBobot) * 100) : 0;
  const status: HasilUjianRecord['status'] = forced
    ? 'Dipaksa Selesai'
    : nilai >= ujian.kkm
      ? 'Tuntas'
      : 'Belum Tuntas';

  return {
    id_hasil: generateId('HSL'),
    id_ujian: ujian.id_ujian,
    nama_ujian: ujian.nama_ujian,
    nis: sesi.nis,
    nama: sesi.nama,
    kelas: sesi.kelas,
    nilai,
    jumlah_benar: jumlahBenar,
    jumlah_salah: jumlahSalah,
    waktu_mulai: sesi.waktu_mulai,
    waktu_selesai: new Date().toISOString(),
    jumlah_pelanggaran: sesi.jumlah_pelanggaran,
    status,
    detail_benar_map: detailBenarMap,
  };
}

export function authenticateAdmin(
  username: string,
  password: string
): { ok: true; session: ActiveAuthSession } | { ok: false; message: string } {
  const db = loadDatabase();
  const hash = hashSyncSimple(password);
  const found = db.Admin.find(
    (a) =>
      a.username.toLowerCase() === username.trim().toLowerCase() &&
      a.password_hash === hash
  );
  if (!found) {
    return { ok: false, message: 'Username atau password admin salah.' };
  }
  const session: ActiveAuthSession = {
    role: 'admin',
    sessionToken: generateId('ADM-SES'),
    username: found.username,
    namaLengkap: found.nama_lengkap,
  };
  saveAuthSession(session);
  return { ok: true, session };
}

export function authenticatePeserta(
  nis: string,
  tokenUjian: string
): { ok: true; session: ActiveAuthSession } | { ok: false; message: string } {
  const db = loadDatabase();
  const cleanNis = nis.trim();
  const cleanToken = tokenUjian.trim().toUpperCase();

  const pesertaIdx = db.Peserta.findIndex((p) => p.nis === cleanNis);
  if (pesertaIdx === -1) {
    return { ok: false, message: 'NIS / ID Peserta tidak ditemukan di database.' };
  }
  const peserta = db.Peserta[pesertaIdx];

  // Cek apakah ujian dengan token tersebut aktif & sesuai kelas
  const tokenHash = hashSyncSimple(cleanToken);
  const ujian = db.Ujian.find(
    (u) =>
      u.status === 'Aktif' &&
      (u.token_hash === tokenHash || u.token_ujian.toUpperCase() === cleanToken)
  );
  if (!ujian) {
    return { ok: false, message: 'Token ujian tidak valid atau ujian belum aktif.' };
  }
  if (!ujian.kelas_peserta.includes(peserta.nama_kelas)) {
    return {
      ok: false,
      message: `Kelas Anda (${peserta.nama_kelas}) tidak terdaftar pada ujian "${ujian.nama_ujian}".`,
    };
  }

  // Cek apakah akun diblokir pada ujian ini
  const blocked = db.Blokir.find(
    (b) =>
      b.nis === cleanNis &&
      b.id_ujian === ujian.id_ujian &&
      b.status === 'Terblokir'
  );
  if (blocked) {
    return {
      ok: false,
      message: `Akun Anda sedang DIBLOKIR (${blocked.alasan}). Hubungi pengawas/admin untuk membuka blokir.`,
    };
  }

  // Enfore single-device login: satu akun hanya boleh login di satu perangkat pada satu waktu
  if (peserta.status_login === 'Online' && peserta.session_token) {
    return {
      ok: false,
      message:
        'Akun sedang aktif di perangkat lain! Satu akun hanya diizinkan pada satu perangkat. Minta Admin melakukan Reset Login jika Anda terputus.',
    };
  }

  const newToken = generateId('PST-SES');
  db.Peserta[pesertaIdx] = {
    ...peserta,
    status_login: 'Online',
    session_token: newToken,
    last_active: new Date().toISOString(),
  };
  saveDatabase(db);

  const session: ActiveAuthSession = {
    role: 'peserta',
    sessionToken: newToken,
    namaLengkap: peserta.nama,
    nis: peserta.nis,
    kelas: peserta.nama_kelas,
    idUjianTarget: ujian.id_ujian,
  };
  saveAuthSession(session);
  return { ok: true, session };
}

export function logoutCurrentUser(session: ActiveAuthSession | null) {
  if (!session) return;
  if (session.role === 'peserta' && session.nis) {
    const db = loadDatabase();
    const idx = db.Peserta.findIndex((p) => p.nis === session.nis);
    if (idx !== -1 && db.Peserta[idx].session_token === session.sessionToken) {
      db.Peserta[idx] = {
        ...db.Peserta[idx],
        status_login: 'Offline',
        session_token: '',
        last_active: new Date().toISOString(),
      };
      saveDatabase(db);
    }
  }
  saveAuthSession(null);
}

export function startOrResumeExamSession(
  nis: string,
  idUjian: string
): { db: CbtDatabase; sesi: JawabanPesertaRecord } {
  const db = loadDatabase();
  const peserta = db.Peserta.find((p) => p.nis === nis)!;
  const ujian = db.Ujian.find((u) => u.id_ujian === idUjian)!;

  const existingIdx = db.Jawaban_Peserta.findIndex(
    (j) => j.nis === nis && j.id_ujian === idUjian
  );
  if (existingIdx !== -1) {
    const existing = db.Jawaban_Peserta[existingIdx];
    db.Jawaban_Peserta[existingIdx] = {
      ...existing,
      last_activity: new Date().toISOString(),
    };
    saveDatabase(db);
    return { db, sesi: db.Jawaban_Peserta[existingIdx] };
  }

  // Filter soal sesuai kategori mapel ujian (atau semua jika umum)
  let soalKandidat = db.Bank_Soal.filter(
    (s) =>
      s.kategori.toLowerCase() === ujian.mata_pelajaran.toLowerCase() ||
      ujian.mata_pelajaran.toLowerCase().includes(s.kategori.toLowerCase())
  );
  if (soalKandidat.length === 0) {
    soalKandidat = [...db.Bank_Soal];
  }

  let urutanIds = soalKandidat.map((s) => s.id_soal);
  if (ujian.acak_soal) {
    urutanIds = [...urutanIds].sort(() => Math.random() - 0.5);
  }

  const opsiOrderMap: Record<string, string[]> = {};
  if (ujian.acak_opsi) {
    for (const s of soalKandidat) {
      if (s.tipe_soal === 'PG' || s.tipe_soal === 'PG_KOMPLEKS') {
        const keys = ['A', 'B', 'C', 'D', 'E'].filter((k) => {
          const val = s[`opsi_${k.toLowerCase()}` as keyof BankSoalRecord];
          return typeof val === 'string' && val.trim().length > 0;
        });
        opsiOrderMap[s.id_soal] = [...keys].sort(() => Math.random() - 0.5);
      }
    }
  }

  const now = new Date();
  const targetEnd = new Date(now.getTime() + ujian.durasi_menit * 60000);
  const newSesi: JawabanPesertaRecord = {
    id_sesi: generateId('SES'),
    id_ujian: ujian.id_ujian,
    nis: peserta.nis,
    nama: peserta.nama,
    kelas: peserta.nama_kelas,
    status: 'Sedang Ujian',
    jawaban_map: {},
    ragu_map: {},
    urutan_soal: urutanIds,
    opsi_order_map: opsiOrderMap,
    waktu_mulai: now.toISOString(),
    waktu_selesai_target: targetEnd.toISOString(),
    tambahan_menit: 0,
    jumlah_pelanggaran: 0,
    tab_switch_count: 0,
    fullscreen_exit_count: 0,
    last_activity: now.toISOString(),
    peringatan_admin: '',
  };

  db.Jawaban_Peserta.push(newSesi);
  saveDatabase(db);
  return { db, sesi: newSesi };
}

export function recordViolationAndCheckBlock(
  nis: string,
  idUjian: string,
  jenis: string,
  category: 'tab' | 'fullscreen' | 'other'
): {
  db: CbtDatabase;
  sesi: JawabanPesertaRecord | null;
  justBlocked: boolean;
  blockReason: string;
  remainingChances: number;
} {
  const db = loadDatabase();
  const ujian = db.Ujian.find((u) => u.id_ujian === idUjian);
  const sesiIdx = db.Jawaban_Peserta.findIndex(
    (j) => j.nis === nis && j.id_ujian === idUjian
  );
  if (sesiIdx === -1 || !ujian) {
    return {
      db,
      sesi: null,
      justBlocked: false,
      blockReason: '',
      remainingChances: 0,
    };
  }

  const sesi = { ...db.Jawaban_Peserta[sesiIdx] };
  if (sesi.status === 'Selesai' || sesi.status === 'Diblokir') {
    return {
      db,
      sesi,
      justBlocked: sesi.status === 'Diblokir',
      blockReason: 'Sesi sudah diblokir',
      remainingChances: 0,
    };
  }

  sesi.jumlah_pelanggaran += 1;
  if (category === 'tab') sesi.tab_switch_count += 1;
  if (category === 'fullscreen') sesi.fullscreen_exit_count += 1;
  sesi.last_activity = new Date().toISOString();

  db.Log_Pelanggaran.unshift({
    id_log: generateId('LOG'),
    timestamp: new Date().toISOString(),
    id_ujian: ujian.id_ujian,
    nama_ujian: ujian.nama_ujian,
    nis: sesi.nis,
    nama: sesi.nama,
    kelas: sesi.kelas,
    jenis_pelanggaran: jenis,
    jumlah_ke: sesi.jumlah_pelanggaran,
  });

  const rules = db.Pengaturan;
  let blockReason = '';
  if (sesi.tab_switch_count > rules.max_pindah_tab) {
    blockReason = `Melebihi batas pindah tab/jendela (> ${rules.max_pindah_tab} kali)`;
  } else if (sesi.fullscreen_exit_count > rules.max_keluar_fullscreen) {
    blockReason = `Melebihi batas keluar layar penuh (> ${rules.max_keluar_fullscreen} kali)`;
  } else if (sesi.jumlah_pelanggaran > rules.max_total_pelanggaran) {
    blockReason = `Melebihi batas total pelanggaran (> ${rules.max_total_pelanggaran} kali)`;
  }

  let justBlocked = false;
  if (blockReason) {
    sesi.status = 'Diblokir';
    justBlocked = true;
    db.Blokir.unshift({
      id_blokir: generateId('BLK'),
      nis: sesi.nis,
      nama: sesi.nama,
      kelas: sesi.kelas,
      id_ujian: ujian.id_ujian,
      nama_ujian: ujian.nama_ujian,
      alasan: blockReason,
      waktu_blokir: new Date().toISOString(),
      status: 'Terblokir',
    });
  }

  db.Jawaban_Peserta[sesiIdx] = sesi;
  saveDatabase(db);

  const remTotal = Math.max(0, rules.max_total_pelanggaran - sesi.jumlah_pelanggaran + 1);
  const remTab =
    category === 'tab'
      ? Math.max(0, rules.max_pindah_tab - sesi.tab_switch_count + 1)
      : remTotal;
  const remFs =
    category === 'fullscreen'
      ? Math.max(0, rules.max_keluar_fullscreen - sesi.fullscreen_exit_count + 1)
      : remTotal;

  return {
    db,
    sesi,
    justBlocked,
    blockReason,
    remainingChances: Math.min(remTotal, remTab, remFs),
  };
}

export function performAdminAction(
  action: 'warn' | 'block' | 'unblock' | 'add_time' | 'force_finish' | 'reset_login',
  nis: string,
  idUjian: string,
  payload?: { message?: string; minutes?: number }
): CbtDatabase {
  const db = loadDatabase();
  const ujian = db.Ujian.find((u) => u.id_ujian === idUjian);
  const pesertaIdx = db.Peserta.findIndex((p) => p.nis === nis);
  const sesiIdx = db.Jawaban_Peserta.findIndex(
    (j) => j.nis === nis && j.id_ujian === idUjian
  );

  if (action === 'reset_login' && pesertaIdx !== -1) {
    db.Peserta[pesertaIdx] = {
      ...db.Peserta[pesertaIdx],
      status_login: 'Offline',
      session_token: '',
    };
  }

  if (sesiIdx !== -1) {
    const sesi = { ...db.Jawaban_Peserta[sesiIdx] };
    if (action === 'warn') {
      sesi.peringatan_admin =
        payload?.message || 'Harap fokus pada layar ujian dan patuhi tata tertib!';
      sesi.peringatan_timestamp = new Date().toISOString();
    } else if (action === 'block') {
      sesi.status = 'Diblokir';
      sesi.peringatan_admin = payload?.message || 'Diblokir secara manual oleh Pengawas/Admin.';
      db.Blokir.unshift({
        id_blokir: generateId('BLK'),
        nis: sesi.nis,
        nama: sesi.nama,
        kelas: sesi.kelas,
        id_ujian: idUjian,
        nama_ujian: ujian?.nama_ujian || idUjian,
        alasan: payload?.message || 'Blokir manual oleh Admin/Pengawas',
        waktu_blokir: new Date().toISOString(),
        status: 'Terblokir',
      });
    } else if (action === 'unblock') {
      if (sesi.status === 'Diblokir') {
        sesi.status = 'Sedang Ujian';
      }
      sesi.peringatan_admin = '';
      db.Blokir = db.Blokir.map((b) =>
        b.nis === nis && b.id_ujian === idUjian && b.status === 'Terblokir'
          ? { ...b, status: 'Dibuka' }
          : b
      );
    } else if (action === 'add_time') {
      const addMins = payload?.minutes || 10;
      sesi.tambahan_menit += addMins;
      const oldEnd = new Date(sesi.waktu_selesai_target).getTime();
      sesi.waktu_selesai_target = new Date(oldEnd + addMins * 60000).toISOString();
    } else if (action === 'force_finish' && ujian) {
      sesi.status = 'Selesai';
      const hasil = gradeExamSession(db, sesi, ujian, true);
      const existingHasilIdx = db.Hasil_Ujian.findIndex(
        (h) => h.nis === nis && h.id_ujian === idUjian
      );
      if (existingHasilIdx !== -1) {
        db.Hasil_Ujian[existingHasilIdx] = hasil;
      } else {
        db.Hasil_Ujian.unshift(hasil);
      }
      if (pesertaIdx !== -1) {
        db.Peserta[pesertaIdx] = {
          ...db.Peserta[pesertaIdx],
          status_login: 'Offline',
          session_token: '',
        };
      }
    }
    db.Jawaban_Peserta[sesiIdx] = sesi;
  } else if (action === 'unblock') {
    db.Blokir = db.Blokir.map((b) =>
      b.nis === nis && b.id_ujian === idUjian && b.status === 'Terblokir'
        ? { ...b, status: 'Dibuka' }
        : b
    );
  }

  saveDatabase(db);
  return db;
}

export function upsertKelas(kelas: Omit<KelasRecord, 'id_kelas'> & { id_kelas?: string }): CbtDatabase {
  const db = loadDatabase();
  if (kelas.id_kelas) {
    db.Kelas = db.Kelas.map((k) =>
      k.id_kelas === kelas.id_kelas ? { ...k, ...kelas, id_kelas: k.id_kelas } : k
    );
  } else {
    db.Kelas.push({
      ...kelas,
      id_kelas: generateId('KLS'),
    });
  }
  saveDatabase(db);
  return db;
}

export function upsertPeserta(
  peserta: {
    id_peserta?: string;
    nis: string;
    nama: string;
    id_kelas: string;
    nama_kelas: string;
    password?: string;
  }
): CbtDatabase {
  const db = loadDatabase();
  if (peserta.id_peserta) {
    db.Peserta = db.Peserta.map((p) =>
      p.id_peserta === peserta.id_peserta
        ? {
            ...p,
            nis: peserta.nis,
            nama: peserta.nama,
            id_kelas: peserta.id_kelas,
            nama_kelas: peserta.nama_kelas,
            password_hash: peserta.password
              ? hashSyncSimple(peserta.password)
              : p.password_hash,
            password_plain_hint: peserta.password || p.password_plain_hint,
          }
        : p
    );
  } else {
    const rawPass = peserta.password || '123456';
    db.Peserta.push({
      id_peserta: generateId('PST'),
      nis: peserta.nis,
      nama: peserta.nama,
      id_kelas: peserta.id_kelas,
      nama_kelas: peserta.nama_kelas,
      password_hash: hashSyncSimple(rawPass),
      password_plain_hint: rawPass,
      status_login: 'Offline',
      session_token: '',
      last_active: '-',
    });
  }
  saveDatabase(db);
  return db;
}

export function upsertUjian(
  ujian: Omit<UjianRecord, 'id_ujian' | 'token_hash'> & { id_ujian?: string }
): CbtDatabase {
  const db = loadDatabase();
  const cleanToken = (ujian.token_ujian || generateExamToken()).toUpperCase();
  const record: UjianRecord = {
    ...ujian,
    id_ujian: ujian.id_ujian || generateId('UJN'),
    token_ujian: cleanToken,
    token_hash: hashSyncSimple(cleanToken),
  };
  const idx = db.Ujian.findIndex((u) => u.id_ujian === record.id_ujian);
  if (idx !== -1) {
    db.Ujian[idx] = record;
  } else {
    db.Ujian.push(record);
  }
  saveDatabase(db);
  return db;
}

export function upsertSoal(
  soal: Omit<BankSoalRecord, 'id_soal'> & { id_soal?: string }
): CbtDatabase {
  const db = loadDatabase();
  const record: BankSoalRecord = {
    ...soal,
    id_soal: soal.id_soal || generateId('SOL'),
  };
  const idx = db.Bank_Soal.findIndex((s) => s.id_soal === record.id_soal);
  if (idx !== -1) {
    db.Bank_Soal[idx] = record;
  } else {
    db.Bank_Soal.push(record);
  }
  saveDatabase(db);
  return db;
}

export function updatePengaturan(next: PengaturanRecord): CbtDatabase {
  const db = loadDatabase();
  db.Pengaturan = next;
  saveDatabase(db);
  return db;
}

export function addParticipantsBatch(records: PesertaRecord[]): CbtDatabase {
  const db = loadDatabase();
  db.Peserta = [...db.Peserta, ...records];
  saveDatabase(db);
  return db;
}

export function addSoalBatch(records: BankSoalRecord[]): CbtDatabase {
  const db = loadDatabase();
  db.Bank_Soal = [...db.Bank_Soal, ...records];
  saveDatabase(db);
  return db;
}
