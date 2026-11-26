import React, { useState } from 'react';
import { Download, FileSpreadsheet, Printer } from 'lucide-react';
import { CbtDatabase } from '../../types/cbt';
import { formatDateTimeID } from '../../utils/crypto';
import { exportRowsToExcelOrCsv } from '../../utils/excelCsv';

interface HasilLaporanTabProps {
  db: CbtDatabase;
  onOpenSpreadsheet: () => void;
}

export const HasilLaporanTab: React.FC<HasilLaporanTabProps> = ({
  db,
  onOpenSpreadsheet,
}) => {
  const [filterUjian, setFilterUjian] = useState('ALL');
  const [filterKelas, setFilterKelas] = useState('ALL');
  const [viewMode, setViewMode] = useState<'rekap' | 'analisis'>('rekap');

  const filteredHasil = db.Hasil_Ujian.filter((h) => {
    const mUjian = filterUjian === 'ALL' || h.id_ujian === filterUjian;
    const mKelas = filterKelas === 'ALL' || h.kelas === filterKelas;
    return mUjian && mKelas;
  });

  // Hitung Analisis Butir Soal (% Benar per soal)
  const analisisSoal = db.Bank_Soal.map((soal) => {
    let dijawab = 0;
    let benar = 0;
    filteredHasil.forEach((h) => {
      if (h.detail_benar_map && soal.id_soal in h.detail_benar_map) {
        dijawab += 1;
        if (h.detail_benar_map[soal.id_soal]) benar += 1;
      }
    });
    const persen = dijawab > 0 ? Math.round((benar / dijawab) * 100) : 0;
    const kesukaran =
      dijawab === 0
        ? 'Belum Ada Data'
        : persen >= 70
          ? 'Mudah'
          : persen >= 40
            ? 'Sedang'
            : 'Sukar';
    return { soal, dijawab, benar, persen, kesukaran };
  });

  const handleExport = (format: 'xlsx' | 'csv') => {
    const rows = filteredHasil.map((h) => ({
      NIS: h.nis,
      Nama: h.nama,
      Kelas: h.kelas,
      Ujian: h.nama_ujian,
      Nilai: h.nilai,
      Benar: h.jumlah_benar,
      Salah: h.jumlah_salah,
      Pelanggaran: h.jumlah_pelanggaran,
      'Waktu Mulai': formatDateTimeID(h.waktu_mulai),
      'Waktu Selesai': formatDateTimeID(h.waktu_selesai),
      Status: h.status,
    }));
    exportRowsToExcelOrCsv(rows, 'Hasil_Ujian', 'Rekap_Nilai_CBT', format);
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="no-print bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 bg-slate-100 rounded-lg mr-2">
            <button
              type="button"
              onClick={() => setViewMode('rekap')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
                viewMode === 'rekap'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600'
              }`}
            >
              Rekap Nilai Peserta
            </button>
            <button
              type="button"
              onClick={() => setViewMode('analisis')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
                viewMode === 'analisis'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600'
              }`}
            >
              Analisis Butir Soal
            </button>
          </div>

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
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak / PDF</span>
          </button>
          <button
            type="button"
            onClick={onOpenSpreadsheet}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Buka Spreadsheet Database</span>
          </button>
        </div>
      </div>

      {viewMode === 'rekap' ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden print-full">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">NIS & Nama</th>
                  <th className="px-4 py-3 text-left">Kelas</th>
                  <th className="px-4 py-3 text-left">Ujian</th>
                  <th className="px-4 py-3 text-right">Benar / Salah</th>
                  <th className="px-4 py-3 text-right">Pelanggaran</th>
                  <th className="px-4 py-3 text-right">Nilai</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHasil.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-8 text-center text-slate-500 text-sm"
                    >
                      Belum ada hasil ujian pada filter ini.
                    </td>
                  </tr>
                ) : (
                  filteredHasil.map((h) => (
                    <tr key={h.id_hasil} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">
                          {h.nama}
                        </div>
                        <div className="font-mono text-slate-500">{h.nis}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{h.kelas}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                        {h.nama_ujian}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">
                        <span className="text-emerald-700 font-semibold">
                          {h.jumlah_benar}
                        </span>{' '}
                        /{' '}
                        <span className="text-red-700">{h.jumlah_salah}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">
                        {h.jumlah_pelanggaran}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm font-bold text-slate-900 tabular-nums">
                        {h.nilai}
                      </td>
                      <td className="px-4 py-3">
                        {h.status === 'Tuntas' ? (
                          <span className="font-semibold text-emerald-700">
                            Tuntas
                          </span>
                        ) : (
                          <span className="font-semibold text-amber-700">
                            {h.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden print-full">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">No</th>
                  <th className="px-4 py-3 text-left">Tipe</th>
                  <th className="px-4 py-3 text-left">Cuplikan Pertanyaan</th>
                  <th className="px-4 py-3 text-right">Penjawab</th>
                  <th className="px-4 py-3 text-right">Benar</th>
                  <th className="px-4 py-3 text-right">% Benar</th>
                  <th className="px-4 py-3 text-left">Tingkat Kesukaran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analisisSoal.map((row) => (
                  <tr key={row.soal.id_soal} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-bold tabular-nums">
                      {row.soal.nomor}
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {row.soal.tipe_soal}
                    </td>
                    <td className="px-4 py-3 max-w-md truncate text-slate-800">
                      {row.soal.pertanyaan}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {row.dijawab}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {row.benar}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold tabular-nums">
                      {row.persen}%
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700">
                      {row.kesukaran}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
