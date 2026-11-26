import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  Flag,
  RefreshCw,
  ShieldOff,
} from 'lucide-react';
import { loadDatabase, performAdminAction } from '../../store/cbtStore';
import { CbtDatabase, StatusSesi } from '../../types/cbt';
import { formatCountdown, formatTimeOnlyID } from '../../utils/crypto';

interface MonitoringTabProps {
  db: CbtDatabase;
  onRefresh: (next: CbtDatabase) => void;
}

export const MonitoringTab: React.FC<MonitoringTabProps> = ({
  db,
  onRefresh,
}) => {
  const [selectedUjianId, setSelectedUjianId] = useState(
    db.Ujian[0]?.id_ujian || ''
  );
  const [filterKelas, setFilterKelas] = useState('ALL');
  const [refreshIntervalSec, setRefreshIntervalSec] = useState<number>(5);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>(
    new Date().toISOString()
  );
  const [nowTick, setNowTick] = useState(Date.now());
  const [warnTargetNis, setWarnTargetNis] = useState<string | null>(null);
  const [warnMessage, setWarnMessage] = useState(
    'Harap fokus pada layar ujian dan jangan meninggalkan halaman!'
  );
  const [toastMsg, setToastMsg] = useState('');

  // Auto-refresh data monitoring setiap 5–10 detik sesuai pilihan
  useEffect(() => {
    const interval = setInterval(() => {
      onRefresh(loadDatabase());
      setLastSyncedAt(new Date().toISOString());
    }, refreshIntervalSec * 1000);
    return () => clearInterval(interval);
  }, [refreshIntervalSec, onRefresh]);

  // Tick timer 1 detik untuk menampilkan sisa waktu live
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const selectedUjian = db.Ujian.find((u) => u.id_ujian === selectedUjianId);
  const totalSoalDefault = db.Bank_Soal.length;

  const pesertaList = db.Peserta.filter((p) => {
    const inExamClass = selectedUjian
      ? selectedUjian.kelas_peserta.includes(p.nama_kelas)
      : true;
    const matchKelas = filterKelas === 'ALL' || p.nama_kelas === filterKelas;
    return inExamClass && matchKelas;
  });

  const handleAction = (
    action:
      | 'warn'
      | 'block'
      | 'unblock'
      | 'add_time'
      | 'force_finish'
      | 'reset_login',
    nis: string,
    message?: string,
    minutes?: number
  ) => {
    const next = performAdminAction(action, nis, selectedUjianId, {
      message,
      minutes,
    });
    onRefresh(next);
    setToastMsg(`Aksi "${action}" untuk NIS ${nis} berhasil dijalankan.`);
    setTimeout(() => setToastMsg(''), 3000);
  };

  return (
    <div className="space-y-5">
      {toastMsg && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold rounded-lg">
          {toastMsg}
        </div>
      )}

      {/* Filter & Auto-Refresh Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedUjianId}
            onChange={(e) => setSelectedUjianId(e.target.value)}
            className="px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
          >
            {db.Ujian.map((u) => (
              <option key={u.id_ujian} value={u.id_ujian}>
                {u.nama_ujian} ({u.token_ujian})
              </option>
            ))}
          </select>

          <select
            value={filterKelas}
            onChange={(e) => setFilterKelas(e.target.value)}
            className="px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
          >
            <option value="ALL">Semua Kelas</option>
            {db.Kelas.map((k) => (
              <option key={k.id_kelas} value={k.nama_kelas}>
                {k.nama_kelas}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Sinkron terakhir: {formatTimeOnlyID(lastSyncedAt)}</span>
          </div>
          <select
            value={refreshIntervalSec}
            onChange={(e) => setRefreshIntervalSec(Number(e.target.value))}
            className="px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
          >
            <option value={5}>Refresh 5 detik</option>
            <option value={10}>Refresh 10 detik</option>
          </select>
          <button
            type="button"
            onClick={() => {
              onRefresh(loadDatabase());
              setLastSyncedAt(new Date().toISOString());
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Modal Peringatan Custom */}
      {warnTargetNis && (
        <div className="bg-white border border-amber-300 rounded-xl p-4 space-y-3">
          <div className="text-xs font-bold text-slate-900">
            Kirim Peringatan ke Layar Peserta (NIS: {warnTargetNis})
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={warnMessage}
              onChange={(e) => setWarnMessage(e.target.value)}
              className="flex-1 min-w-[240px] px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
            <button
              type="button"
              onClick={() => {
                handleAction('warn', warnTargetNis, warnMessage);
                setWarnTargetNis(null);
              }}
              className="px-4 py-2 text-xs font-semibold bg-amber-600 text-white rounded-lg cursor-pointer"
            >
              Kirim Peringatan
            </button>
            <button
              type="button"
              onClick={() => setWarnTargetNis(null)}
              className="px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg cursor-pointer"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Tabel Monitoring */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">NIS & Nama</th>
                <th className="px-4 py-3 text-left">Kelas</th>
                <th className="px-4 py-3 text-left">Status Ujian</th>
                <th className="px-4 py-3 text-right">Progres</th>
                <th className="px-4 py-3 text-right">Sisa Waktu</th>
                <th className="px-4 py-3 text-right">Pelanggaran</th>
                <th className="px-4 py-3 text-left">Aktivitas Terakhir</th>
                <th className="px-4 py-3 text-right">Aksi Pengawas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pesertaList.map((p) => {
                const sesi = db.Jawaban_Peserta.find(
                  (j) => j.nis === p.nis && j.id_ujian === selectedUjianId
                );
                const hasil = db.Hasil_Ujian.find(
                  (h) => h.nis === p.nis && h.id_ujian === selectedUjianId
                );

                let status: StatusSesi = 'Belum Masuk';
                if (sesi) status = sesi.status;
                else if (hasil) status = 'Selesai';

                const answeredCount = sesi
                  ? Object.values(sesi.jawaban_map).filter(
                      (v) => v && v.trim().length > 0
                    ).length
                  : 0;
                const totalSoal = sesi
                  ? sesi.urutan_soal.length
                  : totalSoalDefault;

                const remSeconds =
                  sesi && status === 'Sedang Ujian'
                    ? Math.max(
                        0,
                        Math.floor(
                          (new Date(sesi.waktu_selesai_target).getTime() -
                            nowTick) /
                            1000
                        )
                      )
                    : 0;

                return (
                  <tr key={p.id_peserta} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">
                        {p.nama}
                      </div>
                      <div className="font-mono text-slate-500 tabular-nums">
                        {p.nis} · Login: {p.status_login}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{p.nama_kelas}</td>
                    <td className="px-4 py-3">
                      {status === 'Sedang Ujian' && (
                        <span className="inline-flex items-center gap-1 font-semibold text-blue-700">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Sedang Ujian</span>
                        </span>
                      )}
                      {status === 'Selesai' && (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Selesai</span>
                        </span>
                      )}
                      {status === 'Diblokir' && (
                        <span className="inline-flex items-center gap-1 font-semibold text-red-700">
                          <Ban className="w-3.5 h-3.5" />
                          <span>Diblokir</span>
                        </span>
                      )}
                      {status === 'Belum Masuk' && (
                        <span className="text-slate-500">Belum Masuk</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {sesi ? `${answeredCount}/${totalSoal}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold">
                      {status === 'Sedang Ujian'
                        ? formatCountdown(remSeconds)
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      <span
                        className={
                          (sesi?.jumlah_pelanggaran || 0) > 0
                            ? 'text-red-700 font-bold'
                            : 'text-slate-600'
                        }
                      >
                        {sesi?.jumlah_pelanggaran ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 tabular-nums">
                      {sesi ? formatTimeOnlyID(sesi.last_activity) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1 flex-wrap justify-end">
                        {status === 'Sedang Ujian' && (
                          <>
                            <button
                              type="button"
                              title="Beri Peringatan"
                              onClick={() => setWarnTargetNis(p.nis)}
                              className="px-2 py-1 border border-amber-300 text-amber-800 bg-amber-50 rounded hover:bg-amber-100 cursor-pointer"
                            >
                              <AlertTriangle className="w-3 h-3 inline mr-1" />
                              Peringatkan
                            </button>
                            <button
                              type="button"
                              title="Tambah Waktu +10 Menit"
                              onClick={() =>
                                handleAction('add_time', p.nis, undefined, 10)
                              }
                              className="px-2 py-1 border border-slate-300 text-slate-700 rounded hover:bg-slate-100 cursor-pointer"
                            >
                              +10m
                            </button>
                            <button
                              type="button"
                              title="Blokir Peserta"
                              onClick={() => handleAction('block', p.nis)}
                              className="px-2 py-1 border border-red-300 text-red-700 bg-red-50 rounded hover:bg-red-100 cursor-pointer"
                            >
                              Blokir
                            </button>
                            <button
                              type="button"
                              title="Paksa Selesai"
                              onClick={() =>
                                handleAction('force_finish', p.nis)
                              }
                              className="px-2 py-1 border border-slate-300 text-slate-700 rounded hover:bg-slate-100 cursor-pointer"
                            >
                              <Flag className="w-3 h-3 inline mr-1" />
                              Selesai
                            </button>
                          </>
                        )}
                        {status === 'Diblokir' && (
                          <button
                            type="button"
                            onClick={() => handleAction('unblock', p.nis)}
                            className="px-2.5 py-1 bg-emerald-700 text-white rounded hover:bg-emerald-800 cursor-pointer inline-flex items-center gap-1"
                          >
                            <ShieldOff className="w-3 h-3" />
                            <span>Buka Blokir</span>
                          </button>
                        )}
                        {p.status_login === 'Online' && (
                          <button
                            type="button"
                            title="Reset Login Perangkat"
                            onClick={() => handleAction('reset_login', p.nis)}
                            className="px-2 py-1 border border-slate-300 text-slate-700 rounded hover:bg-slate-100 cursor-pointer"
                          >
                            Reset Login
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
