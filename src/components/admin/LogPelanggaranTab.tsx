import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { CbtDatabase } from '../../types/cbt';
import { formatDateTimeID } from '../../utils/crypto';
import { exportRowsToExcelOrCsv } from '../../utils/excelCsv';

interface LogPelanggaranTabProps {
  db: CbtDatabase;
}

export const LogPelanggaranTab: React.FC<LogPelanggaranTabProps> = ({ db }) => {
  const [filterKelas, setFilterKelas] = useState('ALL');
  const [filterUjian, setFilterUjian] = useState('ALL');
  const [search, setSearch] = useState('');

  const filtered = db.Log_Pelanggaran.filter((log) => {
    const mKelas = filterKelas === 'ALL' || log.kelas === filterKelas;
    const mUjian = filterUjian === 'ALL' || log.id_ujian === filterUjian;
    const mSearch =
      log.nama.toLowerCase().includes(search.toLowerCase()) ||
      log.jenis_pelanggaran.toLowerCase().includes(search.toLowerCase()) ||
      log.nis.includes(search);
    return mKelas && mUjian && mSearch;
  });

  const handleExport = (format: 'xlsx' | 'csv') => {
    const rows = filtered.map((l) => ({
      Waktu: formatDateTimeID(l.timestamp),
      NIS: l.nis,
      Nama: l.nama,
      Kelas: l.kelas,
      Ujian: l.nama_ujian,
      'Jenis Pelanggaran': l.jenis_pelanggaran,
      'Pelanggaran Ke': l.jumlah_ke,
    }));
    exportRowsToExcelOrCsv(
      rows,
      'Log_Pelanggaran',
      'Laporan_Log_Pelanggaran',
      format
    );
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, NIS, atau jenis pelanggaran..."
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg w-60"
          />
          <select
            value={filterKelas}
            onChange={(e) => setFilterKelas(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
          >
            <option value="ALL">Semua Kelas</option>
            {db.Kelas.map((k) => (
              <option key={k.id_kelas} value={k.nama_kelas}>
                {k.nama_kelas}
              </option>
            ))}
          </select>
          <select
            value={filterUjian}
            onChange={(e) => setFilterUjian(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
          >
            <option value="ALL">Semua Ujian</option>
            {db.Ujian.map((u) => (
              <option key={u.id_ujian} value={u.id_ujian}>
                {u.nama_ujian}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleExport('xlsx')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor Excel</span>
          </button>
          <button
            type="button"
            onClick={() => handleExport('csv')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Waktu</th>
                <th className="px-4 py-3 text-left">Nama Peserta</th>
                <th className="px-4 py-3 text-left">Kelas</th>
                <th className="px-4 py-3 text-left">Jenis Pelanggaran</th>
                <th className="px-4 py-3 text-right">Jumlah Ke-</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-8 text-center text-slate-500 text-sm"
                  >
                    Tidak ada log pelanggaran yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id_log} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-slate-600 tabular-nums whitespace-nowrap">
                      {formatDateTimeID(log.timestamp)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-900">
                        {log.nama}
                      </span>{' '}
                      <span className="font-mono text-slate-500">
                        ({log.nis})
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{log.kelas}</td>
                    <td className="px-4 py-3 font-semibold text-red-700">
                      {log.jenis_pelanggaran}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold tabular-nums">
                      {log.jumlah_ke}
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
