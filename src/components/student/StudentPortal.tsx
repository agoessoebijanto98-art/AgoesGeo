import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  LogOut,
  Maximize2,
  ShieldAlert,
} from 'lucide-react';
import {
  gradeExamSession,
  loadDatabase,
  recordViolationAndCheckBlock,
  saveDatabase,
  startOrResumeExamSession,
} from '../../store/cbtStore';
import {
  ActiveAuthSession,
  BankSoalRecord,
  CbtDatabase,
  HasilUjianRecord,
  JawabanPesertaRecord,
  UjianRecord,
} from '../../types/cbt';
import { formatCountdown, formatDateTimeID } from '../../utils/crypto';

interface StudentPortalProps {
  db: CbtDatabase;
  session: ActiveAuthSession;
  onRefreshDb: (next: CbtDatabase) => void;
  onLogout: () => void;
}

type StudentStage = 'confirm' | 'instructions' | 'exam' | 'result';

export const StudentPortal: React.FC<StudentPortalProps> = ({
  db,
  session,
  onRefreshDb,
  onLogout,
}) => {
  const nis = session.nis || '';

  // Cari ujian aktif yang sesuai kelas peserta
  const availableExams = db.Ujian.filter(
    (u) =>
      u.status === 'Aktif' &&
      session.kelas &&
      u.kelas_peserta.includes(session.kelas)
  );

  const [selectedExamId, setSelectedExamId] = useState<string>(
    session.idUjianTarget || availableExams[0]?.id_ujian || ''
  );

  const selectedExam: UjianRecord | undefined = db.Ujian.find(
    (u) => u.id_ujian === selectedExamId
  );

  // Cek apakah peserta sudah punya sesi aktif atau sudah selesai (pemulihan otomatis saat refresh!)
  const existingSesi = db.Jawaban_Peserta.find(
    (j) => j.nis === nis && j.id_ujian === selectedExamId
  );
  const existingHasil = db.Hasil_Ujian.find(
    (h) => h.nis === nis && h.id_ujian === selectedExamId
  );

  const [stage, setStage] = useState<StudentStage>(() => {
    if (existingHasil) return 'result';
    if (
      existingSesi &&
      (existingSesi.status === 'Sedang Ujian' ||
        existingSesi.status === 'Diblokir')
    ) {
      return 'exam';
    }
    return 'confirm';
  });

  const [activeSesi, setActiveSesi] = useState<JawabanPesertaRecord | null>(
    existingSesi || null
  );
  const [finalHasil, setFinalHasil] = useState<HasilUjianRecord | null>(
    existingHasil || null
  );
  const [currentIdx, setCurrentIdx] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  // Modal & Alert States
  const [violationModal, setViolationModal] = useState<{
    title: string;
    message: string;
    remaining: number;
  } | null>(null);
  const [adminAlertMsg, setAdminAlertMsg] = useState<string>('');
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);

  const lastViolationAtRef = useRef<number>(0);
  const wasFullscreenEnteredRef = useRef<boolean>(false);
  const lastSeenAdminWarnTsRef = useRef<string>('');

  // Deteksi refresh berulang selama ujian berlangsung
  useEffect(() => {
    if (stage !== 'exam' || !selectedExamId) return;
    const key = `cbt_reload_count_${nis}_${selectedExamId}`;
    const prevCount = Number(sessionStorage.getItem(key) || '0');
    const nextCount = prevCount + 1;
    sessionStorage.setItem(key, String(nextCount));

    if (nextCount > 2) {
      const res = recordViolationAndCheckBlock(
        nis,
        selectedExamId,
        `Refresh Halaman Berulang (ke-${nextCount - 1})`,
        'other'
      );
      onRefreshDb(res.db);
      if (res.sesi) setActiveSesi(res.sesi);
      if (!res.justBlocked) {
        setViolationModal({
          title: 'Peringatan Refresh Berulang',
          message:
            'Terdeteksi melakukan muat ulang (refresh) halaman berulang kali saat ujian aktif.',
          remaining: res.remainingChances,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, selectedExamId]);

  const enterFullscreen = () => {
    const el = document.documentElement;
    if (el.requestFullscreen) {
      el.requestFullscreen()
        .then(() => {
          wasFullscreenEnteredRef.current = true;
        })
        .catch(() => {
          // Beberapa browser / iframe membatasi fullscreen tanpa gesture tertentu
        });
    }
  };

  const handleStartExam = () => {
    if (!selectedExam) return;
    enterFullscreen();
    const { db: nextDb, sesi } = startOrResumeExamSession(
      nis,
      selectedExam.id_ujian
    );
    onRefreshDb(nextDb);
    setActiveSesi(sesi);
    setStage('exam');
  };

  const handleFinishExam = useCallback(
    (forcedByTimer = false) => {
      if (!selectedExam || !activeSesi) return;
      const latestDb = loadDatabase();
      const idx = latestDb.Jawaban_Peserta.findIndex(
        (j) => j.nis === nis && j.id_ujian === selectedExam.id_ujian
      );
      const sesiToGrade = idx !== -1 ? latestDb.Jawaban_Peserta[idx] : activeSesi;

      sesiToGrade.status = 'Selesai';
      if (idx !== -1) latestDb.Jawaban_Peserta[idx] = sesiToGrade;

      const hasil = gradeExamSession(
        latestDb,
        sesiToGrade,
        selectedExam,
        forcedByTimer
      );
      const existingHasilIdx = latestDb.Hasil_Ujian.findIndex(
        (h) => h.nis === nis && h.id_ujian === selectedExam.id_ujian
      );
      if (existingHasilIdx !== -1) {
        latestDb.Hasil_Ujian[existingHasilIdx] = hasil;
      } else {
        latestDb.Hasil_Ujian.unshift(hasil);
      }

      // Bebaskan status login agar peserta bisa logout bersih
      latestDb.Peserta = latestDb.Peserta.map((p) =>
        p.nis === nis ? { ...p, status_login: 'Offline', session_token: '' } : p
      );

      saveDatabase(latestDb);
      onRefreshDb(latestDb);
      setFinalHasil(hasil);
      setShowFinishConfirm(false);
      setStage('result');

      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    },
    [activeSesi, nis, onRefreshDb, selectedExam]
  );

  // Timer hitung mundur + polling status dari Admin (blokir/buka blokir/tambah waktu/peringatan/paksa selesai)
  useEffect(() => {
    if (stage !== 'exam' || !selectedExam) return;

    const tick = () => {
      const latestDb = loadDatabase();
      const latestSesi = latestDb.Jawaban_Peserta.find(
        (j) => j.nis === nis && j.id_ujian === selectedExam.id_ujian
      );
      const latestHasil = latestDb.Hasil_Ujian.find(
        (h) => h.nis === nis && h.id_ujian === selectedExam.id_ujian
      );

      if (latestHasil && (!latestSesi || latestSesi.status === 'Selesai')) {
        setFinalHasil(latestHasil);
        setStage('result');
        return;
      }

      if (latestSesi) {
        setActiveSesi(latestSesi);
        if (
          latestSesi.peringatan_admin &&
          latestSesi.peringatan_timestamp &&
          latestSesi.peringatan_timestamp !== lastSeenAdminWarnTsRef.current
        ) {
          lastSeenAdminWarnTsRef.current = latestSesi.peringatan_timestamp;
          setAdminAlertMsg(latestSesi.peringatan_admin);
        }

        const rem = Math.max(
          0,
          Math.floor(
            (new Date(latestSesi.waktu_selesai_target).getTime() - Date.now()) /
              1000
          )
        );
        setRemainingSeconds(rem);
        if (rem <= 0 && latestSesi.status === 'Sedang Ujian') {
          handleFinishExam(true);
        }
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [stage, selectedExam, nis, handleFinishExam]);

  // Trigger pelanggaran dengan debounce 1.2s
  const triggerViolation = useCallback(
    (jenis: string, category: 'tab' | 'fullscreen' | 'other') => {
      if (stage !== 'exam' || !selectedExam) return;
      const latest = loadDatabase().Jawaban_Peserta.find(
        (j) => j.nis === nis && j.id_ujian === selectedExam.id_ujian
      );
      if (!latest || latest.status !== 'Sedang Ujian') return;

      const now = Date.now();
      if (now - lastViolationAtRef.current < 1200) return;
      lastViolationAtRef.current = now;

      const res = recordViolationAndCheckBlock(
        nis,
        selectedExam.id_ujian,
        jenis,
        category
      );
      onRefreshDb(res.db);
      if (res.sesi) setActiveSesi(res.sesi);

      if (!res.justBlocked) {
        setViolationModal({
          title: `Peringatan Pelanggaran Ke-${res.sesi?.jumlah_pelanggaran || 1}`,
          message: `Terdeteksi: ${jenis}. Kejadian ini otomatis dicatat ke Log Pelanggaran Pengawas.`,
          remaining: res.remainingChances,
        });
      }
    },
    [nis, onRefreshDb, selectedExam, stage]
  );

  // Listener Keamanan Browser saat Ujian Berlangsung
  useEffect(() => {
    if (stage !== 'exam') return;

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      triggerViolation('Klik Kanan Diblokir', 'other');
    };
    const onClipboard = (type: string) => (e: ClipboardEvent) => {
      e.preventDefault();
      triggerViolation(`Percobaan ${type.toUpperCase()} Konten`, 'other');
    };
    const onVisibility = () => {
      if (document.hidden) {
        triggerViolation('Berpindah Tab / Minimize Browser', 'tab');
      }
    };
    const onBlur = () => {
      triggerViolation('Keluar Fokus Jendela Ujian', 'tab');
    };
    const onFullscreenChange = () => {
      if (wasFullscreenEnteredRef.current && !document.fullscreenElement) {
        triggerViolation('Keluar Mode Layar Penuh', 'fullscreen');
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const forbiddenCtrl =
        (e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'u', 'p'].includes(k);
      const devTools =
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) &&
          e.shiftKey &&
          ['i', 'j', 'c'].includes(k));
      if (forbiddenCtrl || devTools || e.key === 'PrintScreen') {
        e.preventDefault();
        triggerViolation(`Shortcut Keyboard Terlarang (${e.key})`, 'other');
      }
    };

    const copyH = onClipboard('copy');
    const cutH = onClipboard('cut');
    const pasteH = onClipboard('paste');

    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('copy', copyH);
    document.addEventListener('cut', cutH);
    document.addEventListener('paste', pasteH);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('copy', copyH);
      document.removeEventListener('cut', cutH);
      document.removeEventListener('paste', pasteH);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [stage, triggerViolation]);

  // Simpan Jawaban Otomatis ke Database
  const saveAnswer = (soalId: string, value: string) => {
    if (!activeSesi || !selectedExam || activeSesi.status !== 'Sedang Ujian')
      return;
    const latestDb = loadDatabase();
    const idx = latestDb.Jawaban_Peserta.findIndex(
      (j) => j.nis === nis && j.id_ujian === selectedExam.id_ujian
    );
    if (idx === -1) return;

    const updated: JawabanPesertaRecord = {
      ...latestDb.Jawaban_Peserta[idx],
      jawaban_map: {
        ...latestDb.Jawaban_Peserta[idx].jawaban_map,
        [soalId]: value,
      },
      last_activity: new Date().toISOString(),
    };
    latestDb.Jawaban_Peserta[idx] = updated;
    saveDatabase(latestDb);
    setActiveSesi(updated);
    onRefreshDb(latestDb);
  };

  const toggleRagu = (soalId: string) => {
    if (!activeSesi || !selectedExam) return;
    const latestDb = loadDatabase();
    const idx = latestDb.Jawaban_Peserta.findIndex(
      (j) => j.nis === nis && j.id_ujian === selectedExam.id_ujian
    );
    if (idx === -1) return;

    const updated: JawabanPesertaRecord = {
      ...latestDb.Jawaban_Peserta[idx],
      ragu_map: {
        ...latestDb.Jawaban_Peserta[idx].ragu_map,
        [soalId]: !latestDb.Jawaban_Peserta[idx].ragu_map[soalId],
      },
      last_activity: new Date().toISOString(),
    };
    latestDb.Jawaban_Peserta[idx] = updated;
    saveDatabase(latestDb);
    setActiveSesi(updated);
    onRefreshDb(latestDb);
  };

  // ==================== VIEW 1: KONFIRMASI DATA & DAFTAR UJIAN ====================
  if (stage === 'confirm') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/assets/aistudio/LOGO_SMANSA_TRANSAPARAN_09d9bfb0.png"
              alt="Logo SMAN 1 Pamekasan"
              className="w-7 h-9 object-contain shrink-0"
            />
            <div className="text-sm font-bold text-slate-900">
              Assist_Aassesment CBT · {db.Pengaturan.nama_sekolah}
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar</span>
          </button>
        </header>

        <main className="flex-1 max-w-4xl w-full mx-auto p-6 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h1 className="text-lg font-bold text-slate-900">
              Konfirmasi Identitas Peserta
            </h1>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-xs text-slate-500">Nama Lengkap</div>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {session.namaLengkap}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">NIS / ID Peserta</div>
                <div className="font-mono font-semibold text-slate-900 mt-0.5 tabular-nums">
                  {session.nis}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Kelas</div>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {session.kelas}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-bold text-slate-800">
              Daftar Ujian Tersedia untuk Kelas {session.kelas}
            </h2>
            {availableExams.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
                Tidak ada jadwal ujian aktif untuk kelas Anda saat ini.
              </div>
            ) : (
              availableExams.map((u) => {
                const sesiAda = db.Jawaban_Peserta.find(
                  (j) => j.nis === nis && j.id_ujian === u.id_ujian
                );
                const hasilAda = db.Hasil_Ujian.find(
                  (h) => h.nis === nis && h.id_ujian === u.id_ujian
                );
                return (
                  <div
                    key={u.id_ujian}
                    className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="text-xs font-semibold text-blue-700">
                        {u.mata_pelajaran} · {u.tanggal} ({u.jam_mulai}–
                        {u.jam_selesai})
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mt-0.5">
                        {u.nama_ujian}
                      </h3>
                      <div className="text-xs text-slate-500 mt-1 tabular-nums">
                        Durasi {u.durasi_menit} menit · KKM {u.kkm}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedExamId(u.id_ujian);
                        if (hasilAda) {
                          setFinalHasil(hasilAda);
                          setStage('result');
                        } else if (sesiAda) {
                          setActiveSesi(sesiAda);
                          setStage('exam');
                        } else {
                          setStage('instructions');
                        }
                      }}
                      className="px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                    >
                      {hasilAda
                        ? 'Lihat Hasil'
                        : sesiAda
                          ? 'Lanjutkan Ujian'
                          : 'Pilih & Baca Instruksi'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </main>
      </div>
    );
  }

  // ==================== VIEW 2: INSTRUKSI UJIAN ====================
  if (stage === 'instructions' && selectedExam) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-white border border-slate-200 rounded-xl p-7 space-y-6">
          <div>
            <div className="text-xs font-semibold text-blue-700">
              Instruksi & Tata Tertib Ujian
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1">
              {selectedExam.nama_ujian}
            </h1>
            <p className="text-xs text-slate-500 mt-1 tabular-nums">
              Durasi {selectedExam.durasi_menit} menit · KKM {selectedExam.kkm}
            </p>
          </div>

          <ul className="space-y-2.5 text-sm text-slate-700 list-disc list-inside">
            <li>
              Ujian wajib dikerjakan dalam <strong>mode layar penuh</strong>{' '}
              hingga selesai.
            </li>
            <li>
              Dilarang berpindah tab/jendela browser, keluar dari layar penuh,
              klik kanan, atau menyalin/menempel teks.
            </li>
            <li>
              Batas otomatis blokir: maksimal{' '}
              <strong className="font-mono">
                {db.Pengaturan.max_pindah_tab}x
              </strong>{' '}
              pindah tab,{' '}
              <strong className="font-mono">
                {db.Pengaturan.max_keluar_fullscreen}x
              </strong>{' '}
              keluar layar penuh, atau{' '}
              <strong className="font-mono">
                {db.Pengaturan.max_total_pelanggaran}x
              </strong>{' '}
              total pelanggaran.
            </li>
            <li>
              Jawaban Anda tersimpan otomatis setiap klik sehingga aman apabila
              halaman ter-refresh atau koneksi terputus sementara.
            </li>
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setStage('confirm')}
              className="px-4 py-2 text-xs font-semibold border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Kembali
            </button>
            <button
              type="button"
              onClick={handleStartExam}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-lg cursor-pointer"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Mulai Ujian (Layar Penuh)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== VIEW 4: HALAMAN HASIL ====================
  if (stage === 'result' && selectedExam && finalHasil) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white border border-slate-200 rounded-xl p-8 text-center space-y-5">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Ujian Telah Diselesaikan
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              {selectedExam.nama_ujian}
            </p>
          </div>

          {selectedExam.tampilkan_nilai ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
              <div className="text-xs text-slate-500">Nilai Akhir Anda</div>
              <div className="text-4xl font-bold text-slate-900 font-mono tabular-nums">
                {finalHasil.nilai}
              </div>
              <div className="text-xs font-semibold">
                Status:{' '}
                <span
                  className={
                    finalHasil.status === 'Tuntas'
                      ? 'text-emerald-700'
                      : 'text-amber-700'
                  }
                >
                  {finalHasil.status} (KKM {selectedExam.kkm})
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-200 text-xs tabular-nums">
                <div>
                  <div className="text-slate-500">Benar</div>
                  <div className="font-bold text-emerald-700">
                    {finalHasil.jumlah_benar}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Salah</div>
                  <div className="font-bold text-red-700">
                    {finalHasil.jumlah_salah}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Pelanggaran</div>
                  <div className="font-bold text-slate-900">
                    {finalHasil.jumlah_pelanggaran}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-sm text-slate-600">
              Jawaban Anda telah berhasil dikirim dan disimpan ke database
              pengawas. Nilai akan diumumkan oleh guru/admin.
            </div>
          )}

          <div className="text-xs text-slate-500">
            Diselesaikan pada {formatDateTimeID(finalHasil.waktu_selesai)}
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg cursor-pointer"
          >
            Selesai & Keluar
          </button>
        </div>
      </div>
    );
  }

  // ==================== VIEW 3: HALAMAN UJIAN AKTIF ====================
  if (!activeSesi || !selectedExam) return null;

  const urutanIds = activeSesi.urutan_soal;
  const activeSoalId = urutanIds[currentIdx] || urutanIds[0];
  const soal: BankSoalRecord | undefined = db.Bank_Soal.find(
    (s) => s.id_soal === activeSoalId
  );

  const currentAnswer = soal ? activeSesi.jawaban_map[soal.id_soal] || '' : '';
  const isRagu = soal ? !!activeSesi.ragu_map[soal.id_soal] : false;
  const answeredCount = urutanIds.filter(
    (id) => (activeSesi.jawaban_map[id] || '').trim().length > 0
  ).length;
  const raguCount = urutanIds.filter((id) => activeSesi.ragu_map[id]).length;

  const optionLetters =
    soal &&
    activeSesi.opsi_order_map &&
    activeSesi.opsi_order_map[soal.id_soal]
      ? activeSesi.opsi_order_map[soal.id_soal]
      : ['A', 'B', 'C', 'D', 'E'];

  const isLocked = activeSesi.status === 'Diblokir';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col select-none">
      {/* Top Bar Ujian */}
      <header className="bg-white border-b border-slate-200 px-4 lg:px-8 py-3 flex items-center justify-between gap-4 sticky top-0 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src="/assets/aistudio/LOGO_SMANSA_TRANSAPARAN_09d9bfb0.png"
            alt="Logo SMAN 1 Pamekasan"
            className="w-7 h-9 object-contain shrink-0"
          />
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-900 truncate">
              {selectedExam.nama_ujian}
            </div>
            <div className="text-xs text-slate-500 truncate">
              {db.Pengaturan.nama_sekolah} · {session.namaLengkap} · {session.kelas} · NIS {session.nis}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={enterFullscreen}
            title="Aktifkan Mode Layar Penuh"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Layar Penuh</span>
          </button>

          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-sm font-bold tabular-nums border ${
              remainingSeconds <= 300
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-slate-100 border-slate-200 text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{formatCountdown(remainingSeconds)}</span>
          </div>

          <button
            type="button"
            onClick={() => setShowFinishConfirm(true)}
            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg cursor-pointer whitespace-nowrap"
          >
            Selesai
          </button>
        </div>
      </header>

      {/* Banner Peringatan Langsung dari Admin */}
      {adminAlertMsg && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center justify-between gap-4 text-xs text-amber-900">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Pesan Pengawas: {adminAlertMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setAdminAlertMsg('')}
            className="font-bold underline cursor-pointer shrink-0"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Main Exam Layout */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Area Soal */}
        <section className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 lg:p-7 space-y-6">
          {soal ? (
            <>
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="text-sm font-bold text-slate-900 tabular-nums">
                  Soal No. {currentIdx + 1} dari {urutanIds.length}
                </div>
                <div className="text-xs text-slate-500">
                  {soal.tipe_soal.replace('_', ' ')} · Pelanggaran:{' '}
                  <span
                    className={`font-mono font-bold ${
                      activeSesi.jumlah_pelanggaran > 0
                        ? 'text-red-700'
                        : 'text-slate-700'
                    }`}
                  >
                    {activeSesi.jumlah_pelanggaran}/
                    {db.Pengaturan.max_total_pelanggaran}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {soal.gambar_url && (
                  <img
                    src={soal.gambar_url}
                    alt={`Gambar soal ${currentIdx + 1}`}
                    referrerPolicy="no-referrer"
                    className="max-h-72 rounded-lg border border-slate-200 object-contain bg-white"
                  />
                )}
                <p className="text-base text-slate-900 leading-relaxed font-medium">
                  {soal.pertanyaan}
                </p>
              </div>

              {/* Render Opsi Sesuai Tipe Soal */}
              <div className="space-y-2.5">
                {soal.tipe_soal === 'PG' &&
                  optionLetters.map((letter, displayIdx) => {
                    const text = soal[
                      `opsi_${letter.toLowerCase()}` as keyof BankSoalRecord
                    ] as string;
                    if (!text) return null;
                    const displayCode = ['A', 'B', 'C', 'D', 'E'][displayIdx];
                    const selected = currentAnswer === letter;
                    return (
                      <button
                        key={letter}
                        type="button"
                        onClick={() => saveAnswer(soal.id_soal, letter)}
                        className={`w-full text-left p-4 rounded-xl border transition-colors flex items-start gap-3 cursor-pointer ${
                          selected
                            ? 'bg-blue-50 border-blue-600 text-slate-900'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <span
                          className={`w-7 h-7 rounded-lg font-mono text-xs font-bold flex items-center justify-center shrink-0 ${
                            selected
                              ? 'bg-blue-700 text-white'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {displayCode}
                        </span>
                        <span className="text-sm pt-0.5">{text}</span>
                      </button>
                    );
                  })}

                {soal.tipe_soal === 'PG_KOMPLEKS' && (
                  <div className="space-y-2.5">
                    <div className="text-xs text-slate-500">
                      Pilih semua jawaban yang benar (bisa lebih dari satu):
                    </div>
                    {optionLetters.map((letter) => {
                      const text = soal[
                        `opsi_${letter.toLowerCase()}` as keyof BankSoalRecord
                      ] as string;
                      if (!text) return null;
                      const chosenArr = currentAnswer
                        ? currentAnswer.split(',').filter(Boolean)
                        : [];
                      const checked = chosenArr.includes(letter);
                      const toggleMulti = () => {
                        const nextArr = checked
                          ? chosenArr.filter((x) => x !== letter)
                          : [...chosenArr, letter];
                        saveAnswer(soal.id_soal, nextArr.join(','));
                      };
                      return (
                        <button
                          key={letter}
                          type="button"
                          onClick={toggleMulti}
                          className={`w-full text-left p-4 rounded-xl border transition-colors flex items-center gap-3 cursor-pointer ${
                            checked
                              ? 'bg-blue-50 border-blue-600 text-slate-900'
                              : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            readOnly
                            className="w-4 h-4 accent-blue-700"
                          />
                          <span className="text-sm">{text}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {soal.tipe_soal === 'BENAR_SALAH' &&
                  ['BENAR', 'SALAH'].map((val) => {
                    const selected = currentAnswer === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => saveAnswer(soal.id_soal, val)}
                        className={`w-full text-left p-4 rounded-xl border transition-colors flex items-center gap-3 cursor-pointer ${
                          selected
                            ? 'bg-blue-50 border-blue-600 text-slate-900 font-semibold'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <span className="text-sm">
                          {val === 'BENAR' ? 'Benar' : 'Salah'}
                        </span>
                      </button>
                    );
                  })}

                {soal.tipe_soal === 'ISIAN_SINGKAT' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Ketik Jawaban Singkat Anda:
                    </label>
                    <input
                      type="text"
                      value={currentAnswer}
                      onChange={(e) => saveAnswer(soal.id_soal, e.target.value)}
                      placeholder="Tuliskan jawaban singkat..."
                      className="w-full px-4 py-3 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                )}

                {soal.tipe_soal === 'URAIAN' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Ketik Jawaban Uraian Anda:
                    </label>
                    <textarea
                      rows={5}
                      value={currentAnswer}
                      onChange={(e) => saveAnswer(soal.id_soal, e.target.value)}
                      placeholder="Tuliskan penjelasan lengkap Anda di sini..."
                      className="w-full px-4 py-3 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                )}
              </div>

              {/* Footer Navigasi Soal */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={currentIdx === 0}
                  onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Sebelumnya</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleRagu(soal.id_soal)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                    isRagu
                      ? 'bg-amber-100 border-amber-400 text-amber-900'
                      : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  <Bookmark className="w-4 h-4" />
                  <span>{isRagu ? 'Hapus Ragu-ragu' : 'Tandai Ragu-ragu'}</span>
                </button>

                {currentIdx < urutanIds.length - 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentIdx((i) =>
                        Math.min(urutanIds.length - 1, i + 1)
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-lg cursor-pointer"
                  >
                    <span>Selanjutnya</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowFinishConfirm(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Kirim Jawaban</span>
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-sm text-slate-500">
              Soal tidak ditemukan.
            </div>
          )}
        </section>

        {/* Navigasi Nomor Soal */}
        <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Navigasi Nomor Soal
            </h3>
            <span className="text-xs text-slate-500 tabular-nums">
              {answeredCount}/{urutanIds.length} dijawab
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {urutanIds.map((id, idx) => {
              const answered = (activeSesi.jawaban_map[id] || '').trim().length > 0;
              const ragu = !!activeSesi.ragu_map[id];
              const isCurrent = idx === currentIdx;

              let btnClass = 'bg-white border-slate-300 text-slate-700';
              if (ragu) {
                btnClass = 'bg-amber-100 border-amber-400 text-amber-900';
              } else if (answered) {
                btnClass = 'bg-emerald-100 border-emerald-400 text-emerald-900';
              }

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCurrentIdx(idx)}
                  className={`h-10 rounded-lg border font-mono text-xs font-bold tabular-nums cursor-pointer transition-colors ${btnClass} ${
                    isCurrent ? 'ring-2 ring-blue-700 ring-offset-1' : ''
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="border-t border-slate-100 pt-3 grid grid-cols-3 gap-2 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-200 border border-emerald-400 inline-block" />
              <span>Dijawab</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-200 border border-amber-400 inline-block" />
              <span>Ragu</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-white border border-slate-300 inline-block" />
              <span>Kosong</span>
            </div>
          </div>

          <div className="text-xs text-slate-500 pt-1">
            Jawaban tersimpan otomatis setiap Anda memilih opsi atau mengetik.
          </div>
        </aside>
      </main>

      {/* OVERLAY LAYAR TERKUNCI JIKA DIBLOKIR */}
      {isLocked && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 flex items-center justify-center p-6">
          <div className="bg-white border border-red-200 rounded-xl max-w-md w-full p-7 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto">
              <Ban className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-red-700">
              Akses Ujian Dikunci (Diblokir)
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              {activeSesi.peringatan_admin ||
                'Akun Anda diblokir otomatis karena melebihi batas pelanggaran keamanan ujian. Layar terkunci hingga Admin/Pengawas membuka blokir secara manual.'}
            </p>
            <div className="text-xs text-slate-500">
              Halaman ini akan terbuka otomatis begitu Admin menekan &ldquo;Buka
              Blokir&rdquo;.
            </div>
          </div>
        </div>
      )}

      {/* MODAL PERINGATAN PELANGGARAN */}
      {violationModal && !isLocked && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 flex items-center justify-center p-4">
          <div className="bg-white border border-red-200 rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2 text-red-700 font-bold text-base">
              <ShieldAlert className="w-5 h-5" />
              <span>{violationModal.title}</span>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              {violationModal.message}
            </p>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs font-semibold text-amber-900">
              Sisa kesempatan sebelum akun diblokir otomatis:{' '}
              <span className="font-mono font-bold tabular-nums">
                {violationModal.remaining} kali
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setViolationModal(null);
                enterFullscreen();
              }}
              className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
            >
              Saya Mengerti & Kembali ke Layar Penuh
            </button>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI SELESAI UJIAN */}
      {showFinishConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Konfirmasi Selesai Ujian
            </h3>
            <p className="text-sm text-slate-600">
              Anda telah menjawab{' '}
              <strong className="tabular-nums">
                {answeredCount} dari {urutanIds.length}
              </strong>{' '}
              soal
              {raguCount > 0 ? ` (${raguCount} soal masih ditandai ragu-ragu)` : ''}.
              Setelah dikirim, jawaban tidak dapat diubah kembali.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowFinishConfirm(false)}
                className="px-4 py-2 text-xs font-semibold border border-slate-300 rounded-lg cursor-pointer"
              >
                Periksa Kembali
              </button>
              <button
                type="button"
                onClick={() => handleFinishExam(false)}
                className="px-4 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg cursor-pointer"
              >
                Ya, Selesaikan Ujian
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
