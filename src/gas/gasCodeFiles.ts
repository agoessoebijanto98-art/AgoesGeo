export interface GasSourceFile {
  id: string;
  filename: string;
  gasType: 'Server Script' | 'HTML View' | 'CSS Partial' | 'JS Partial' | 'Manifest JSON';
  moduleLabel: string;
  description: string;
  code: string;
}

export interface SheetSchemaDoc {
  sheetName: string;
  purpose: string;
  columns: string[];
  lockStrategy: string;
}

export const SHEET_SCHEMA_DOCS: SheetSchemaDoc[] = [
  {
    sheetName: 'Admin',
    purpose: 'Menyimpan akun administrator dan proktor ujian (hash SHA-256).',
    columns: ['id_admin', 'username', 'password_hash', 'nama_lengkap', 'role'],
    lockStrategy: 'CacheService 10 menit · LockService saat tambah/ubah admin',
  },
  {
    sheetName: 'Kelas',
    purpose: 'Master data kelas peserta di SMAN 1 Pamekasan.',
    columns: ['id_kelas', 'nama_kelas', 'tingkat', 'wali_kelas'],
    lockStrategy: 'CacheService 10 menit · LockService saat CRUD kelas',
  },
  {
    sheetName: 'Peserta',
    purpose: 'Data peserta ujian, kredensial, dan status login 1 perangkat aktif.',
    columns: [
      'id_peserta',
      'nis',
      'nama',
      'id_kelas',
      'nama_kelas',
      'password_hash',
      'status_login',
      'session_token',
      'last_active',
    ],
    lockStrategy: 'LockService.getScriptLock() pada login/reset sesi simultan',
  },
  {
    sheetName: 'Bank_Soal',
    purpose: 'Koleksi butir soal 5 tipe (PG, PG Kompleks, Benar/Salah, Isian, Uraian) + gambar.',
    columns: [
      'id_soal',
      'nomor',
      'pertanyaan',
      'gambar_url',
      'opsi_a',
      'opsi_b',
      'opsi_c',
      'opsi_d',
      'opsi_e',
      'kunci_jawaban',
      'bobot',
      'tipe_soal',
      'kategori',
    ],
    lockStrategy: 'CacheService 10 menit (tanpa kunci_jawaban untuk klien peserta)',
  },
  {
    sheetName: 'Ujian',
    purpose: 'Jadwal ujian, durasi, acak soal/opsi, KKM, dan hash token ujian.',
    columns: [
      'id_ujian',
      'nama_ujian',
      'mata_pelajaran',
      'kelas_peserta_json',
      'tanggal',
      'jam_mulai',
      'jam_selesai',
      'durasi_menit',
      'acak_soal',
      'acak_opsi',
      'tampilkan_nilai',
      'kkm',
      'token_ujian',
      'token_hash',
      'status',
    ],
    lockStrategy: 'CacheService 10 menit · LockService saat generate token/edit jadwal',
  },
  {
    sheetName: 'Jawaban_Peserta',
    purpose: 'Sesi ujian aktif, progres jawaban JSON, tanda ragu, sisa waktu, dan counter pelanggaran.',
    columns: [
      'id_sesi',
      'id_ujian',
      'nis',
      'nama',
      'kelas',
      'status',
      'jawaban_json',
      'ragu_json',
      'urutan_soal_json',
      'waktu_mulai',
      'waktu_selesai_target',
      'tambahan_menit',
      'jumlah_pelanggaran',
      'tab_switch_count',
      'fullscreen_exit_count',
      'last_activity',
      'peringatan_admin',
    ],
    lockStrategy: 'LockService.getScriptLock() wajib pada sync & mutasi progres simultan',
  },
  {
    sheetName: 'Hasil_Ujian',
    purpose: 'Rekap nilai akhir otomatis, jumlah benar/salah, pelanggaran, dan status ketuntasan.',
    columns: [
      'id_hasil',
      'id_ujian',
      'nama_ujian',
      'nis',
      'nama',
      'kelas',
      'nilai',
      'jumlah_benar',
      'jumlah_salah',
      'waktu_mulai',
      'waktu_selesai',
      'jumlah_pelanggaran',
      'status',
      'detail_benar_json',
    ],
    lockStrategy: 'LockService.getScriptLock() saat submit massal 200+ peserta',
  },
  {
    sheetName: 'Log_Pelanggaran',
    purpose: 'Rekam jejak pelanggaran real-time (pindah tab, keluar fullscreen, copy-paste, shortcut).',
    columns: [
      'id_log',
      'timestamp',
      'id_ujian',
      'nama_ujian',
      'nis',
      'nama',
      'kelas',
      'jenis_pelanggaran',
      'jumlah_ke',
    ],
    lockStrategy: 'LockService.getScriptLock() agar log pelanggaran simultan tidak tertimpa',
  },
  {
    sheetName: 'Blokir',
    purpose: 'Daftar akun yang diblokir otomatis/manual beserta alasan dan status pembukaan blokir.',
    columns: [
      'id_blokir',
      'nis',
      'nama',
      'kelas',
      'id_ujian',
      'nama_ujian',
      'alasan',
      'waktu_blokir',
      'status',
    ],
    lockStrategy: 'LockService.getScriptLock() pada auto-blokir dan buka blokir admin',
  },
  {
    sheetName: 'Pengaturan',
    purpose: 'Konfigurasi global sekolah (SMAN 1 Pamekasan) dan batas pelanggaran blokir otomatis.',
    columns: ['kunci', 'nilai'],
    lockStrategy: 'CacheService 10 menit · LockService saat pembaruan aturan',
  },
];

export const GAS_ARCHITECTURE_STAGES = [
  {
    step: '01',
    title: 'Inisialisasi Database Otomatis (10 Sheet)',
    summary:
      'Saat Web App pertama kali dibuka, Code.gs memeriksa PropertiesService. Jika ID Spreadsheet belum ada, fungsi initDatabase() otomatis membuat file "DB_Assist_Aassesment_SMAN1_Pamekasan" di Google Drive Admin, membentuk 10 sheet terstruktur, dan mengisi data awal.',
    sheets: [
      'Admin',
      'Kelas',
      'Peserta',
      'Bank_Soal',
      'Ujian',
      'Jawaban_Peserta',
      'Hasil_Ujian',
      'Log_Pelanggaran',
      'Blokir',
      'Pengaturan',
    ],
  },
  {
    step: '02',
    title: 'Autentikasi & Pemisahan Hak Akses Server',
    summary:
      'Password & token ujian di-hash SHA-256 dengan salt. Peserta hanya diizinkan login pada 1 perangkat aktif (single-session token). Server memvalidasi peran (Admin vs Peserta) dan menghapus kolom kunci_jawaban sebelum soal dikirim ke browser peserta.',
    sheets: ['Admin', 'Peserta', 'Ujian'],
  },
  {
    step: '03',
    title: 'Optimasi Performa 200+ Peserta Bersamaan',
    summary:
      'Data baca intensif (Bank_Soal, Ujian, Pengaturan) disimpan sementara di CacheService (TTL 10 menit). Semua operasi tulis kritis (simpan jawaban, catat pelanggaran, kirim hasil akhir) dibungkus LockService.getScriptLock() serta memakai batch getValues()/setValues().',
    sheets: ['Bank_Soal', 'Jawaban_Peserta', 'Hasil_Ujian'],
  },
  {
    step: '04',
    title: 'Keamanan Proctoring & Pemulihan Refresh',
    summary:
      'Browser mengunci mode layar penuh dan memantau pindah tab, blur, klik kanan, copy/paste, serta shortcut terlarang. Jawaban dan sisa waktu di-cache di localStorage dan di-sync berkala ke sheet Jawaban_Peserta sehingga aman saat refresh atau putus koneksi.',
    sheets: ['Jawaban_Peserta', 'Log_Pelanggaran', 'Blokir'],
  },
];

export const GAS_DEPLOY_STEPS = [
  {
    nomor: 1,
    judul: 'Buka Google Apps Script Baru',
    detail:
      'Buka script.google.com menggunakan akun Google Admin/Sekolah, atau buat Google Sheet kosong lalu klik menu Extensions > Apps Script.',
  },
  {
    nomor: 2,
    judul: 'Salin File Backend (Code.gs)',
    detail:
      'Ganti seluruh isi file Code.gs bawaan dengan kode dari tab "Code.gs" di bawah ini, lalu simpan (Ctrl+S).',
  },
  {
    nomor: 3,
    judul: 'Buat 4 File HTML Pendukung',
    detail:
      'Klik ikon (+) di sebelah "Files" > pilih HTML. Buat masing-masing dengan nama tepat: Index, Styles, Proctoring, dan Scripts (tanpa ekstensi .html di dialog GAS). Tempelkan isi kode masing-masing.',
  },
  {
    nomor: 4,
    judul: 'Aktifkan Manifest (Opsional / Disarankan)',
    detail:
      'Buka Project Settings > centang "Show appsscript.json manifest file in editor", lalu salin isi appsscript.json agar timezone otomatis Asia/Jakarta dan akses Web App terkonfigurasi.',
  },
  {
    nomor: 5,
    judul: 'Deploy sebagai Web App',
    detail:
      'Klik tombol Deploy > New deployment > Pilih jenis "Web app". Isi deskripsi, atur "Execute as: Me (akun admin)" dan "Who has access: Anyone". Klik Deploy, lalu klik "Authorize access" dan izinkan akses Google Sheets & Drive.',
  },
  {
    nomor: 6,
    judul: 'Buka URL Web App & Uji Coba',
    detail:
      'Salin URL Web App berakhiran /exec. Saat pertama kali dibuka, spreadsheet database otomatis dibuat di Google Drive Anda! Login Admin default: admin / admin123. Login Peserta dummy: NIS 2026001 dengan Token CBT26A.',
  },
];

