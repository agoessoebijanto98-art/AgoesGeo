import React, { useState } from 'react';
import {
  Download,
  KeyRound,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  addParticipantsBatch,
  loadDatabase,
  saveDatabase,
  upsertKelas,
  upsertPeserta,
} from '../../store/cbtStore';
import { CbtDatabase, KelasRecord, PesertaRecord } from '../../types/cbt';
import { hashSyncSimple } from '../../utils/crypto';
import {
  downloadTemplatePeserta,
  ParsedPesertaPreviewRow,
  parsePesertaFile,
  previewRowsToPesertaRecords,
} from '../../utils/excelCsv';

interface KelasPesertaTabProps {
  db: CbtDatabase;
  onRefresh: (next: CbtDatabase) => void;
}

export const KelasPesertaTab: React.FC<KelasPesertaTabProps> = ({
  db,
  onRefresh,
}) => {
  const [subTab, setSubTab] = useState<'peserta' | 'kelas'>('peserta');
  const [filterKelas, setFilterKelas] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Form Kelas
  const [editKelasId, setEditKelasId] = useState<string | null>(null);
  const [namaKelas, setNamaKelas] = useState('');
  const [tingkat, setTingkat] = useState('XII');
  const [waliKelas, setWaliKelas] = useState('');

  // Form Peserta
  const [editPesertaId, setEditPesertaId] = useState<string | null>(null);
  const [nis, setNis] = useState('');
  const [namaPeserta, setNamaPeserta] = useState('');
  const [kelasIdPeserta, setKelasIdPeserta] = useState(
    db.Kelas[0]?.id_kelas || ''
  );
  const [passwordPeserta, setPasswordPeserta] = useState('123456');

  // Impor Excel/CSV Pratinjau
  const [importPreview, setImportPreview] = useState<
    ParsedPesertaPreviewRow[] | null
  >(null);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  // ==================== HANDLER KELAS ====================
  const handleSaveKelas = (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaKelas.trim()) return;
    const next = upsertKelas({
      id_kelas: editKelasId || undefined,
      nama_kelas: namaKelas.trim(),
      tingkat: tingkat.trim(),
      wali_kelas: waliKelas.trim() || '-',
    });
    onRefresh(next);
    setEditKelasId(null);
    setNamaKelas('');
    setWaliKelas('');
    showToast('Data kelas berhasil disimpan.');
  };

  const handleEditKelas = (k: KelasRecord) => {
    setEditKelasId(k.id_kelas);
    setNamaKelas(k.nama_kelas);
    setTingkat(k.tingkat);
    setWaliKelas(k.wali_kelas);
  };

  const handleDeleteKelas = (id: string) => {
    const next = loadDatabase();
    next.Kelas = next.Kelas.filter((k) => k.id_kelas !== id);
    saveDatabase(next);
    onRefresh(next);
    showToast('Kelas dihapus.');
  };

  // ==================== HANDLER PESERTA ====================
  const handleSavePeserta = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedKelas = db.Kelas.find((k) => k.id_kelas === kelasIdPeserta);
    if (!nis.trim() || !namaPeserta.trim() || !selectedKelas) return;

    const next = upsertPeserta({
      id_peserta: editPesertaId || undefined,
      nis: nis.trim(),
      nama: namaPeserta.trim(),
      id_kelas: selectedKelas.id_kelas,
      nama_kelas: selectedKelas.nama_kelas,
      password: passwordPeserta.trim() || undefined,
    });
    onRefresh(next);
    setEditPesertaId(null);
    setNis('');
    setNamaPeserta('');
    setPasswordPeserta('123456');
    showToast('Data peserta berhasil disimpan.');
  };

  const handleEditPeserta = (p: PesertaRecord) => {
    setEditPesertaId(p.id_peserta);
    setNis(p.nis);
    setNamaPeserta(p.nama);
    setKelasIdPeserta(p.id_kelas);
    setPasswordPeserta('');
  };

  const handleDeletePeserta = (id: string) => {
    const next = loadDatabase();
    next.Peserta = next.Peserta.filter((p) => p.id_peserta !== id);
    saveDatabase(next);
    onRefresh(next);
    showToast('Peserta dihapus.');
  };

  const handleResetPassword = (id: string) => {
    const next = loadDatabase();
    next.Peserta = next.Peserta.map((p) =>
      p.id_peserta === id
        ? {
            ...p,
            password_hash: hashSyncSimple('123456'),
            password_plain_hint: '123456',
          }
        : p
    );
    saveDatabase(next);
    onRefresh(next);
    showToast('Password peserta direset menjadi default: 123456');
  };

  const handleResetLogin = (id: string) => {
    const next = loadDatabase();
    next.Peserta = next.Peserta.map((p) =>
      p.id_peserta === id
        ? { ...p, status_login: 'Offline', session_token: '' }
        : p
    );
    saveDatabase(next);
    onRefresh(next);
    showToast('Status login peserta direset ke Offline.');
  };

  // ==================== IMPOR FILE EXCEL / CSV ====================
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const existingSet = new Set(db.Peserta.map((p) => p.nis));
    const parsed = await parsePesertaFile(file, existingSet);
    setImportPreview(parsed);
    e.target.value = '';
  };

  const handleConfirmImport = () => {
    if (!importPreview) return;
    const kelasMap = new Map<string, string>();
    db.Kelas.forEach((k) =>
      kelasMap.set(k.nama_kelas.toLowerCase(), k.id_kelas)
    );
    const records = previewRowsToPesertaRecords(importPreview, kelasMap);
    const next = addParticipantsBatch(records);
    onRefresh(next);
    setImportPreview(null);
    showToast(`${records.length} peserta berhasil diimpor.`);
  };

  const filteredPeserta = db.Peserta.filter((p) => {
    const matchKelas =
      filterKelas === 'ALL' || p.nama_kelas === filterKelas;
    const matchSearch =
      p.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.nis.toLowerCase().includes(searchQuery.toLowerCase());
    return matchKelas && matchSearch;
  });

  return (
    <div className="space-y-6">
      {toastMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium rounded-lg">
          {toastMsg}
        </div>
      )}

      {/* Sub-navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex p-1 bg-slate-200/70 rounded-lg">
          <button
            type="button"
            onClick={() => setSubTab('peserta')}
            className={`px-4 py-1.5 text-sm font-semibold rounded-md cursor-pointer whitespace-nowrap ${
              subTab === 'peserta'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Daftar Peserta ({db.Peserta.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('kelas')}
            className={`px-4 py-1.5 text-sm font-semibold rounded-md cursor-pointer whitespace-nowrap ${
              subTab === 'kelas'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Manajemen Kelas ({db.Kelas.length})
          </button>
        </div>

        {subTab === 'peserta' && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => downloadTemplatePeserta('xlsx')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Template Excel</span>
            </button>
            <button
              type="button"
              onClick={() => downloadTemplatePeserta('csv')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Template CSV</span>
            </button>
            <label className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-lg cursor-pointer whitespace-nowrap">
              <Upload className="w-3.5 h-3.5" />
              <span>Impor Excel / CSV</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileImport}
                className="hidden"
              />
            </label>
          </div>
        )}
      </div>

      {/* Pratinjau Impor Peserta */}
      {importPreview && (
        <div className="bg-white border border-blue-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Pratinjau Impor Peserta ({importPreview.filter((r) => r.valid).length} valid dari {importPreview.length} baris)
              </h4>
              <p className="text-xs text-slate-500">
                Kolom wajib: NIS, nama, kelas, password. Baris dengan error akan dilewati.
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
                onClick={handleConfirmImport}
                className="px-3.5 py-1.5 text-xs font-semibold bg-blue-700 text-white rounded-lg cursor-pointer"
              >
                Simpan Peserta Valid
              </button>
            </div>
          </div>
          <div className="max-h-56 overflow-auto border border-slate-200 rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-2.5 text-left">Baris</th>
                  <th className="p-2.5 text-left">NIS</th>
                  <th className="p-2.5 text-left">Nama</th>
                  <th className="p-2.5 text-left">Kelas</th>
                  <th className="p-2.5 text-left">Status Validasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {importPreview.map((row) => (
                  <tr key={row.rowIndex}>
                    <td className="p-2.5 tabular-nums">{row.rowIndex}</td>
                    <td className="p-2.5 font-mono">{row.nis}</td>
                    <td className="p-2.5">{row.nama}</td>
                    <td className="p-2.5">{row.kelas}</td>
                    <td className="p-2.5">
                      {row.valid ? (
                        <span className="text-emerald-700 font-semibold">Valid</span>
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

      {subTab === 'peserta' ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Form Tambah / Edit Peserta */}
          <form
            onSubmit={handleSavePeserta}
            className="xl:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-4"
          >
            <h3 className="text-sm font-bold text-slate-900">
              {editPesertaId ? 'Edit Data Peserta' : 'Tambah Peserta Baru'}
            </h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                NIS / ID Peserta
              </label>
              <input
                type="text"
                value={nis}
                onChange={(e) => setNis(e.target.value)}
                required
                placeholder="2026010"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Lengkap
              </label>
              <input
                type="text"
                value={namaPeserta}
                onChange={(e) => setNamaPeserta(e.target.value)}
                required
                placeholder="Nama siswa"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kelas
              </label>
              <select
                value={kelasIdPeserta}
                onChange={(e) => setKelasIdPeserta(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {db.Kelas.map((k) => (
                  <option key={k.id_kelas} value={k.id_kelas}>
                    {k.nama_kelas}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password {editPesertaId ? '(Kosongkan jika tetap)' : ''}
              </label>
              <input
                type="text"
                value={passwordPeserta}
                onChange={(e) => setPasswordPeserta(e.target.value)}
                placeholder="123456"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{editPesertaId ? 'Perbarui' : 'Simpan Peserta'}</span>
              </button>
              {editPesertaId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditPesertaId(null);
                    setNis('');
                    setNamaPeserta('');
                  }}
                  className="px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
              )}
            </div>
          </form>

          {/* Tabel Daftar Peserta */}
          <div className="xl:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari NIS atau nama peserta..."
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg w-full sm:w-64"
              />
              <select
                value={filterKelas}
                onChange={(e) => setFilterKelas(e.target.value)}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="ALL">Semua Kelas</option>
                {db.Kelas.map((k) => (
                  <option key={k.id_kelas} value={k.nama_kelas}>
                    {k.nama_kelas}
                  </option>
                ))}
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left">NIS</th>
                    <th className="px-4 py-3 text-left">Nama Peserta</th>
                    <th className="px-4 py-3 text-left">Kelas</th>
                    <th className="px-4 py-3 text-left">Status Login</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPeserta.map((p) => (
                    <tr key={p.id_peserta} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs tabular-nums">
                        {p.nis}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {p.nama}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {p.nama_kelas}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {p.status_login === 'Online' ? (
                          <span className="font-semibold text-emerald-700">
                            Online (Aktif)
                          </span>
                        ) : (
                          <span className="text-slate-500">Offline</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            title="Reset Status Login (Putus Perangkat)"
                            onClick={() => handleResetLogin(p.id_peserta)}
                            className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Reset Password ke 123456"
                            onClick={() => handleResetPassword(p.id_peserta)}
                            className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded cursor-pointer"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Edit Peserta"
                            onClick={() => handleEditPeserta(p)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Hapus Peserta"
                            onClick={() => handleDeletePeserta(p.id_peserta)}
                            className="p-1.5 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleSaveKelas}
            className="xl:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-4"
          >
            <h3 className="text-sm font-bold text-slate-900">
              {editKelasId ? 'Edit Kelas' : 'Tambah Kelas Baru'}
            </h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Kelas
              </label>
              <input
                type="text"
                value={namaKelas}
                onChange={(e) => setNamaKelas(e.target.value)}
                placeholder="Contoh: XII IPA 3"
                required
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tingkat
              </label>
              <select
                value={tingkat}
                onChange={(e) => setTingkat(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="X">Kelas X</option>
                <option value="XI">Kelas XI</option>
                <option value="XII">Kelas XII</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Wali Kelas
              </label>
              <input
                type="text"
                value={waliKelas}
                onChange={(e) => setWaliKelas(e.target.value)}
                placeholder="Nama wali kelas"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 py-2 px-4 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                {editKelasId ? 'Perbarui Kelas' : 'Simpan Kelas'}
              </button>
              {editKelasId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditKelasId(null);
                    setNamaKelas('');
                  }}
                  className="px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
              )}
            </div>
          </form>

          <div className="xl:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Nama Kelas</th>
                  <th className="px-4 py-3 text-left">Tingkat</th>
                  <th className="px-4 py-3 text-left">Wali Kelas</th>
                  <th className="px-4 py-3 text-right">Jumlah Siswa</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {db.Kelas.map((k) => {
                  const count = db.Peserta.filter(
                    (p) => p.nama_kelas === k.nama_kelas
                  ).length;
                  return (
                    <tr key={k.id_kelas} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {k.nama_kelas}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{k.tingkat}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {k.wali_kelas}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">
                        {count}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditKelas(k)}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteKelas(k.id_kelas)}
                            className="p-1.5 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
