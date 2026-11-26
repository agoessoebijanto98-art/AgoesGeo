import React, { useState } from 'react';
import {
  Copy,
  Download,
  Image as ImageIcon,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  addSoalBatch,
  loadDatabase,
  saveDatabase,
  upsertSoal,
} from '../../store/cbtStore';
import { BankSoalRecord, CbtDatabase, TipeSoal } from '../../types/cbt';
import { generateId } from '../../utils/crypto';
import {
  downloadTemplateSoal,
  ParsedSoalPreviewRow,
  parseSoalFile,
  previewRowsToSoalRecords,
} from '../../utils/excelCsv';

interface BankSoalTabProps {
  db: CbtDatabase;
  onRefresh: (next: CbtDatabase) => void;
}

const TIPE_LABELS: Record<TipeSoal, string> = {
  PG: 'Pilihan Ganda',
  PG_KOMPLEKS: 'PG Kompleks',
  BENAR_SALAH: 'Benar / Salah',
  ISIAN_SINGKAT: 'Isian Singkat',
  URAIAN: 'Uraian / Esai',
};

export const BankSoalTab: React.FC<BankSoalTabProps> = ({ db, onRefresh }) => {
  const [filterTipe, setFilterTipe] = useState<string>('ALL');
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [nomor, setNomor] = useState(db.Bank_Soal.length + 1);
  const [tipeSoal, setTipeSoal] = useState<TipeSoal>('PG');
  const [kategori, setKategori] = useState('Matematika & Sains');
  const [bobot, setBobot] = useState(10);
  const [pertanyaan, setPertanyaan] = useState('');
  const [gambarUrl, setGambarUrl] = useState('');
  const [opsiA, setOpsiA] = useState('');
  const [opsiB, setOpsiB] = useState('');
  const [opsiC, setOpsiC] = useState('');
  const [opsiD, setOpsiD] = useState('');
  const [opsiE, setOpsiE] = useState('');
  const [kunciJawaban, setKunciJawaban] = useState('A');

  const [importPreview, setImportPreview] = useState<
    ParsedSoalPreviewRow[] | null
  >(null);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const resetForm = () => {
    setEditId(null);
    setNomor(db.Bank_Soal.length + 1);
    setTipeSoal('PG');
    setKategori('Matematika & Sains');
    setBobot(10);
    setPertanyaan('');
    setGambarUrl('');
    setOpsiA('');
    setOpsiB('');
    setOpsiC('');
    setOpsiD('');
    setOpsiE('');
    setKunciJawaban('A');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setGambarUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSoal = (e: React.FormEvent) => {
    e.preventDefault();
    const next = upsertSoal({
      id_soal: editId || undefined,
      nomor,
      pertanyaan: pertanyaan.trim(),
      gambar_url: gambarUrl.trim(),
      opsi_a: tipeSoal === 'BENAR_SALAH' ? 'Benar' : opsiA.trim(),
      opsi_b: tipeSoal === 'BENAR_SALAH' ? 'Salah' : opsiB.trim(),
      opsi_c: opsiC.trim(),
      opsi_d: opsiD.trim(),
      opsi_e: opsiE.trim(),
      kunci_jawaban: kunciJawaban.trim(),
      bobot,
      tipe_soal: tipeSoal,
      kategori: kategori.trim(),
    });
    onRefresh(next);
    resetForm();
    setShowForm(false);
    showToast('Soal berhasil disimpan ke Bank Soal.');
  };

  const handleEditSoal = (s: BankSoalRecord) => {
    setEditId(s.id_soal);
    setNomor(s.nomor);
    setTipeSoal(s.tipe_soal);
    setKategori(s.kategori);
    setBobot(s.bobot);
    setPertanyaan(s.pertanyaan);
    setGambarUrl(s.gambar_url);
    setOpsiA(s.opsi_a);
    setOpsiB(s.opsi_b);
    setOpsiC(s.opsi_c);
    setOpsiD(s.opsi_d);
    setOpsiE(s.opsi_e);
    setKunciJawaban(s.kunci_jawaban);
    setShowForm(true);
  };

  const handleDuplicateSoal = (s: BankSoalRecord) => {
    const next = loadDatabase();
    const copy: BankSoalRecord = {
      ...s,
      id_soal: generateId('SOL'),
      nomor: next.Bank_Soal.length + 1,
      pertanyaan: `${s.pertanyaan} (Salinan)`,
    };
    next.Bank_Soal.push(copy);
    saveDatabase(next);
    onRefresh(next);
    showToast('Soal berhasil diduplikasi.');
  };

  const handleDeleteSoal = (id: string) => {
    const next = loadDatabase();
    next.Bank_Soal = next.Bank_Soal.filter((s) => s.id_soal !== id);
    saveDatabase(next);
    onRefresh(next);
    showToast('Soal dihapus dari Bank Soal.');
  };

  const handleUploadTemplate = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const parsed = await parseSoalFile(file);
    setImportPreview(parsed);
    e.target.value = '';
  };

  const handleConfirmImportSoal = () => {
    if (!importPreview) return;
    const records = previewRowsToSoalRecords(importPreview);
    const next = addSoalBatch(records);
    onRefresh(next);
    setImportPreview(null);
    showToast(`${records.length} soal valid berhasil ditambahkan.`);
  };

  const filteredSoal = db.Bank_Soal.filter(
    (s) => filterTipe === 'ALL' || s.tipe_soal === filterTipe
  );

  return (
    <div className="space-y-6">
      {toastMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium rounded-lg">
          {toastMsg}
        </div>
      )}

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterTipe}
            onChange={(e) => setFilterTipe(e.target.value)}
            className="px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
          >
            <option value="ALL">Semua Tipe ({db.Bank_Soal.length})</option>
            {Object.entries(TIPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => downloadTemplateSoal('xlsx')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh Template Excel</span>
          </button>
          <button
            type="button"
            onClick={() => downloadTemplateSoal('csv')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh Template CSV</span>
          </button>
          <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 cursor-pointer whitespace-nowrap">
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Soal Excel/CSV</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleUploadTemplate}
              className="hidden"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowForm((prev) => !prev);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-lg cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>{showForm ? 'Tutup Form' : 'Tambah Soal Manual'}</span>
          </button>
        </div>
      </div>

      {/* Pratinjau Upload Template Soal */}
      {importPreview && (
        <div className="bg-white border border-blue-200 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Pratinjau Validasi Upload Soal (
                {importPreview.filter((r) => r.valid).length} valid dari{' '}
                {importPreview.length} baris)
              </h4>
              <p className="text-xs text-slate-500">
                Periksa kembali soal dan kunci jawaban sebelum disimpan ke
                sheet Bank_Soal.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setImportPreview(null)}
                className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmImportSoal}
                className="px-4 py-1.5 text-xs font-semibold bg-blue-700 text-white rounded-lg cursor-pointer"
              >
                Simpan Soal Valid
              </button>
            </div>
          </div>
          <div className="max-h-64 overflow-auto border border-slate-200 rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-2.5 text-left">No</th>
                  <th className="p-2.5 text-left">Tipe</th>
                  <th className="p-2.5 text-left">Pertanyaan</th>
                  <th className="p-2.5 text-left">Kunci</th>
                  <th className="p-2.5 text-right">Bobot</th>
                  <th className="p-2.5 text-left">Validasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {importPreview.map((row) => (
                  <tr key={row.rowIndex}>
                    <td className="p-2.5 tabular-nums">{row.nomor}</td>
                    <td className="p-2.5 font-mono">{row.tipe_soal}</td>
                    <td className="p-2.5 max-w-md truncate">{row.pertanyaan}</td>
                    <td className="p-2.5 font-mono">{row.kunci_jawaban}</td>
                    <td className="p-2.5 text-right tabular-nums">{row.bobot}</td>
                    <td className="p-2.5">
                      {row.valid ? (
                        <span className="text-emerald-700 font-semibold">
                          Valid
                        </span>
                      ) : (
                        <span className="text-red-700 font-semibold">
                          {row.errors.join(', ')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form Input Manual */}
      {showForm && (
        <form
          onSubmit={handleSaveSoal}
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
        >
          <h3 className="text-base font-bold text-slate-900">
            {editId ? 'Edit Butir Soal' : 'Buat Butir Soal Baru'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nomor
              </label>
              <input
                type="number"
                value={nomor}
                onChange={(e) => setNomor(Number(e.target.value))}
                min={1}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tipe Soal
              </label>
              <select
                value={tipeSoal}
                onChange={(e) => {
                  const t = e.target.value as TipeSoal;
                  setTipeSoal(t);
                  if (t === 'BENAR_SALAH') setKunciJawaban('BENAR');
                  else if (t === 'PG') setKunciJawaban('A');
                  else if (t === 'PG_KOMPLEKS') setKunciJawaban('A,B');
                  else setKunciJawaban('');
                }}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {Object.entries(TIPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kategori / Mapel
              </label>
              <input
                type="text"
                value={kategori}
                onChange={(e) => setKategori(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bobot Nilai
              </label>
              <input
                type="number"
                value={bobot}
                onChange={(e) => setBobot(Number(e.target.value))}
                min={1}
                required
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pertanyaan
            </label>
            <textarea
              rows={3}
              value={pertanyaan}
              onChange={(e) => setPertanyaan(e.target.value)}
              required
              placeholder="Tuliskan isi pertanyaan..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Gambar Soal (URL atau Unggah Gambar)
              </label>
              <input
                type="text"
                value={gambarUrl}
                onChange={(e) => setGambarUrl(e.target.value)}
                placeholder="https://... atau unggah file di samping"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50">
                <ImageIcon className="w-4 h-4 text-slate-600" />
                <span>Pilih Gambar dari Perangkat</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
              {gambarUrl && (
                <button
                  type="button"
                  onClick={() => setGambarUrl('')}
                  className="text-xs font-semibold text-red-600 cursor-pointer"
                >
                  Hapus Gambar
                </button>
              )}
            </div>
          </div>

          {(tipeSoal === 'PG' || tipeSoal === 'PG_KOMPLEKS') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={opsiA}
                onChange={(e) => setOpsiA(e.target.value)}
                placeholder="Opsi A"
                required
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                value={opsiB}
                onChange={(e) => setOpsiB(e.target.value)}
                placeholder="Opsi B"
                required
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                value={opsiC}
                onChange={(e) => setOpsiC(e.target.value)}
                placeholder="Opsi C"
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                value={opsiD}
                onChange={(e) => setOpsiD(e.target.value)}
                placeholder="Opsi D"
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                value={opsiE}
                onChange={(e) => setOpsiE(e.target.value)}
                placeholder="Opsi E (Opsional)"
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kunci Jawaban{' '}
              <span className="font-normal text-slate-500">
                {tipeSoal === 'PG_KOMPLEKS'
                  ? '(Pisahkan koma, misal: A,C,E)'
                  : tipeSoal === 'BENAR_SALAH'
                    ? '(BENAR atau SALAH)'
                    : tipeSoal === 'URAIAN'
                      ? '(Kata kunci rubrik dipisah koma, misal: arus,tegangan)'
                      : ''}
              </span>
            </label>
            <input
              type="text"
              value={kunciJawaban}
              onChange={(e) => setKunciJawaban(e.target.value)}
              required={tipeSoal !== 'URAIAN'}
              className="w-full sm:w-96 px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-lg cursor-pointer"
            >
              {editId ? 'Perbarui Soal' : 'Simpan ke Bank Soal'}
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
              className="px-4 py-2 text-xs font-semibold border border-slate-300 rounded-lg cursor-pointer"
            >
              Batal
            </button>
          </div>
        </form>
      )}

      {/* Daftar Butir Soal */}
      <div className="space-y-3">
        {filteredSoal.map((soal) => (
          <div
            key={soal.id_soal}
            className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row md:items-start justify-between gap-4"
          >
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  No. {soal.nomor}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-blue-700">
                  {TIPE_LABELS[soal.tipe_soal]}
                </span>
                <span aria-hidden="true">·</span>
                <span>{soal.kategori}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">Bobot {soal.bobot}</span>
              </div>

              <p className="text-sm text-slate-900 font-medium leading-relaxed">
                {soal.pertanyaan}
              </p>

              {soal.gambar_url && (
                <img
                  src={soal.gambar_url}
                  alt={`Ilustrasi soal ${soal.nomor}`}
                  referrerPolicy="no-referrer"
                  className="max-h-44 rounded-lg border border-slate-200 object-contain bg-white"
                />
              )}

              {(soal.tipe_soal === 'PG' || soal.tipe_soal === 'PG_KOMPLEKS') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-600 pt-1">
                  {['A', 'B', 'C', 'D', 'E'].map((k) => {
                    const text = soal[
                      `opsi_${k.toLowerCase()}` as keyof BankSoalRecord
                    ] as string;
                    if (!text) return null;
                    return (
                      <div key={k}>
                        <span className="font-mono font-semibold text-slate-800">
                          {k}.
                        </span>{' '}
                        {text}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="text-xs text-emerald-700 font-semibold pt-1">
                Kunci Jawaban:{' '}
                <span className="font-mono">{soal.kunci_jawaban || '-'}</span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                title="Duplikasi Soal"
                onClick={() => handleDuplicateSoal(soal)}
                className="p-2 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg cursor-pointer"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                type="button"
                title="Edit Soal"
                onClick={() => handleEditSoal(soal)}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                type="button"
                title="Hapus Soal"
                onClick={() => handleDeleteSoal(soal.id_soal)}
                className="p-2 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