const CODE_GS = `/**
 * ============================================================================
 * ASSIST_AASSESMENT CBT - SMAN 1 PAMEKASAN
 * BACKEND GOOGLE APPS SCRIPT (Code.gs)
 * Database: Google Sheets di Google Drive Admin (Auto-Create 10 Sheets)
 * Optimasi: CacheService + LockService (Baca/Tulis Simultan) + Batch Ops
 * ============================================================================
 */

const APP_SALT = 'SMAN1_PAMEKASAN_CBT_2026';
const PROP_SPREADSHEET_ID = 'CBT_SPREADSHEET_ID';
const CACHE_TTL_SECONDS = 600; // 10 menit cache baca untuk soal & pengaturan

// Daftar 10 Sheet Wajib beserta Header Kolomnya
const SHEET_SCHEMAS = {
  Admin: ['id_admin', 'username', 'password_hash', 'nama_lengkap', 'role'],
  Kelas: ['id_kelas', 'nama_kelas', 'tingkat', 'wali_kelas'],
  Peserta: [
    'id_peserta',
    'nis',
    'nama',
    'id_kelas',
    'nama_kelas',
    'password_hash',
    'status_login',
    'session_token',
    'last_active',
  ],
  Bank_Soal: [
    'id_soal',
    'nomor',
    'pertanyaan',
    'gambar_url',
    'opsi_a',
    'opsi_b',
    'opsi_c',
    'opsi_d',
    'opsi_e',
    'kunci_jawaban',
    'bobot',
    'tipe_soal',
    'kategori',
  ],
  Ujian: [
    'id_ujian',
    'nama_ujian',
    'mata_pelajaran',
    'kelas_peserta_json',
    'tanggal',
    'jam_mulai',
    'jam_selesai',
    'durasi_menit',
    'acak_soal',
    'acak_opsi',
    'tampilkan_nilai',
    'kkm',
    'token_ujian',
    'token_hash',
    'status',
  ],
  Jawaban_Peserta: [
    'id_sesi',
    'id_ujian',
    'nis',
    'nama',
    'kelas',
    'status',
    'jawaban_json',
    'ragu_json',
    'urutan_soal_json',
    'waktu_mulai',
    'waktu_selesai_target',
    'tambahan_menit',
    'jumlah_pelanggaran',
    'tab_switch_count',
    'fullscreen_exit_count',
    'last_activity',
    'peringatan_admin',
  ],
  Hasil_Ujian: [
    'id_hasil',
    'id_ujian',
    'nama_ujian',
    'nis',
    'nama',
    'kelas',
    'nilai',
    'jumlah_benar',
    'jumlah_salah',
    'waktu_mulai',
    'waktu_selesai',
    'jumlah_pelanggaran',
    'status',
    'detail_benar_json',
  ],
  Log_Pelanggaran: [
    'id_log',
    'timestamp',
    'id_ujian',
    'nama_ujian',
    'nis',
    'nama',
    'kelas',
    'jenis_pelanggaran',
    'jumlah_ke',
  ],
  Blokir: [
    'id_blokir',
    'nis',
    'nama',
    'kelas',
    'id_ujian',
    'nama_ujian',
    'alasan',
    'waktu_blokir',
    'status',
  ],
  Pengaturan: ['kunci', 'nilai'],
};

/**
 * Entry Point Web App
 */
function doGet(e) {
  initDatabase(); // Pastikan database 10 sheet siap saat pertama dijalankan
  const template = HtmlService.createTemplateFromFile('Index');
  return template
    .evaluate()
    .setTitle('Assist_Aassesment CBT — SMAN 1 Pamekasan')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Helper untuk menyertakan file HTML/CSS/JS modular (Styles.html, Scripts.html)
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * ============================================================================
 * MODUL 1: DATABASE INITIALIZATION & SPREADSHEET HELPERS
 * ============================================================================
 */
function getSpreadsheet_() {
  const props = PropertiesService.getScriptProperties();
  let ssId = props.getProperty(PROP_SPREADSHEET_ID);
  if (ssId) {
    try {
      return SpreadsheetApp.openById(ssId);
    } catch (err) {
      // Jika file terhapus di Drive, buat ulang
      ssId = null;
    }
  }
  return initDatabase();
}

function initDatabase() {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const props = PropertiesService.getScriptProperties();
    const existingId = props.getProperty(PROP_SPREADSHEET_ID);
    if (existingId) {
      try {
        return SpreadsheetApp.openById(existingId);
      } catch (e) {}
    }

    // Buat Spreadsheet baru di Google Drive Admin
    const ss = SpreadsheetApp.create(
      'DB_Assist_Aassesment_SMAN1_Pamekasan_' +
        Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyyMMdd')
    );
    props.setProperty(PROP_SPREADSHEET_ID, ss.getId());

    const defaultSheet = ss.getSheets()[0];
    const sheetNames = Object.keys(SHEET_SCHEMAS);

    sheetNames.forEach((name, index) => {
      let sh = index === 0 ? defaultSheet : ss.insertSheet(name);
      if (index === 0) sh.setName(name);
      const headers = SHEET_SCHEMAS[name];
      sh.getRange(1, 1, 1, headers.length)
        .setValues([headers])
        .setFontWeight('bold')
        .setBackground('#1E293B')
        .setFontColor('#FFFFFF');
      sh.setFrozenRows(1);
    });

    // Isi Data Dummy Awal untuk Uji Coba
    seedInitialData_(ss);
    return ss;
  } finally {
    lock.releaseLock();
  }
}

function seedInitialData_(ss) {
  const today = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');

  // 1. Admin Default: admin / admin123
  ss.getSheetByName('Admin').appendRow([
    'ADM-001',
    'admin',
    hashSHA256_('admin123'),
    'Drs. Hendra Wijaya, M.Pd',
    'Super Admin',
  ]);

  // 2. Kelas Contoh
  ss.getSheetByName('Kelas')
    .getRange(2, 1, 3, 4)
    .setValues([
      ['KLS-01', 'XII IPA 1', 'XII', 'Budi Santoso, S.Pd'],
      ['KLS-02', 'XII IPA 2', 'XII', 'Ratna Dewi, M.Si'],
      ['KLS-03', 'XII IPS 1', 'XII', 'Agus Setiawan, S.E'],
    ]);

  // 3. Peserta Contoh (Password default: 123456)
  const pwdHash = hashSHA256_('123456');
  ss.getSheetByName('Peserta')
    .getRange(2, 1, 4, 9)
    .setValues([
      ['PST-001', '2026001', 'Alya Putri Maharani', 'KLS-01', 'XII IPA 1', pwdHash, 'Offline', '', '-'],
      ['PST-002', '2026002', 'Bagas Pratama Putra', 'KLS-01', 'XII IPA 1', pwdHash, 'Offline', '', '-'],
      ['PST-003', '2026003', 'Citra Kirana Lestari', 'KLS-02', 'XII IPA 2', pwdHash, 'Offline', '', '-'],
      ['PST-004', '2026004', 'Hafiz Maulana', 'KLS-03', 'XII IPS 1', pwdHash, 'Offline', '', '-'],
    ]);

  // 4. Bank Soal Contoh (5 Tipe Soal)
  ss.getSheetByName('Bank_Soal')
    .getRange(2, 1, 5, 13)
    .setValues([
      ['SOL-01', 1, 'Jika 2x + 6 = 18, berapakah nilai x?', '', '4', '5', '6', '7', '8', 'C', 20, 'PG', 'Matematika'],
      ['SOL-02', 2, 'Manakah yang merupakan bilangan prima? (Pilih lebih dari satu)', '', '9', '11', '15', '17', '21', 'B,D', 20, 'PG_KOMPLEKS', 'Matematika'],
      ['SOL-03', 3, 'Air murni mendidih pada suhu 100°C pada tekanan 1 atm.', '', 'Benar', 'Salah', '', '', '', 'BENAR', 20, 'BENAR_SALAH', 'Matematika'],
      ['SOL-04', 4, 'Simbol kimia unsur Emas adalah...', '', '', '', '', '', '', 'Au', 20, 'ISIAN_SINGKAT', 'Matematika'],
      ['SOL-05', 5, 'Jelaskan perbedaan rangkaian seri dan paralel secara singkat!', '', '', '', '', '', '', 'arus,tegangan,cabang', 20, 'URAIAN', 'Matematika'],
    ]);

  // 5. Ujian Aktif Contoh (Token: CBT26A)
  ss.getSheetByName('Ujian').appendRow([
    'UJN-001',
    'Penilaian Akhir Semester — Matematika',
    'Matematika',
    JSON.stringify(['XII IPA 1', 'XII IPA 2', 'XII IPS 1']),
    today,
    '07:00',
    '23:59',
    60,
    true,
    true,
    true,
    75,
    'CBT26A',
    hashSHA256_('CBT26A'),
    'Aktif',
  ]);

  // 6. Pengaturan & Aturan Blokir Default SMAN 1 Pamekasan
  ss.getSheetByName('Pengaturan')
    .getRange(2, 1, 5, 2)
    .setValues([
      ['nama_sekolah', 'SMAN 1 Pamekasan'],
      ['max_pindah_tab', '3'],
      ['max_keluar_fullscreen', '2'],
      ['max_total_pelanggaran', '5'],
      ['interval_autosave_detik', '10'],
    ]);
}

/**
 * Wrapper LockService terpusat untuk menjamin operasi baca/tulis simultan aman
 * dari race condition saat diakses 200+ peserta bersamaan.
 */
function withScriptLock_(callback, timeoutMs) {
  const lock = LockService.getScriptLock();
  const acquired = lock.tryLock(timeoutMs || 15000);
  if (!acquired) {
    throw new Error('Server sedang padat (lock timeout). Silakan coba sesaat lagi.');
  }
  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}

/**
 * Operasi baca sheet dengan LockService (untuk data real-time tanpa cache)
 */
function readSheetLocked_(sheetName) {
  return withScriptLock_(function () {
    return readSheetObjects_(sheetName, false);
  });
}

/**
 * Operasi tambah baris aman (LockService + SpreadsheetApp.flush)
 */
function appendRowLocked_(sheetName, rowArray) {
  return withScriptLock_(function () {
    const ss = getSpreadsheet_();
    const sh = ss.getSheetByName(sheetName);
    sh.appendRow(rowArray);
    SpreadsheetApp.flush();
    invalidateCache_(sheetName);
    return true;
  });
}

/**
 * Membaca seluruh isi sheet menjadi array of objects (dengan opsi CacheService)
 */
function readSheetObjects_(sheetName, useCache) {
  const cache = CacheService.getScriptCache();
  const cacheKey = 'SHEET_' + sheetName;
  if (useCache) {
    const cached = cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  }
  const ss = getSpreadsheet_();
  const sh = ss.getSheetByName(sheetName);
  const values = sh.getDataRange().getValues();
  if (values.length <= 1) return [];
  const headers = values[0];
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = values[i][j];
    }
    obj._rowIndex = i + 1;
    rows.push(obj);
  }
  if (useCache && rows.length > 0) {
    const jsonStr = JSON.stringify(rows);
    if (jsonStr.length < 95000) {
      cache.put(cacheKey, jsonStr, CACHE_TTL_SECONDS);
    }
  }
  return rows;
}

function invalidateCache_(sheetName) {
  CacheService.getScriptCache().remove('SHEET_' + sheetName);
}

/**
 * ============================================================================
 * MODUL 2: KEAMANAN, HASHING SHA-256 & OTORISASI PERAN
 * ============================================================================
 */
function hashSHA256_(plainText) {
  const rawHash = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    APP_SALT + '::' + String(plainText).trim(),
    Utilities.Charset.UTF_8
  );
  return rawHash.map((b) => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}

function generateRandomCode_(len) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let res = '';
  for (let i = 0; i < len; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

function verifyAdminSession_(token) {
  const cache = CacheService.getScriptCache();
  const data = cache.get('ADM_SES_' + token);
  if (!data) throw new Error('Akses ditolak: Sesi Admin tidak valid atau berakhir.');
  return JSON.parse(data);
}

function verifyPesertaSession_(nis, token) {
  const list = readSheetObjects_('Peserta', false);
  const found = list.find((p) => String(p.nis) === String(nis) && String(p.session_token) === String(token));
  if (!found) throw new Error('Akses ditolak: Sesi peserta tidak valid atau telah direset oleh Admin.');
  return found;
}

/**
 * ============================================================================
 * MODUL 3: AUTENTIKASI LOGIN ADMIN & PESERTA
 * ============================================================================
 */
function loginAdmin(username, password) {
  const admins = readSheetObjects_('Admin', true);
  const pwdHash = hashSHA256_(password);
  const found = admins.find(
    (a) => String(a.username).toLowerCase() === String(username).trim().toLowerCase() && a.password_hash === pwdHash
  );
  if (!found) return { ok: false, message: 'Username atau password admin salah.' };

  const token = 'ADM-' + Utilities.getUuid();
  CacheService.getScriptCache().put(
    'ADM_SES_' + token,
    JSON.stringify({ id_admin: found.id_admin, username: found.username, nama_lengkap: found.nama_lengkap }),
    21600 // 6 jam
  );
  return {
    ok: true,
    session: { role: 'admin', sessionToken: token, namaLengkap: found.nama_lengkap, username: found.username },
  };
}

function loginPeserta(nis, tokenUjian) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const cleanNis = String(nis).trim();
    const cleanToken = String(tokenUjian).trim().toUpperCase();
    const ss = getSpreadsheet_();

    const pesertaList = readSheetObjects_('Peserta', false);
    const peserta = pesertaList.find((p) => String(p.nis) === cleanNis);
    if (!peserta) return { ok: false, message: 'NIS tidak terdaftar di sistem.' };

    // Validasi single-device login
    if (peserta.status_login === 'Online' && peserta.session_token) {
      return {
        ok: false,
        message: 'Akun sedang login di perangkat lain! Hubungi admin untuk Reset Login.',
      };
    }

    const ujianList = readSheetObjects_('Ujian', true);
    const tokenHash = hashSHA256_(cleanToken);
    const ujian = ujianList.find(
      (u) => u.status === 'Aktif' && (u.token_hash === tokenHash || String(u.token_ujian).toUpperCase() === cleanToken)
    );
    if (!ujian) return { ok: false, message: 'Token ujian tidak valid atau ujian belum aktif.' };

    const kelasArr = JSON.parse(ujian.kelas_peserta_json || '[]');
    if (kelasArr.indexOf(peserta.nama_kelas) === -1) {
      return { ok: false, message: 'Kelas Anda (' + peserta.nama_kelas + ') tidak terdaftar pada ujian ini.' };
    }

    const blokirList = readSheetObjects_('Blokir', false);
    const isBlocked = blokirList.find(
      (b) => String(b.nis) === cleanNis && b.id_ujian === ujian.id_ujian && b.status === 'Terblokir'
    );
    if (isBlocked) {
      return { ok: false, message: 'Akun Anda DIBLOKIR: ' + isBlocked.alasan };
    }

    const newSessionToken = 'PST-' + Utilities.getUuid();
    const shPeserta = ss.getSheetByName('Peserta');
    shPeserta.getRange(peserta._rowIndex, 7, 1, 3).setValues([['Online', newSessionToken, new Date().toISOString()]]);

    return {
      ok: true,
      session: {
        role: 'peserta',
        sessionToken: newSessionToken,
        nis: cleanNis,
        namaLengkap: peserta.nama,
        kelas: peserta.nama_kelas,
        idUjianTarget: ujian.id_ujian,
      },
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * ============================================================================
 * MODUL 4: OPERASI ADMIN (CRUD, BANK SOAL, MONITORING, BLOKIR, LAPORAN)
 * ============================================================================
 */
function getAdminBootstrapData(adminToken) {
  verifyAdminSession_(adminToken);
  const ss = getSpreadsheet_();
  return {
    spreadsheetUrl: ss.getUrl(),
    kelas: readSheetObjects_('Kelas', true),
    peserta: readSheetObjects_('Peserta', false),
    bankSoal: readSheetObjects_('Bank_Soal', true),
    ujian: readSheetObjects_('Ujian', true),
    sesiAktif: readSheetObjects_('Jawaban_Peserta', false),
    hasil: readSheetObjects_('Hasil_Ujian', false),
    logPelanggaran: readSheetObjects_('Log_Pelanggaran', false),
    blokir: readSheetObjects_('Blokir', false),
    pengaturan: readSheetObjects_('Pengaturan', true),
  };
}

function getMonitoringData(adminToken) {
  verifyAdminSession_(adminToken);
  return {
    sesiAktif: readSheetObjects_('Jawaban_Peserta', false),
    peserta: readSheetObjects_('Peserta', false),
    blokir: readSheetObjects_('Blokir', false),
    timestamp: new Date().toISOString(),
  };
}

function adminActionOnPeserta(adminToken, action, nis, idUjian, payload) {
  verifyAdminSession_(adminToken);
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const ss = getSpreadsheet_();
    const pesertaList = readSheetObjects_('Peserta', false);
    const peserta = pesertaList.find((p) => String(p.nis) === String(nis));
    const sesiList = readSheetObjects_('Jawaban_Peserta', false);
    const sesi = sesiList.find((s) => String(s.nis) === String(nis) && s.id_ujian === idUjian);

    if (action === 'reset_login' && peserta) {
      ss.getSheetByName('Peserta').getRange(peserta._rowIndex, 7, 1, 2).setValues([['Offline', '']]);
    }
    if (sesi) {
      const shSesi = ss.getSheetByName('Jawaban_Peserta');
      if (action === 'warn') {
        shSesi.getRange(sesi._rowIndex, 17).setValue(payload.message || 'Harap fokus pada layar ujian!');
      } else if (action === 'block') {
        shSesi.getRange(sesi._rowIndex, 6).setValue('Diblokir');
        ss.getSheetByName('Blokir').appendRow([
          'BLK-' + Date.now(),
          nis,
          sesi.nama,
          sesi.kelas,
          idUjian,
          idUjian,
          payload.message || 'Blokir manual oleh Admin',
          new Date().toISOString(),
          'Terblokir',
        ]);
      } else if (action === 'unblock') {
        shSesi.getRange(sesi._rowIndex, 6).setValue('Sedang Ujian');
        const blokirList = readSheetObjects_('Blokir', false);
        const shBlokir = ss.getSheetByName('Blokir');
        blokirList.forEach((b) => {
          if (String(b.nis) === String(nis) && b.id_ujian === idUjian && b.status === 'Terblokir') {
            shBlokir.getRange(b._rowIndex, 9).setValue('Dibuka');
          }
        });
      } else if (action === 'add_time') {
        const extra = Number(payload.minutes || 10);
        const oldEnd = new Date(sesi.waktu_selesai_target).getTime();
        const newEnd = new Date(oldEnd + extra * 60000).toISOString();
        shSesi.getRange(sesi._rowIndex, 11, 1, 2).setValues([[newEnd, Number(sesi.tambahan_menit || 0) + extra]]);
      } else if (action === 'force_finish') {
        gradeAndFinalize_(ss, sesi, true);
      }
    }
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

/**
 * ============================================================================
 * MODUL 5: OPERASI PESERTA (MULAI, AUTO-SAVE BATCH, PROCTORING, SELESAI)
 * ============================================================================
 */
function startExamSession(nis, sessionToken, idUjian) {
  const peserta = verifyPesertaSession_(nis, sessionToken);
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const ss = getSpreadsheet_();
    const ujian = readSheetObjects_('Ujian', true).find((u) => u.id_ujian === idUjian);
    if (!ujian) throw new Error('Ujian tidak ditemukan.');

    // Ambil soal TANPA kunci jawaban (keamanan sisi server)
    const rawSoal = readSheetObjects_('Bank_Soal', true);
    const safeSoal = rawSoal.map((s) => ({
      id_soal: s.id_soal,
      nomor: s.nomor,
      pertanyaan: s.pertanyaan,
      gambar_url: s.gambar_url,
      opsi_a: s.opsi_a,
      opsi_b: s.opsi_b,
      opsi_c: s.opsi_c,
      opsi_d: s.opsi_d,
      opsi_e: s.opsi_e,
      tipe_soal: s.tipe_soal,
      kategori: s.kategori,
    }));

    const sesiList = readSheetObjects_('Jawaban_Peserta', false);
    let sesi = sesiList.find((j) => String(j.nis) === String(nis) && j.id_ujian === idUjian);

    if (!sesi) {
      let urutanIds = safeSoal.map((s) => s.id_soal);
      if (ujian.acak_soal === true || ujian.acak_soal === 'TRUE') {
        urutanIds.sort(() => Math.random() - 0.5);
      }
      const now = new Date();
      const targetEnd = new Date(now.getTime() + Number(ujian.durasi_menit) * 60000);
      const idSesi = 'SES-' + Date.now() + '-' + nis;

      const row = [
        idSesi,
        idUjian,
        nis,
        peserta.nama,
        peserta.nama_kelas,
        'Sedang Ujian',
        '{}',
        '{}',
        JSON.stringify(urutanIds),
        now.toISOString(),
        targetEnd.toISOString(),
        0,
        0,
        0,
        0,
        now.toISOString(),
        '',
      ];
      ss.getSheetByName('Jawaban_Peserta').appendRow(row);
      sesi = {
        id_sesi: idSesi,
        id_ujian: idUjian,
        nis: nis,
        status: 'Sedang Ujian',
        jawaban_json: '{}',
        ragu_json: '{}',
        urutan_soal_json: JSON.stringify(urutanIds),
        waktu_selesai_target: targetEnd.toISOString(),
        jumlah_pelanggaran: 0,
        peringatan_admin: '',
      };
    }

    return { ok: true, ujian: ujian, sesi: sesi, soalList: safeSoal };
  } finally {
    lock.releaseLock();
  }
}

function syncExamProgress(nis, sessionToken, idUjian, jawabanObj, raguObj) {
  verifyPesertaSession_(nis, sessionToken);
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return { ok: false, retry: true };
  }
  try {
    const ss = getSpreadsheet_();
    const sesiList = readSheetObjects_('Jawaban_Peserta', false);
    const sesi = sesiList.find((j) => String(j.nis) === String(nis) && j.id_ujian === idUjian);
    if (!sesi) return { ok: false, message: 'Sesi tidak ditemukan' };

    if (sesi.status === 'Sedang Ujian') {
      const sh = ss.getSheetByName('Jawaban_Peserta');
      sh.getRange(sesi._rowIndex, 7, 1, 2).setValues([[JSON.stringify(jawabanObj), JSON.stringify(raguObj)]]);
      sh.getRange(sesi._rowIndex, 16).setValue(new Date().toISOString());
    }

    return {
      ok: true,
      status: sesi.status,
      waktu_selesai_target: sesi.waktu_selesai_target,
      peringatan_admin: sesi.peringatan_admin,
      jumlah_pelanggaran: sesi.jumlah_pelanggaran,
    };
  } finally {
    lock.releaseLock();
  }
}

function reportViolation(nis, sessionToken, idUjian, jenis, category) {
  verifyPesertaSession_(nis, sessionToken);
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const ss = getSpreadsheet_();
    const sesi = readSheetObjects_('Jawaban_Peserta', false).find(
      (j) => String(j.nis) === String(nis) && j.id_ujian === idUjian
    );
    if (!sesi) return { ok: false };

    const pengList = readSheetObjects_('Pengaturan', true);
    const getRule = (k, def) => {
      const f = pengList.find((p) => p.kunci === k);
      return f ? Number(f.nilai) : def;
    };

    const nextTotal = Number(sesi.jumlah_pelanggaran || 0) + 1;
    const nextTab = Number(sesi.tab_switch_count || 0) + (category === 'tab' ? 1 : 0);
    const nextFs = Number(sesi.fullscreen_exit_count || 0) + (category === 'fullscreen' ? 1 : 0);

    ss.getSheetByName('Log_Pelanggaran').appendRow([
      'LOG-' + Date.now(),
      new Date().toISOString(),
      idUjian,
      idUjian,
      nis,
      sesi.nama,
      sesi.kelas,
      jenis,
      nextTotal,
    ]);

    let blockReason = '';
    if (nextTab > getRule('max_pindah_tab', 3)) blockReason = 'Melebihi batas pindah tab';
    else if (nextFs > getRule('max_keluar_fullscreen', 2)) blockReason = 'Melebihi batas keluar layar penuh';
    else if (nextTotal > getRule('max_total_pelanggaran', 5)) blockReason = 'Melebihi batas total pelanggaran';

    const shSesi = ss.getSheetByName('Jawaban_Peserta');
    shSesi
      .getRange(sesi._rowIndex, 13, 1, 4)
      .setValues([[nextTotal, nextTab, nextFs, new Date().toISOString()]]);

    if (blockReason) {
      shSesi.getRange(sesi._rowIndex, 6).setValue('Diblokir');
      ss.getSheetByName('Blokir').appendRow([
        'BLK-' + Date.now(),
        nis,
        sesi.nama,
        sesi.kelas,
        idUjian,
        idUjian,
        blockReason,
        new Date().toISOString(),
        'Terblokir',
      ]);
      return { ok: true, blocked: true, reason: blockReason, count: nextTotal };
    }

    return { ok: true, blocked: false, count: nextTotal };
  } finally {
    lock.releaseLock();
  }
}

function finishExam(nis, sessionToken, idUjian, jawabanObj, raguObj) {
  verifyPesertaSession_(nis, sessionToken);
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const ss = getSpreadsheet_();
    const sesi = readSheetObjects_('Jawaban_Peserta', false).find(
      (j) => String(j.nis) === String(nis) && j.id_ujian === idUjian
    );
    if (!sesi) throw new Error('Sesi ujian tidak ditemukan.');
    sesi.jawaban_json = JSON.stringify(jawabanObj || {});
    sesi.ragu_json = JSON.stringify(raguObj || {});
    ss.getSheetByName('Jawaban_Peserta').getRange(sesi._rowIndex, 7, 1, 2).setValues([[sesi.jawaban_json, sesi.ragu_json]]);

    const hasil = gradeAndFinalize_(ss, sesi, false);
    const peserta = readSheetObjects_('Peserta', false).find((p) => String(p.nis) === String(nis));
    if (peserta) {
      ss.getSheetByName('Peserta').getRange(peserta._rowIndex, 7, 1, 2).setValues([['Offline', '']]);
    }
    return { ok: true, hasil: hasil };
  } finally {
    lock.releaseLock();
  }
}

function gradeAndFinalize_(ss, sesi, forced) {
  const bankSoal = readSheetObjects_('Bank_Soal', true);
  const ujian = readSheetObjects_('Ujian', true).find((u) => u.id_ujian === sesi.id_ujian);
  const jawabanMap = JSON.parse(sesi.jawaban_json || '{}');

  let totalBobot = 0;
  let earnedBobot = 0;
  let benar = 0;
  let salah = 0;
  const detailMap = {};

  bankSoal.forEach((soal) => {
    const bobot = Number(soal.bobot || 10);
    totalBobot += bobot;
    const ans = String(jawabanMap[soal.id_soal] || '').trim();
    const key = String(soal.kunci_jawaban || '').trim();
    let isRight = false;

    if (soal.tipe_soal === 'PG' || soal.tipe_soal === 'BENAR_SALAH') {
      isRight = ans.toUpperCase() === key.toUpperCase();
    } else if (soal.tipe_soal === 'PG_KOMPLEKS') {
      const a = ans.toUpperCase().split(',').filter(Boolean).sort().join(',');
      const k = key.toUpperCase().split(',').filter(Boolean).sort().join(',');
      isRight = a.length > 0 && a === k;
    } else if (soal.tipe_soal === 'ISIAN_SINGKAT') {
      isRight = ans.toLowerCase() === key.toLowerCase();
    } else if (soal.tipe_soal === 'URAIAN') {
      const kws = key.toLowerCase().split(',').filter(Boolean);
      const hit = kws.filter((w) => ans.toLowerCase().indexOf(w) !== -1).length;
      isRight = kws.length > 0 ? hit >= Math.ceil(kws.length / 2) : ans.length >= 10;
    }

    detailMap[soal.id_soal] = isRight;
    if (isRight) {
      benar++;
      earnedBobot += bobot;
    } else {
      salah++;
    }
  });

  const nilai = totalBobot > 0 ? Math.round((earnedBobot / totalBobot) * 100) : 0;
  const kkm = ujian ? Number(ujian.kkm || 75) : 75;
  const status = forced ? 'Dipaksa Selesai' : nilai >= kkm ? 'Tuntas' : 'Belum Tuntas';

  ss.getSheetByName('Jawaban_Peserta').getRange(sesi._rowIndex, 6).setValue('Selesai');
  const hasilRow = [
    'HSL-' + Date.now(),
    sesi.id_ujian,
    ujian ? ujian.nama_ujian : sesi.id_ujian,
    sesi.nis,
    sesi.nama,
    sesi.kelas,
    nilai,
    benar,
    salah,
    sesi.waktu_mulai,
    new Date().toISOString(),
    sesi.jumlah_pelanggaran || 0,
    status,
    JSON.stringify(detailMap),
  ];
  ss.getSheetByName('Hasil_Ujian').appendRow(hasilRow);

  return {
    nilai: nilai,
    jumlah_benar: benar,
    jumlah_salah: salah,
    status: status,
    tampilkan_nilai: ujian ? ujian.tampilkan_nilai === true || ujian.tampilkan_nilai === 'TRUE' : true,
  };
}
`;

