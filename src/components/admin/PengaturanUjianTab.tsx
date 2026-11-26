import React, { useState } from 'react';
import { Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { loadDatabase, saveDatabase, upsertUjian } from '../../store/cbtStore';
import { CbtDatabase, UjianRecord } from '../../types/cbt';
import { generateExamToken, hashSyncSimple } from '../../utils/crypto';

interface PengaturanUjianTabProps {
  db: CbtDatabase;
  onRefresh: (next: CbtDatabase) => void;
}

export const PengaturanUjianTab: React.FC<PengaturanUjianTabProps> = ({
  db,
  onRefresh,
}) => {
  const [editId, setEditId] = useState<string | null>(null);
  const [namaUjian, setNamaUjian] = useState('');
  const [mapel, setMapel] = useState('Matematika & Sains');
  const [selectedKelas, setSelectedKelas] = useState<string[]>(
    db.Kelas.map((k) => k.nama_kelas)
  );
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [jamMulai, setJamMulai] = useState('07:30');
  const [jamSelesai, setJamSelesai] = useState('23:59');
  const [durasi, setDurasi] = useState(60);
  const [kkm, setKkm] = useState(75);
  const [acakSoal, setAcakSoal] = useState(true);
  const [acakOpsi, setAcakOpsi] = useState(true);
  const [tampilkanNilai, setTampilkanNilai] = useState(true);
  const [tokenUjian, setTokenUjian] = useState(generateExamToken());
  const [status, setStatus] = useState<'Aktif' | 'Draft' | 'Selesai'>('Aktif');
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const toggleKelas = (nama: string) => {
    setSelectedKelas((prev) =>
      prev.includes(nama) ? prev.filter((k) => k !== nama) : [...prev, nama]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaUjian.trim() || selectedKelas.length === 0) return;
    const next = upsertUjian({
      id_ujian: editId || undefined,
      nama_ujian: namaUjian.trim(),
      mata_pelajaran: mapel.trim(),
      kelas_peserta: selectedKelas,
      tanggal,
      jam_mulai: jamMulai,
      jam_selesai: jamSelesai,
      durasi_menit: durasi,
      acak_soal: acakSoal,
      acak_opsi: acakOpsi,
      tampilkan_nilai: tampilkanNilai,
      kkm,
      token_ujian: tokenUjian.toUpperCase(),
      status,
    });
    onRefresh(next);
    setEditId(null);
    setNamaUjian('');
    setTokenUjian(generateExamToken());
    showToast('Pengaturan ujian berhasil disimpan.');
  };

  const handleEdit = (u: UjianRecord) => {
    setEditId(u.id_ujian);
    setNamaUjian(u.nama_ujian);
    setMapel(u.mata_pelajaran);
    setSelectedKelas(u.kelas_peserta);
    setTanggal(u.tanggal);
    setJamMulai(u.jam_mulai);
    setJamSelesai(u.jam_selesai);
    setDurasi(u.durasi_menit);
    setKkm(u.kkm);
    setAcakSoal(u.acak_soal);
    setAcakOpsi(u.acak_opsi);
    setTampilkanNilai(u.tampilkan_nilai);
    setTokenUjian(u.token_ujian);
    setStatus(u.status);
  };

  const handleRegenerateToken = (idUjian: string) => {
    const next = loadDatabase();
    const newTok = generateExamToken();
    next.Ujian = next.Ujian.map((u) =>
      u.id_ujian === idUjian
        ? { ...u, token_ujian: newTok, token_hash: hashSyncSimple(newTok) }
        : u
    );
    saveDatabase(next);
    onRefresh(next);
    showToast(`Token baru berhasil dibuat: ${newTok}`);
  };

  const handleDelete = (idUjian: string) => {
    const next = loadDatabase();
    next.Ujian = next.Ujian.filter((u) => u.id_ujian !== idUjian);
    saveDatabase(next);
    onRefresh(next);
    showToast('Ujian dihapus.');
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      <form
        onSubmit={handleSubmit}
        className="xl:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
      >
        <h3 className="text-sm font-bold text-slate-900">
          {editId ? 'Edit Pengaturan Ujian' : 'Buat Jadwal Ujian Baru'}
        </h3>

        {toastMsg && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-lg">
            {toastMsg}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Nama Ujian
          </label>
          <input
            type="text"
            value={namaUjian}
            onChange={(e) => setNamaUjian(e.target.value)}
            required
            placeholder="Contoh: Ujian Tengah Semester Ganjil"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mata Pelajaran
            </label>
            <input
              type="text"
              value={mapel}
              onChange={(e) => setMapel(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Status Ujian
            </label>
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as 'Aktif' | 'Draft' | 'Selesai')
              }
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              <option value="Aktif">Aktif</option>
              <option value="Draft">Draft</option>
              <option value="Selesai">Selesai</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Kelas Peserta
          </label>
          <div className="flex flex-wrap gap-2">
            {db.Kelas.map((k) => {
              const checked = selectedKelas.includes(k.nama_kelas);
              return (
                <button
                  key={k.id_kelas}
                  type="button"
                  onClick={() => toggleKelas(k.nama_kelas)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                    checked
                      ? 'bg-blue-50 border-blue-300 text-blue-800'
                      : 'bg-white border-slate-300 text-slate-600'
                  }`}
                >
                  {k.nama_kelas}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tanggal
            </label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Jam Mulai
            </label>
            <input
              type="time"
              value={jamMulai}
              onChange={(e) => setJamMulai(e.target.value)}
              className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Jam Selesai
            </label>
            <input
              type="time"
              value={jamSelesai}
              onChange={(e) => setJamSelesai(e.target.value)}
              className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Durasi (Menit)
            </label>
            <input
              type="number"
              value={durasi}
              onChange={(e) => setDurasi(Number(e.target.value))}
              min={5}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg tabular-nums"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              KKM
            </label>
            <input
              type="number"
              value={kkm}
              onChange={(e) => setKkm(Number(e.target.value))}
              min={0}
              max={100}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg tabular-nums"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Token Ujian
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={tokenUjian}
              onChange={(e) => setTokenUjian(e.target.value.toUpperCase())}
              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono uppercase tracking-wider"
            />
            <button
              type="button"
              onClick={() => setTokenUjian(generateExamToken())}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Generate</span>
            </button>
          </div>
        </div>

        <div className="space-y-2 pt-1 text-sm">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-slate-700">Acak Urutan Soal</span>
            <input
              type="checkbox"
              checked={acakSoal}
              onChange={(e) => setAcakSoal(e.target.checked)}
              className="w-4 h-4 accent-blue-700"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-slate-700">Acak Opsi Jawaban</span>
            <input
              type="checkbox"
              checked={acakOpsi}
              onChange={(e) => setAcakOpsi(e.target.checked)}
              className="w-4 h-4 accent-blue-700"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-slate-700">Tampilkan Nilai ke Peserta</span>
            <input
              type="checkbox"
              checked={tampilkanNilai}
              onChange={(e) => setTampilkanNilai(e.target.checked)}
              className="w-4 h-4 accent-blue-700"
            />
          </label>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{editId ? 'Perbarui Ujian' : 'Simpan Ujian'}</span>
          </button>
          {editId && (
            <button
              type="button"
              onClick={() => {
                setEditId(null);
                setNamaUjian('');
              }}
              className="px-4 py-2 text-xs font-semibold border border-slate-300 rounded-lg cursor-pointer"
            >
              Batal
            </button>
          )}
        </div>
      </form>

      {/* Daftar Ujian */}
      <div className="xl:col-span-7 space-y-4">
        {db.Ujian.map((u) => (
          <div
            key={u.id_ujian}
            className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-blue-700">
                  {u.mata_pelajaran} · {u.status}
                </div>
                <h4 className="text-base font-bold text-slate-900 mt-0.5">
                  {u.nama_ujian}
                </h4>
                <div className="text-xs text-slate-500 mt-1">
                  {u.tanggal} · {u.jam_mulai}–{u.jam_selesai} ·{' '}
                  {u.durasi_menit} menit · KKM {u.kkm}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs text-slate-500">Token Ujian</div>
                <div className="font-mono text-lg font-bold text-blue-700 tracking-wider">
                  {u.token_ujian}
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-600 border-t border-slate-100 pt-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                Kelas: {u.kelas_peserta.join(', ')} · Acak Soal:{' '}
                {u.acak_soal ? 'ON' : 'OFF'} · Acak Opsi:{' '}
                {u.acak_opsi ? 'ON' : 'OFF'} · Tampil Nilai:{' '}
                {u.tampilkan_nilai ? 'ON' : 'OFF'}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleRegenerateToken(u.id_ujian)}
                  className="px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Token Baru
                </button>
                <button
                  type="button"
                  onClick={() => handleEdit(u)}
                  className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(u.id_ujian)}
                  className="p-1.5 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
