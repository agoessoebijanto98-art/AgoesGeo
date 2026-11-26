import React from 'react';
import { CbtDatabase } from '../../types/cbt';
import { formatDateTimeID } from '../../utils/crypto';

interface DashboardTabProps {
  db: CbtDatabase;
  onNavigateTab: (tab: string) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  db,
  onNavigateTab,
}) => {
  const totalPeserta = db.Peserta.length;
  const ujianAktif = db.Ujian.filter((u) => u.status === 'Aktif').length;
  const sedangUjian = db.Jawaban_Peserta.filter(
    (s) => s.status === 'Sedang Ujian'
  ).length;
  const totalPelanggaran = db.Log_Pelanggaran.length;
  const rataRataNilai =
    db.Hasil_Ujian.length > 0
      ? Math.round(
          (db.Hasil_Ujian.reduce((acc, h) => acc + h.nilai, 0) /
            db.Hasil_Ujian.length) *
            10
        ) / 10
      : 0;

  return (
    <div className="space-y-8">
      {/* 5 KPI Ringkasan */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Total Peserta</div>
          <div className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
            {totalPeserta}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {db.Kelas.length} kelas terdaftar
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Ujian Aktif</div>
          <div className="mt-2 text-2xl font-bold text-blue-700 tabular-nums">
            {ujianAktif}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {db.Bank_Soal.length} soal tersedia
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            Peserta Sedang Ujian
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700 tabular-nums">
            {sedangUjian}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {db.Blokir.filter((b) => b.status === 'Terblokir').length} akun
            terblokir
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            Jumlah Pelanggaran
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-700 tabular-nums">
            {totalPelanggaran}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Tercatat otomatis di log
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            Rata-rata Nilai
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
            {rataRataNilai}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Dari {db.Hasil_Ujian.length} peserta selesai
          </div>
        </div>
      </div>

      {/* Dua Kolom: Ujian Aktif & Pelanggaran Terbaru */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Jadwal Ujian Aktif
            </h3>
            <button
              type="button"
              onClick={() => onNavigateTab('ujian')}
              className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
            >
              Kelola Ujian
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {db.Ujian.length === 0 ? (
              <div className="p-6 text-sm text-slate-500 text-center">
                Belum ada ujian dibuat.
              </div>
            ) : (
              db.Ujian.map((u) => (
                <div
                  key={u.id_ujian}
                  className="px-5 py-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {u.nama_ujian}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {u.mata_pelajaran} · {u.durasi_menit} menit · KKM {u.kkm}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-sm font-bold text-blue-700">
                      {u.token_ujian}
                    </div>
                    <div className="text-xs text-slate-500">{u.status}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Aktivitas Pelanggaran Terbaru
            </h3>
            <button
              type="button"
              onClick={() => onNavigateTab('log')}
              className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
            >
              Lihat Semua Log
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {db.Log_Pelanggaran.length === 0 ? (
              <div className="p-6 text-sm text-slate-500 text-center">
                Belum ada pelanggaran tercatat.
              </div>
            ) : (
              db.Log_Pelanggaran.slice(0, 5).map((log) => (
                <div
                  key={log.id_log}
                  className="px-5 py-3.5 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {log.nama}{' '}
                      <span className="font-normal text-slate-500">
                        ({log.kelas})
                      </span>
                    </div>
                    <div className="text-xs text-red-700 mt-0.5">
                      {log.jenis_pelanggaran}
                    </div>
                  </div>
                  <div className="text-right shrink-0 text-xs text-slate-500 tabular-nums">
                    <div>Ke-{log.jumlah_ke}</div>
                    <div>{formatDateTimeID(log.timestamp)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
