import React, { useState } from 'react';
import { ShieldCheck, ShieldOff } from 'lucide-react';
import { performAdminAction, updatePengaturan } from '../../store/cbtStore';
import { CbtDatabase } from '../../types/cbt';
import { formatDateTimeID } from '../../utils/crypto';

interface BlokirTabProps {
  db: CbtDatabase;
  onRefresh: (next: CbtDatabase) => void;
}

export const BlokirTab: React.FC<BlokirTabProps> = ({ db, onRefresh }) => {
  const [maxTab, setMaxTab] = useState(db.Pengaturan.max_pindah_tab);
  const [maxFs, setMaxFs] = useState(db.Pengaturan.max_keluar_fullscreen);
  const [maxTotal, setMaxTotal] = useState(db.Pengaturan.max_total_pelanggaran);
  const [toastMsg, setToastMsg] = useState('');

  const handleSaveRules = (e: React.FormEvent) => {
    e.preventDefault();
    const next = updatePengaturan({
      ...db.Pengaturan,
      max_pindah_tab: Math.max(1, maxTab),
      max_keluar_fullscreen: Math.max(1, maxFs),
      max_total_pelanggaran: Math.max(1, maxTotal),
    });
    onRefresh(next);
    setToastMsg('Kriteria batas blokir otomatis berhasil diperbarui.');
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleUnblock = (nis: string, idUjian: string) => {
    const next = performAdminAction('unblock', nis, idUjian);
    onRefresh(next);
    setToastMsg(`Blokir untuk NIS ${nis} berhasil dibuka.`);
    setTimeout(() => setToastMsg(''), 3000);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* Kriteria Blokir Otomatis */}
      <form
        onSubmit={handleSaveRules}
        className="xl:col-span-4 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
      >
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <ShieldCheck className="w-4 h-4 text-blue-700" />
          <h3>Kriteria Blokir Otomatis</h3>
        </div>
        <p className="text-xs text-slate-500">
          Peserta akan otomatis diblokir dan layar ujian dikunci apabila
          melewati salah satu ambang batas berikut:
        </p>

        {toastMsg && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-lg">
            {toastMsg}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Maksimal Pindah Tab / Jendela (kali)
          </label>
          <input
            type="number"
            min={1}
            max={20}
            value={maxTab}
            onChange={(e) => setMaxTab(Number(e.target.value))}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Maksimal Keluar Mode Layar Penuh (kali)
          </label>
          <input
            type="number"
            min={1}
            max={20}
            value={maxFs}
            onChange={(e) => setMaxFs(Number(e.target.value))}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Maksimal Total Semua Pelanggaran (kali)
          </label>
          <input
            type="number"
            min={1}
            max={30}
            value={maxTotal}
            onChange={(e) => setMaxTotal(Number(e.target.value))}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
          />
        </div>

        <button
          type="submit"
          className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
        >
          Simpan Aturan Blokir
        </button>
      </form>

      {/* Daftar Peserta Terblokir */}
      <div className="xl:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-900">
            Daftar Peserta Terblokir & Riwayat Blokir
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Peserta</th>
                <th className="px-4 py-3 text-left">Kelas</th>
                <th className="px-4 py-3 text-left">Alasan Blokir</th>
                <th className="px-4 py-3 text-left">Waktu</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {db.Blokir.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-8 text-center text-slate-500 text-sm"
                  >
                    Belum ada peserta yang diblokir.
                  </td>
                </tr>
              ) : (
                db.Blokir.map((b) => (
                  <tr key={b.id_blokir} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">
                        {b.nama}
                      </div>
                      <div className="font-mono text-slate-500">{b.nis}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{b.kelas}</td>
                    <td className="px-4 py-3 text-red-700 font-medium">
                      {b.alasan}
                    </td>
                    <td className="px-4 py-3 text-slate-500 tabular-nums">
                      {formatDateTimeID(b.waktu_blokir)}
                    </td>
                    <td className="px-4 py-3">
                      {b.status === 'Terblokir' ? (
                        <span className="font-bold text-red-700">
                          Terblokir
                        </span>
                      ) : (
                        <span className="font-semibold text-emerald-700">
                          Dibuka
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {b.status === 'Terblokir' && (
                        <button
                          type="button"
                          onClick={() => handleUnblock(b.nis, b.id_ujian)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg cursor-pointer"
                        >
                          <ShieldOff className="w-3.5 h-3.5" />
                          <span>Buka Blokir</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