const INDEX_HTML = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Assist_Aassesment CBT — SMAN 1 Pamekasan</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <?!= include('Styles'); ?>
</head>
<body>
  <div id="app">
    <!-- VIEW 1: HALAMAN LOGIN -->
    <section id="view-login" class="login-wrapper">
      <div class="login-card">
        <div class="brand-header" style="display:flex;align-items:center;gap:12px;">
          <img id="school-logo-login" src="https://lh3.googleusercontent.com/d/ID_FILE_LOGO_SMANSA_DI_DRIVE" alt="Logo SMAN 1 Pamekasan" style="width:44px;height:52px;object-fit:contain;" onerror="this.style.display='none'" />
          <div>
            <h1>Assist_Aassesment CBT</h1>
            <p>SMAN 1 Pamekasan · Google Apps Script & Google Sheets</p>
          </div>
        </div>

        <div class="role-tabs">
          <button type="button" class="tab-btn active" onclick="switchLoginRole('peserta')">Peserta Ujian</button>
          <button type="button" class="tab-btn" onclick="switchLoginRole('admin')">Admin / Pengawas</button>
        </div>

        <form id="form-login-peserta" onsubmit="handleLoginPeserta(event)">
          <div class="form-group">
            <label for="inp-nis">NIS / ID Peserta</label>
            <input type="text" id="inp-nis" placeholder="Contoh: 2026001" required />
          </div>
          <div class="form-group">
            <label for="inp-token">Token Ujian</label>
            <input type="text" id="inp-token" placeholder="Contoh: CBT26A" style="text-transform:uppercase;font-family:'JetBrains Mono',monospace;" required />
          </div>
          <button type="submit" class="btn-primary full-width">Masuk Ruang Ujian</button>
        </form>

        <form id="form-login-admin" class="hidden" onsubmit="handleLoginAdmin(event)">
          <div class="form-group">
            <label for="inp-user">Username Admin</label>
            <input type="text" id="inp-user" placeholder="admin" required />
          </div>
          <div class="form-group">
            <label for="inp-pass">Kata Sandi</label>
            <input type="password" id="inp-pass" placeholder="••••••••" required />
          </div>
          <button type="submit" class="btn-primary full-width">Masuk Dashboard Admin</button>
        </form>

        <div id="login-error" class="alert-error hidden"></div>
      </div>
    </section>

    <!-- VIEW 2: PORTAL ADMIN -->
    <section id="view-admin" class="hidden admin-shell">
      <aside class="sidebar">
        <div class="sidebar-brand">Assist_Aassesment CBT<div style="font-size:12px;font-weight:500;color:#64748b;">SMAN 1 Pamekasan</div></div>
        <nav class="sidebar-nav">
          <button onclick="showAdminTab('dashboard')" class="nav-item active">Dashboard</button>
          <button onclick="showAdminTab('monitoring')" class="nav-item">Monitoring Live</button>
          <button onclick="showAdminTab('soal')" class="nav-item">Bank Soal</button>
          <button onclick="showAdminTab('hasil')" class="nav-item">Hasil & Laporan</button>
        </nav>
        <div class="sidebar-footer">
          <a id="link-spreadsheet" href="#" target="_blank" class="btn-outline full-width">Buka Spreadsheet DB</a>
          <button onclick="logoutApp()" class="btn-danger-text full-width">Keluar</button>
        </div>
      </aside>
      <main class="admin-main">
        <header class="topbar">
          <h2 id="admin-page-title">Dashboard Ringkasan</h2>
          <span id="admin-user-label" class="muted-meta"></span>
        </header>
        <div id="admin-content" class="content-area"></div>
      </main>
    </section>

    <!-- VIEW 3: HALAMAN UJIAN PESERTA -->
    <section id="view-exam" class="hidden exam-shell">
      <header class="exam-topbar">
        <div>
          <strong id="exam-title">Ujian Aktif</strong>
          <div class="muted-meta" id="exam-student-info"></div>
        </div>
        <div class="exam-controls">
          <div class="timer-box" id="exam-timer">00:00</div>
          <button onclick="confirmFinishExam()" class="btn-primary">Selesai Ujian</button>
        </div>
      </header>
      <div class="exam-grid">
        <div class="question-pane">
          <div class="question-meta">
            <span id="q-number-label">Soal 1</span>
            <span id="q-type-label" class="muted-meta"></span>
          </div>
          <div id="q-image-box"></div>
          <div id="q-text" class="question-text"></div>
          <div id="q-options" class="options-list"></div>
          <div class="question-actions">
            <button onclick="prevQuestion()" class="btn-outline">Sebelumnya</button>
            <button onclick="toggleRagu()" id="btn-ragu" class="btn-warning">Tandai Ragu-ragu</button>
            <button onclick="nextQuestion()" class="btn-primary">Selanjutnya</button>
          </div>
        </div>
        <aside class="nav-pane">
          <h3>Navigasi Soal</h3>
          <div id="q-nav-grid" class="q-nav-grid"></div>
        </aside>
      </div>
    </section>
  </div>

  <!-- MODAL PERINGATAN PELANGGARAN -->
  <div id="modal-warning" class="modal-backdrop hidden">
    <div class="modal-box">
      <h3 id="warn-title">Peringatan Keamanan Ujian</h3>
      <p id="warn-message"></p>
      <button onclick="acknowledgeWarningAndFullscreen()" class="btn-primary">Kembali ke Layar Penuh</button>
    </div>
  </div>

  <?!= include('Proctoring'); ?>
  <?!= include('Scripts'); ?>
