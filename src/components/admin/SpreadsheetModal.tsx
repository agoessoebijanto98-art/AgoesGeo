import React, { useState } from 'react';
import { ExternalLink, FileSpreadsheet, X } from 'lucide-react';
import { CbtDatabase } from '../../types/cbt';

interface SpreadsheetModalProps {
  db: CbtDatabase;
  onClose: () => void;
}

const SHEET_NAMES = [
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
] as const;

type SheetTab = (typeof SHEET_NAMES)[number];

export const SpreadsheetModal: React.FC<SpreadsheetModalProps> = ({
  db,
  onClose,
}) => {
  const [activeSheet, setActiveSheet] = useState<SheetTab>('Hasil_Ujian');

  const getRowsForSheet = (sheet: SheetTab): Record<string, unknown>[] => {
    if (sheet === 'Pengaturan') {
      return Object.entries(db.Pengaturan).map(([kunci, nilai]) => ({
        kunci,
        nilai: String(nilai),
      }));
    }
    const data = db[sheet] as unknown as Record<string, unknown>[];
    return data.map((row) => {
      const clean: Record<string, unknown> = {};
      Object.entries(row).forEach(([k, v]) => {
        if (typeof v === 'object' && v !== null) {
          clean[k] = JSON.stringify(v);
        } else {
          clean[k] = v;
        }
      });
      return clean;
    });
  };

  const rows = getRowsForSheet(activeSheet);
  const columns = rows.length > 0 ? Object.keys(rows[0]) : ['Info'];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden">
        {/* Top Spreadsheet Title Bar */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-4 bg-slate-50">
          <div className="flex items-center gap-3 min-w-0">
            <FileSpreadsheet className="w-5 h-5 text-emerald-700 shrink-0" />
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 truncate">
                DB_Assist_Aassesment_SMAN1_Pamekasan (Pratinjau Live 10 Sheet Google Sheets)
              </h3>
              <p className="text-xs text-slate-500 font-mono truncate">
                ID: {db.Pengaturan.spreadsheet_id}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={`https://docs.google.com/spreadsheets/d/${db.Pengaturan.spreadsheet_id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 whitespace-nowrap"
            >
              <span>Buka Format Google Sheets</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-900 cursor-pointer"
              aria-label="Tutup pratinjau spreadsheet"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Grid Area */}
        <div className="flex-1 overflow-auto bg-white">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-100 z-10">
              <tr>
                <th className="border border-slate-200 px-2.5 py-2 text-center font-mono text-slate-500 w-10">
                  #
                </th>
                {columns.map((col) => (
                  <th
                    key={col}
                    className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-800 whitespace-nowrap font-mono"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="p-8 text-center text-slate-500"
                  >
                    Sheet &ldquo;{activeSheet}&rdquo; belum memiliki baris data.
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/40">
                    <td className="border border-slate-200 px-2.5 py-1.5 text-center font-mono text-slate-400 bg-slate-50 tabular-nums">
                      {idx + 2}
                    </td>
                    {columns.map((col) => {
                      const val = String(row[col] ?? '');
                      return (
                        <td
                          key={col}
                          className="border border-slate-200 px-3 py-1.5 text-slate-700 max-w-xs truncate font-mono"
                          title={val}
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Google Sheets Tabs */}
        <div className="border-t border-slate-200 bg-slate-100 px-3 py-2 flex items-center gap-1 overflow-x-auto">
          {SHEET_NAMES.map((name) => {
            const count =
              name === 'Pengaturan'
                ? Object.keys(db.Pengaturan).length
                : (db[name] as unknown[]).length;
            const active = activeSheet === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => setActiveSheet(name)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  active
                    ? 'bg-white text-emerald-800 font-semibold border border-slate-300 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                {name}{' '}
                <span className="text-slate-400 tabular-nums">({count})</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
