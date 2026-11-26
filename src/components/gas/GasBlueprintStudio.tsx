import React, { useState } from 'react';
import JSZip from 'jszip';
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  FileCode2,
  Layers,
  Rocket,
} from 'lucide-react';
import {
  GAS_ARCHITECTURE_STAGES,
  GAS_DEPLOY_STEPS,
  GAS_SOURCE_FILES,
  SHEET_SCHEMA_DOCS,
} from '../../gas/gasCodeFiles';

interface GasBlueprintStudioProps {
  onBack: () => void;
}

export const GasBlueprintStudio: React.FC<GasBlueprintStudioProps> = ({
  onBack,
}) => {
  const [section, setSection] = useState<'arsitektur' | 'kode' | 'deploy'>(
    'arsitektur'
  );
  const [activeFileId, setActiveFileId] = useState<string>(
    GAS_SOURCE_FILES[0].id
  );
  const [copiedId, setCopiedId] = useState<string>('');

  const activeFile =
    GAS_SOURCE_FILES.find((f) => f.id === activeFileId) || GAS_SOURCE_FILES[0];

  const handleCopy = async (id: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(''), 2000);
    } catch {
      // Fallback tidak melakukan apa-apa
    }
  };

  const handleDownloadAllZip = async () => {
    const zip = new JSZip();
    GAS_SOURCE_FILES.forEach((file) => {
      zip.file(file.filename, file.code);
    });
    const readme = [
      'PANDUAN DEPLOY ASSIST_AASSESMENT CBT — SMAN 1 PAMEKASAN',
      '======================================================',
      ...GAS_DEPLOY_STEPS.map(
        (s) => `${s.nomor}. ${s.judul}\n   ${s.detail}\n`
      ),
    ].join('\n');
    zip.file('PANDUAN_DEPLOY.txt', readme);

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Assist_Aassesment_CBT_SMAN1_Pamekasan_GAS.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-6">
        <div className="flex items-center gap-4 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Aplikasi</span>
          </button>
          <img
            src="/assets/aistudio/LOGO_SMANSA_TRANSAPARAN_09d9bfb0.png"
            alt="Logo SMAN 1 Pamekasan"
            className="w-7 h-9 object-contain shrink-0 hidden sm:block"
          />
          <h1 className="text-base lg:text-lg font-bold text-slate-900 truncate">
            Rancangan Database, Modul Proctoring & Kode GAS — SMAN 1 Pamekasan
          </h1>
        </div>

        <button
          type="button"
          onClick={handleDownloadAllZip}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg cursor-pointer whitespace-nowrap shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Unduh Paket GAS (.zip)</span>
        </button>
      </header>

      {/* Sub-navigation Tabs */}
      <div className="bg-white border-b border-slate-200 px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-6">
          <button
            type="button"
            onClick={() => setSection('arsitektur')}
            className={`py-3.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              section === 'arsitektur'
                ? 'border-blue-700 text-blue-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>01. Rancangan Struktur & Alur</span>
          </button>
          <button
            type="button"
            onClick={() => setSection('kode')}
            className={`py-3.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              section === 'kode'
                ? 'border-blue-700 text-blue-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCode2 className="w-4 h-4" />
            <span>02. Kode Lengkap (Code.gs, Index, CSS, JS)</span>
          </button>
          <button
            type="button"
            onClick={() => setSection('deploy')}
            className={`py-3.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              section === 'deploy'
                ? 'border-blue-700 text-blue-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Rocket className="w-4 h-4" />
            <span>03. Langkah Deploy Web App</span>
          </button>
        </div>
      </div>

      {/* Main Studio Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        {section === 'arsitektur' && (
          <div className="space-y-8">
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="text-lg font-bold text-slate-900">
                Arsitektur Aplikasi & Skema 10 Sheet Google Sheets
              </h2>
              <p className="text-sm text-slate-600 mt-1 max-w-3xl">
                Dirancang bertahap agar mampu menangani minimal 200 peserta
                secara bersamaan tanpa bentrok data penulisan di Google Sheets.
              </p>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {GAS_ARCHITECTURE_STAGES.map((stage) => (
                  <div
                    key={stage.step}
                    className="border border-slate-200 rounded-lg p-5 bg-slate-50/50 space-y-3"
                  >
                    <div className="text-xs font-semibold text-blue-700 font-mono">
                      Tahap {stage.step}
                    </div>
                    <h3 className="text-base font-bold text-slate-900">
                      {stage.title}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {stage.summary}
                    </p>
                    <div className="text-xs text-slate-500 pt-1 font-mono">
                      Sheet terkait: {stage.sheets.join(' · ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabel Spesifikasi Struktur 10 Sheet Google Sheets */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="text-base font-bold text-slate-900">
                  Struktur Lengkap 10 Sheet Database Google Sheets & Strategi LockService
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Dibuat otomatis oleh fungsi initDatabase() di Code.gs saat Web App pertama kali dijalankan.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 text-left">Nama Sheet</th>
                      <th className="px-4 py-3 text-left">Fungsi</th>
                      <th className="px-4 py-3 text-left">Struktur Kolom Header</th>
                      <th className="px-4 py-3 text-left">Konkurensi (LockService / Cache)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {SHEET_SCHEMA_DOCS.map((doc) => (
                      <tr key={doc.sheetName} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono font-bold text-blue-700 whitespace-nowrap">
                          {doc.sheetName}
                        </td>
                        <td className="px-4 py-3 text-slate-700 min-w-[200px]">
                          {doc.purpose}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600">
                          {doc.columns.join(', ')}
                        </td>
                        <td className="px-4 py-3 text-slate-600 min-w-[210px]">
                          {doc.lockStrategy}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="text-base font-bold text-slate-900 mb-4">
                Alur Data End-to-End (Admin · Peserta · Proctoring)
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-sm">
                <div className="border border-slate-200 rounded-lg p-4 space-y-2">
                  <div className="font-bold text-slate-900">
                    1. Alur Admin & Persiapan
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-600">
                    <li>Login Admin via hash SHA-256</li>
                    <li>Buat Kelas & Impor Peserta CSV/Excel</li>
                    <li>Susun Bank Soal (5 tipe + gambar)</li>
                    <li>Atur Ujian, KKM, & Generate Token</li>
                    <li>Pantau peserta live setiap 5–10 detik</li>
                  </ol>
                </div>
                <div className="border border-slate-200 rounded-lg p-4 space-y-2">
                  <div className="font-bold text-slate-900">
                    2. Alur Ujian Peserta
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-600">
                    <li>Login dengan NIS & Token Ujian</li>
                    <li>Konfirmasi data & pilih ujian aktif</li>
                    <li>Masuk mode layar penuh wajib</li>
                    <li>Auto-save ke localStorage & Google Sheets</li>
                    <li>Selesai ujian & hitung skor ke Hasil_Ujian</li>
                  </ol>
                </div>
                <div className="border border-slate-200 rounded-lg p-4 space-y-2">
                  <div className="font-bold text-slate-900">
                    3. Alur Keamanan & Anti-Bentrok
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-600">
                    <li>Deteksi pindah tab, blur, klik kanan, copy/paste</li>
                    <li>Catat ke sheet Log_Pelanggaran + pop-up sisa batas</li>
                    <li>Kunci layar otomatis jika melebihi nilai X</li>
                    <li>LockService.getScriptLock() saat tulis sheet</li>
                    <li>CacheService untuk baca soal 200+ peserta</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

        {section === 'kode' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* File Selector */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="px-2 py-1 text-xs font-semibold text-slate-500">
                Modul File Google Apps Script
              </div>
              {GAS_SOURCE_FILES.map((file) => {
                const isActive = file.id === activeFile.id;
                return (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => setActiveFileId(file.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-blue-50 border-blue-200 text-blue-900'
                        : 'bg-white border-transparent hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-semibold">
                        {file.filename}
                      </span>
                      <span className="text-xs text-slate-500">
                        {file.gasType}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                      {file.moduleLabel}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Code Viewer */}
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="font-mono text-base font-bold text-slate-900">
                    {activeFile.filename}
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {activeFile.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(activeFile.id, activeFile.code)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                >
                  {copiedId === activeFile.id ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Salin Kode</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-5 bg-slate-950 text-slate-100 text-xs font-mono leading-relaxed overflow-auto max-h-[68vh]">
                <code>{activeFile.code}</code>
              </pre>
            </div>
          </div>
        )}

        {section === 'deploy' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 lg:p-8 max-w-4xl">
            <h2 className="text-lg font-bold text-slate-900">
              Panduan Deploy ke Google Apps Script Web App
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Ikuti langkah berikut secara berurutan di akun Google Admin agar
              database Spreadsheet otomatis terbentuk di Google Drive.
            </p>

            <div className="mt-6 space-y-4">
              {GAS_DEPLOY_STEPS.map((step) => (
                <div
                  key={step.nomor}
                  className="flex gap-4 p-4 border border-slate-200 rounded-lg"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-700 text-white font-mono text-sm font-bold flex items-center justify-center shrink-0 tabular-nums">
                    {step.nomor}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {step.judul}
                    </h3>
                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                      {step.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