</body>
</html>
`;

const PROCTORING_HTML = `<script>
/**
 * ============================================================================
 * MODUL KEAMANAN CLIENT-SIDE (Proctoring.html)
 * Assist_Aassesment CBT — SMAN 1 Pamekasan
 *
 * Fitur:
 * 1. Deteksi perpindahan tab / keluar fokus jendela (visibilitychange & blur)
 * 2. Deteksi keluar dari mode layar penuh (fullscreenchange)
 * 3. Pencegahan & deteksi Copy, Cut, Paste, Klik Kanan, serta Shortcut Terlarang
 * 4. Pengiriman pelanggaran real-time ke server (Code.gs -> Log_Pelanggaran)
 * 5. Pop-up peringatan otomatis kepada peserta + penguncian layar jika diblokir
 * ============================================================================
 */
const CbtProctoring = (function () {
  let _config = {
    nis: '',
    sessionToken: '',
    idUjian: '',
    maxTotal: 5,
    isExamActive: false,
    isLocked: false,
  };

  let _lastViolationMs = 0;
  let _fullscreenEntered = false;
  let _listenersAttached = false;

  function init(options) {
    _config = Object.assign(_config, options, { isExamActive: true, isLocked: false });
    requestFullscreenSafe();
    if (!_listenersAttached) {
      attachListeners();
      _listenersAttached = true;
    }
  }

  function stop() {
    _config.isExamActive = false;
  }

  function requestFullscreenSafe() {
    const el = document.documentElement;
    if (el.requestFullscreen) {
      el.requestFullscreen()
        .then(function () {
          _fullscreenEntered = true;
        })
        .catch(function () {});
    }
  }

  function attachListeners() {
    // 1. Deteksi Pindah Tab / Minimize Browser
    document.addEventListener('visibilitychange', function () {
      if (_config.isExamActive && document.hidden) {
        reportRealtime('Berpindah Tab / Minimize Browser', 'tab');
      }
    });

    // 2. Deteksi Keluar Fokus Jendela Aplikasi (mis. Alt+Tab / split screen)
    window.addEventListener('blur', function () {
      if (_config.isExamActive) {
        reportRealtime('Keluar Fokus Jendela Ujian', 'tab');
      }
    });

    // 3. Deteksi Keluar Mode Layar Penuh (Fullscreen)
    document.addEventListener('fullscreenchange', function () {
      if (_config.isExamActive && _fullscreenEntered && !document.fullscreenElement) {
        reportRealtime('Keluar dari Mode Layar Penuh (Fullscreen)', 'fullscreen');
      }
    });

    // 4. Blokir & Catat Upaya Copy / Cut / Paste
    ['copy', 'cut', 'paste'].forEach(function (evtName) {
      document.addEventListener(evtName, function (e) {
        if (!_config.isExamActive) return;
        e.preventDefault();
        reportRealtime('Percobaan ' + evtName.toUpperCase() + ' Konten', 'other');
      });
    });

    // 5. Blokir Klik Kanan
    document.addEventListener('contextmenu', function (e) {
      if (!_config.isExamActive) return;
      e.preventDefault();
      reportRealtime('Klik Kanan Diblokir', 'other');
    });

    // 6. Blokir Shortcut Keyboard Terlarang (DevTools, Print, Copy-Paste, View Source)
    document.addEventListener('keydown', function (e) {
      if (!_config.isExamActive) return;
      const key = (e.key || '').toLowerCase();
      const ctrlOrMeta = e.ctrlKey || e.metaKey;
      const isForbidden =
        e.key === 'F12' ||
        e.key === 'PrintScreen' ||
        (ctrlOrMeta && ['c', 'v', 'x', 'u', 'p'].indexOf(key) !== -1) ||
        (ctrlOrMeta && e.shiftKey && ['i', 'j', 'c'].indexOf(key) !== -1);

      if (isForbidden) {
        e.preventDefault();
        reportRealtime('Shortcut Keyboard Terlarang (' + e.key + ')', 'other');
      }
    });
  }

  /**
   * Kirim pelanggaran real-time ke server Code.gs -> LockService -> Log_Pelanggaran
   * Dilengkapi debounce 1.200ms agar event blur + visibilitychange tidak dobel.
   */
  function reportRealtime(jenisPelanggaran, kategori) {
    if (!_config.isExamActive || _config.isLocked) return;
    const now = Date.now();
    if (now - _lastViolationMs < 1200) return;
    _lastViolationMs = now;

    // Tampilkan modal peringatan instan agar peserta langsung mendapat umpan balik
    showWarningModal(
      'Peringatan Keamanan Ujian',
      'Terdeteksi: ' + jenisPelanggaran + '. Sedang mencatat ke Log_Pelanggaran server...',
      false
    );

    google.script.run
      .withSuccessHandler(function (res) {
        if (!res || !res.ok) return;
        if (res.blocked) {
          _config.isLocked = true;
          showWarningModal(
            'AKUN DIBLOKIR OTOMATIS',
            'Pelanggaran "' + jenisPelanggaran + '" melebihi batas (' + res.reason + '). Layar ujian dikunci hingga Pengawas SMAN 1 Pamekasan membuka blokir.',
            true
          );
        } else {
          const sisa = Math.max(0, _config.maxTotal - Number(res.count || 0));
          showWarningModal(
            'Peringatan Pelanggaran Ke-' + res.count,
            'Terdeteksi: ' + jenisPelanggaran + '. Kejadian tercatat di sheet Log_Pelanggaran. Sisa toleransi: ' + sisa + ' kali.',
            false
          );
        }
      })
      .withFailureHandler(function (err) {
        console.error('Gagal mengirim log pelanggaran:', err);
      })
      .reportViolation(
        _config.nis,
        _config.sessionToken,
        _config.idUjian,
        jenisPelanggaran,
        kategori
      );
  }

  function showWarningModal(title, message, locked) {
    const modal = document.getElementById('modal-warning');
    const titleEl = document.getElementById('warn-title');
    const msgEl = document.getElementById('warn-message');
    if (!modal || !titleEl || !msgEl) return;

    titleEl.textContent = title;
    msgEl.textContent = message;
    const actionBtn = modal.querySelector('button');
    if (actionBtn) {
      actionBtn.style.display = locked ? 'none' : 'inline-block';
    }
    modal.classList.remove('hidden');
  }

  return {
    init: init,
    stop: stop,
    requestFullscreenSafe: requestFullscreenSafe,
    reportRealtime: reportRealtime,
  };
})();
</script>
`;

const STYLES_HTML = `<style>
  :root {
    --bg: #f8fafc;
    --surface: #ffffff;
    --border: #e2e8f0;
    --text: #0f172a;
    --muted: #64748b;
    --accent: #1d4ed8;
    --danger: #dc2626;
    --warning: #d97706;
    --success: #059669;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.5;
  }
  .hidden { display: none !important; }
  .login-wrapper {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }
  .login-card {
    width: 100%;
    max-width: 420px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 28px;
  }
  .brand-header h1 { font-size: 22px; font-weight: 700; }
  .brand-header p { font-size: 13px; color: var(--muted); margin-top: 4px; }
  .role-tabs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    background: #f1f5f9;
    padding: 4px;
    border-radius: 8px;
    margin: 20px 0;
  }
  .tab-btn {
    padding: 8px 12px;
    border: none;
    background: transparent;
    border-radius: 6px;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    color: var(--muted);
  }
  .tab-btn.active { background: #fff; color: var(--text); }
  .form-group { margin-bottom: 14px; }
  .form-group label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; }
  .form-group input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: 14px;
  }
  .btn-primary {
    background: var(--accent);
    color: #fff;
    border: none;
    padding: 10px 16px;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
  }
  .btn-outline {
    background: #fff;
    color: var(--text);
    border: 1px solid var(--border);
    padding: 9px 14px;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
    text-align: center;
    display: inline-block;
  }
  .btn-warning {
    background: #fef3c7;
    color: #92400e;
    border: 1px solid #fcd34d;
    padding: 9px 14px;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
  }
  .full-width { width: 100%; }
  .alert-error {
    margin-top: 14px;
    padding: 10px 12px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: var(--danger);
    border-radius: 8px;
    font-size: 13px;
  }
  .admin-shell { display: flex; min-height: 100vh; }
  .sidebar {
    width: 240px;
    background: var(--surface);
    border-right: 1px solid var(--border);
    padding: 20px 16px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .sidebar-brand { font-size: 18px; font-weight: 700; margin-bottom: 20px; }
  .sidebar-nav { display: flex; flex-direction: column; gap: 4px; }
  .nav-item {
    text-align: left;
    padding: 10px 12px;
    border: none;
    background: transparent;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
  }
  .nav-item.active { background: #eff6ff; color: var(--accent); font-weight: 600; }
  .admin-main { flex: 1; display: flex; flex-direction: column; }
  .topbar {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    padding: 14px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .content-area { padding: 24px; }
  .exam-topbar {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    padding: 12px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .exam-controls { display: flex; align-items: center; gap: 12px; }
  .timer-box {
    font-family: 'JetBrains Mono', monospace;
    font-weight: 600;
    font-size: 18px;
    padding: 6px 12px;
    background: #f1f5f9;
    border-radius: 8px;
  }
  .exam-grid {
    max-width: 1200px;
    margin: 24px auto;
    padding: 0 16px;
    display: grid;
    grid-template-columns: 1fr 280px;
    gap: 20px;
  }
  .question-pane, .nav-pane {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 24px;
  }
  .options-list { display: flex; flex-direction: column; gap: 10px; margin: 20px 0; }
  .option-item {
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 12px 14px;
    cursor: pointer;
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }
  .option-item.selected { border-color: var(--accent); background: #eff6ff; }
  .q-nav-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-top: 14px; }
  .q-num-btn {
    height: 40px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: #fff;
    font-weight: 600;
    cursor: pointer;
  }
  .q-num-btn.answered { background: #dcfce7; border-color: #86efac; color: #166534; }
  .q-num-btn.ragu { background: #fef3c7; border-color: #fcd34d; color: #92400e; }
  .q-num-btn.active { outline: 2px solid var(--accent); }
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.72);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 16px;
  }
  .modal-box {
    background: #fff;
    border-radius: 12px;
    max-width: 440px;
    width: 100%;
    padding: 24px;
  }
  .modal-box h3 { color: var(--danger); margin-bottom: 10px; }
  .modal-box p { font-size: 14px; margin-bottom: 18px; }
  @media (max-width: 768px) {
    .admin-shell { flex-direction: column; }
    .sidebar { width: 100%; }
    .exam-grid { grid-template-columns: 1fr; }
  }
</style>
`;

const SCRIPTS_HTML = `<script>
  // State Global Client-Side
  let currentSession = null;
  let adminData = null;
  let monitoringTimer = null;

  // State Ujian Peserta
  let examData = { ujian: null, sesi: null, soalList: [], urutan: [], currentIdx: 0, jawaban: {}, ragu: {} };
  let countdownInterval = null;
  let syncInterval = null;

  function switchLoginRole(role) {
    document.querySelectorAll('.tab-btn').forEach((b, i) => {
      b.classList.toggle('active', (role === 'peserta' && i === 0) || (role === 'admin' && i === 1));
    });
    document.getElementById('form-login-peserta').classList.toggle('hidden', role !== 'peserta');
    document.getElementById('form-login-admin').classList.toggle('hidden', role !== 'admin');
    document.getElementById('login-error').classList.add('hidden');
  }

  function showLoginError(msg) {
    const el = document.getElementById('login-error');
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  function handleLoginAdmin(e) {
    e.preventDefault();
    const user = document.getElementById('inp-user').value;
    const pass = document.getElementById('inp-pass').value;
    google.script.run
      .withSuccessHandler((res) => {
        if (!res.ok) return showLoginError(res.message);
        currentSession = res.session;
        document.getElementById('view-login').classList.add('hidden');
        document.getElementById('view-admin').classList.remove('hidden');
        document.getElementById('admin-user-label').textContent = res.session.namaLengkap;
        loadAdminBootstrap();
      })
      .loginAdmin(user, pass);
  }

  function handleLoginPeserta(e) {
    e.preventDefault();
    const nis = document.getElementById('inp-nis').value;
    const token = document.getElementById('inp-token').value;
    google.script.run
      .withSuccessHandler((res) => {
        if (!res.ok) return showLoginError(res.message);
        currentSession = res.session;
        localStorage.setItem('cbt_active_session', JSON.stringify(currentSession));
        startExamFlow(currentSession);
      })
      .loginPeserta(nis, token);
  }

  function loadAdminBootstrap() {
    google.script.run
      .withSuccessHandler((data) => {
        adminData = data;
        document.getElementById('link-spreadsheet').href = data.spreadsheetUrl;
        showAdminTab('dashboard');
      })
      .getAdminBootstrapData(currentSession.sessionToken);
  }

  function showAdminTab(tab) {
    const container = document.getElementById('admin-content');
    if (monitoringTimer) clearInterval(monitoringTimer);

    if (tab === 'dashboard' && adminData) {
      document.getElementById('admin-page-title').textContent = 'Dashboard Ringkasan';
      const avg = adminData.hasil.length
        ? Math.round(adminData.hasil.reduce((a, b) => a + Number(b.nilai), 0) / adminData.hasil.length)
        : 0;
      container.innerHTML =
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;">' +
        '<div class="question-pane"><div>Total Peserta</div><strong style="font-size:24px;">' + adminData.peserta.length + '</strong></div>' +
        '<div class="question-pane"><div>Ujian Aktif</div><strong style="font-size:24px;">' + adminData.ujian.filter(u => u.status === "Aktif").length + '</strong></div>' +
        '<div class="question-pane"><div>Log Pelanggaran</div><strong style="font-size:24px;">' + adminData.logPelanggaran.length + '</strong></div>' +
        '<div class="question-pane"><div>Rata-rata Nilai</div><strong style="font-size:24px;">' + avg + '</strong></div>' +
        '</div>';
    } else if (tab === 'monitoring') {
      document.getElementById('admin-page-title').textContent = 'Monitoring Pengawasan Real-time';
      fetchMonitoring();
      monitoringTimer = setInterval(fetchMonitoring, 7000);
    }
  }

  function fetchMonitoring() {
    google.script.run
      .withSuccessHandler((res) => {
        let html = '<table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #e2e8f0;">' +
          '<thead><tr style="background:#f1f5f9;text-align:left;"><th style="padding:10px;">NIS</th><th>Nama</th><th>Kelas</th><th>Status</th><th>Pelanggaran</th><th>Aksi</th></tr></thead><tbody>';
        res.sesiAktif.forEach((s) => {
          html += '<tr style="border-top:1px solid #e2e8f0;"><td style="padding:10px;">' + s.nis + '</td><td>' + s.nama + '</td><td>' + s.kelas + '</td><td>' + s.status + '</td><td>' + s.jumlah_pelanggaran + '</td>' +
            '<td><button onclick="adminAct(\\'warn\\',\\'' + s.nis + '\\',\\'' + s.id_ujian + '\\')">Peringatkan</button> ' +
            '<button onclick="adminAct(\\'unblock\\',\\'' + s.nis + '\\',\\'' + s.id_ujian + '\\')">Buka Blokir</button></td></tr>';
        });
        html += '</tbody></table>';
        document.getElementById('admin-content').innerHTML = html;
      })
      .getMonitoringData(currentSession.sessionToken);
  }

  function adminAct(action, nis, idUjian) {
    google.script.run
      .withSuccessHandler(() => fetchMonitoring())
      .adminActionOnPeserta(currentSession.sessionToken, action, nis, idUjian, { minutes: 10 });
  }

  // ==================== FLOW UJIAN PESERTA & KEAMANAN ====================
  function startExamFlow(session) {
    google.script.run
      .withSuccessHandler((res) => {
        if (!res.ok) return alert(res.message);
        examData.ujian = res.ujian;
        examData.sesi = res.sesi;
        examData.soalList = res.soalList;
        examData.urutan = JSON.parse(res.sesi.urutan_soal_json || '[]');

        // Pulihkan jawaban lokal jika koneksi sempat terputus
        const localBackup = localStorage.getItem('cbt_ans_' + session.nis + '_' + res.ujian.id_ujian);
        examData.jawaban = localBackup ? JSON.parse(localBackup) : JSON.parse(res.sesi.jawaban_json || '{}');
        examData.ragu = JSON.parse(res.sesi.ragu_json || '{}');

        document.getElementById('view-login').classList.add('hidden');
        document.getElementById('view-exam').classList.remove('hidden');
        document.getElementById('exam-title').textContent = res.ujian.nama_ujian;
        document.getElementById('exam-student-info').textContent = session.namaLengkap + ' · ' + session.kelas;

        // Aktifkan Modul Proctoring Keamanan Real-time (Proctoring.html)
        CbtProctoring.init({
          nis: session.nis,
          sessionToken: session.sessionToken,
          idUjian: res.ujian.id_ujian,
          maxTotal: 5,
        });
        renderCurrentQuestion();
        startCountdownAndSync();
      })
      .startExamSession(session.nis, session.sessionToken, session.idUjianTarget);
  }

  function acknowledgeWarningAndFullscreen() {
    document.getElementById('modal-warning').classList.add('hidden');
    CbtProctoring.requestFullscreenSafe();
  }

  function renderCurrentQuestion() {
    const soalId = examData.urutan[examData.currentIdx];
    const soal = examData.soalList.find((s) => s.id_soal === soalId) || examData.soalList[0];
    if (!soal) return;

    document.getElementById('q-number-label').textContent = 'Soal ' + (examData.currentIdx + 1) + ' dari ' + examData.urutan.length;
    document.getElementById('q-type-label').textContent = soal.tipe_soal;
    document.getElementById('q-text').textContent = soal.pertanyaan;
    document.getElementById('q-image-box').innerHTML = soal.gambar_url
      ? '<img src="' + soal.gambar_url + '" style="max-width:100%;max-height:260px;margin:12px 0;border-radius:8px;" />'
      : '';

    const ans = examData.jawaban[soal.id_soal] || '';
    const optEl = document.getElementById('q-options');
    optEl.innerHTML = '';

    if (soal.tipe_soal === 'PG' || soal.tipe_soal === 'BENAR_SALAH') {
      const opts = soal.tipe_soal === 'BENAR_SALAH'
        ? [{ k: 'BENAR', t: 'Benar' }, { k: 'SALAH', t: 'Salah' }]
        : ['A', 'B', 'C', 'D', 'E'].map((k) => ({ k, t: soal['opsi_' + k.toLowerCase()] })).filter((o) => o.t);
      opts.forEach((o) => {
        const div = document.createElement('div');
        div.className = 'option-item' + (ans === o.k ? ' selected' : '');
        div.textContent = o.k + '. ' + o.t;
        div.onclick = () => {
          examData.jawaban[soal.id_soal] = o.k;
          saveAnswerLocally();
          renderCurrentQuestion();
        };
        optEl.appendChild(div);
      });
    } else {
      const inp = document.createElement(soal.tipe_soal === 'URAIAN' ? 'textarea' : 'input');
      inp.value = ans;
      inp.style.width = '100%';
      inp.style.padding = '10px';
      inp.oninput = (ev) => {
        examData.jawaban[soal.id_soal] = ev.target.value;
        saveAnswerLocally();
      };
      optEl.appendChild(inp);
    }

    const nav = document.getElementById('q-nav-grid');
    nav.innerHTML = '';
    examData.urutan.forEach((id, i) => {
      const b = document.createElement('button');
      b.className = 'q-num-btn' + (i === examData.currentIdx ? ' active' : '') + (examData.ragu[id] ? ' ragu' : examData.jawaban[id] ? ' answered' : '');
      b.textContent = i + 1;
      b.onclick = () => { examData.currentIdx = i; renderCurrentQuestion(); };
      nav.appendChild(b);
    });
  }

  function saveAnswerLocally() {
    localStorage.setItem('cbt_ans_' + currentSession.nis + '_' + examData.ujian.id_ujian, JSON.stringify(examData.jawaban));
  }

  function prevQuestion() { if (examData.currentIdx > 0) { examData.currentIdx--; renderCurrentQuestion(); } }
  function nextQuestion() { if (examData.currentIdx < examData.urutan.length - 1) { examData.currentIdx++; renderCurrentQuestion(); } }
  function toggleRagu() {
    const id = examData.urutan[examData.currentIdx];
    examData.ragu[id] = !examData.ragu[id];
    renderCurrentQuestion();
  }

  function startCountdownAndSync() {
    let targetMs = new Date(examData.sesi.waktu_selesai_target).getTime();
    countdownInterval = setInterval(() => {
      const rem = Math.max(0, Math.floor((targetMs - Date.now()) / 1000));
      const m = String(Math.floor(rem / 60)).padStart(2, '0');
      const s = String(rem % 60).padStart(2, '0');
      document.getElementById('exam-timer').textContent = m + ':' + s;
      if (rem <= 0) confirmFinishExam(true);
    }, 1000);

    syncInterval = setInterval(() => {
      google.script.run
        .withSuccessHandler((res) => {
          if (res.waktu_selesai_target) targetMs = new Date(res.waktu_selesai_target).getTime();
          if (res.status === 'Diblokir') {
            document.getElementById('warn-title').textContent = 'AKSES UJIAN DIKUNCI';
            document.getElementById('warn-message').textContent = 'Akun Anda diblokir. Hubungi Admin.';
            document.getElementById('modal-warning').classList.remove('hidden');
          }
        })
        .syncExamProgress(currentSession.nis, currentSession.sessionToken, examData.ujian.id_ujian, examData.jawaban, examData.ragu);
    }, 10000);
  }

  function confirmFinishExam(auto) {
    if (!auto && !confirm('Yakin mengakhiri ujian dan mengirim seluruh jawaban?')) return;
    clearInterval(countdownInterval);
    clearInterval(syncInterval);
    google.script.run
      .withSuccessHandler((res) => {
        localStorage.removeItem('cbt_ans_' + currentSession.nis + '_' + examData.ujian.id_ujian);
        document.getElementById('view-exam').innerHTML =
          '<div class="login-wrapper"><div class="login-card"><h2>Ujian Selesai</h2>' +
          (res.hasil.tampilkan_nilai ? '<p style="font-size:28px;font-weight:700;margin:12px 0;">Nilai: ' + res.hasil.nilai + '</p><p>Status: ' + res.hasil.status + '</p>' : '<p>Jawaban Anda telah disimpan dengan aman.</p>') +
          '</div></div>';
      })
      .finishExam(currentSession.nis, currentSession.sessionToken, examData.ujian.id_ujian, examData.jawaban, examData.ragu);
  }

  function logoutApp() {
    location.reload();
  }
</script>
`;

const APPSSCRIPT_JSON = `{
  "timeZone": "Asia/Jakarta",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE_ANONYMOUS"
  }
}
`;

export const GAS_SOURCE_FILES: GasSourceFile[] = [
  {
    id: 'code-gs',
    filename: 'Code.gs',
    gasType: 'Server Script',
    moduleLabel: 'Backend GAS + Auto-DB 10 Sheet + LockService Baca/Tulis Simultan',
    description:
      'Menginisialisasi otomatis 10 sheet Google Sheets di Drive Admin SMAN 1 Pamekasan, menyediakan wrapper withScriptLock_() berbasis LockService untuk baca/tulis simultan, CacheService, serta pencatatan real-time Log_Pelanggaran.',
    code: CODE_GS,
  },
  {
    id: 'proctoring-html',
    filename: 'Proctoring.html',
    gasType: 'JS Partial',
    moduleLabel: 'Modul Keamanan Klien (Tab, Fullscreen, Copy-Paste & Real-Time Log)',
    description:
      'Modul JavaScript terpisah untuk mendeteksi perpindahan tab, keluar mode layar penuh, copy/cut/paste, klik kanan, dan shortcut terlarang. Mengirim laporan real-time ke Code.gs untuk memperbarui sheet Log_Pelanggaran dan memunculkan pop-up peringatan.',
    code: PROCTORING_HTML,
  },
  {
    id: 'index-html',
    filename: 'Index.html',
    gasType: 'HTML View',
    moduleLabel: 'Struktur Tampilan Utama (Login, Admin & Ruang Ujian SMAN 1 Pamekasan)',
    description:
      'Templat HTML utama Web App GAS yang menggabungkan Styles.html, Proctoring.html, dan Scripts.html via <?!= include(...) ?>.',
    code: INDEX_HTML,
  },
  {
    id: 'styles-html',
    filename: 'Styles.html',
    gasType: 'CSS Partial',
    moduleLabel: 'Desain Responsif Mobile & Laptop',
    description:
      'Stylesheet CSS modern dengan layout adaptif untuk HP maupun laptop, grid navigasi nomor soal, serta tampilan modal peringatan keamanan.',
    code: STYLES_HTML,
  },
  {
    id: 'scripts-html',
    filename: 'Scripts.html',
    gasType: 'JS Partial',
    moduleLabel: 'Logika Aplikasi Client-Side, Auto-Save & Monitoring',
    description:
      'Komunikasi asynchronous dengan Code.gs melalui google.script.run, auto-save ke localStorage & server, pemulihan saat refresh, serta polling monitoring admin.',
    code: SCRIPTS_HTML,
  },
  {
    id: 'appsscript-json',
    filename: 'appsscript.json',
    gasType: 'Manifest JSON',
    moduleLabel: 'Konfigurasi Manifest Web App (Asia/Jakarta)',
    description:
      'Manifest Google Apps Script V8 dengan zona waktu Asia/Jakarta dan konfigurasi Web App Execute as Me / Anyone.',
    code: APPSSCRIPT_JSON,
  },
];
