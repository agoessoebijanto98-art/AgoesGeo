import React, { useState } from 'react';
import {
  ArrowRight,
  Code2,
  KeyRound,
  Lock,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { authenticateAdmin, authenticatePeserta } from '../store/cbtStore';
import { ActiveAuthSession, CbtDatabase } from '../types/cbt';

interface LoginViewProps {
  db: CbtDatabase;
  onLoginSuccess: (session: ActiveAuthSession) => void;
  onOpenGasStudio: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  db,
  onLoginSuccess,
  onOpenGasStudio,
}) => {
  const [roleTab, setRoleTab] = useState<'peserta' | 'admin'>('peserta');
  const [nis, setNis] = useState('');
  const [tokenUjian, setTokenUjian] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const activeExam = db.Ujian.find((u) => u.status === 'Aktif');

  const handleSubmitPeserta = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const res = authenticatePeserta(nis, tokenUjian);
    if (!res.ok) {
      setErrorMsg(res.message);
      return;
    }
    onLoginSuccess(res.session);
  };

  const handleSubmitAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const res = authenticateAdmin(username, password);
    if (!res.ok) {
      setErrorMsg(res.message);
      return;
    }
    onLoginSuccess(res.session);
  };

  const fillDemoPeserta = () => {
    setRoleTab('peserta');
    setNis('2026001');
    setTokenUjian(activeExam?.token_ujian || 'CBT26A');
    setErrorMsg('');
  };

  const fillDemoAdmin = () => {
    setRoleTab('admin');
    setUsername('admin');
    setPassword('admin123');
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Bar Contract: 3 zones */}
      <header className="bg-white border-b border-slate-200 px-6 lg:px-10 py-4 flex items-center justify-between gap-8">
        <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
          Assist_Aassesment CBT
        </span>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <span className="whitespace-nowrap shrink-0 text-slate-500">
            {db.Pengaturan.nama_sekolah}
          </span>
          <span aria-hidden="true" className="text-slate-300">
            ·
          </span>
          <button
            type="button"
            onClick={() => setRoleTab('peserta')}
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Portal Peserta
          </button>
          <button
            type="button"
            onClick={() => setRoleTab('admin')}
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Panel Pengawas
          </button>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenGasStudio}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Code2 className="w-4 h-4 text-blue-700" />
            Rancangan & Kode GAS
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
        {/* Left Informational Column */}
        <div className="lg:col-span-6 flex flex-col justify-between space-y-8">
          <div className="space-y-5">
            <div className="flex items-center gap-3.5">
              <img
                src="/assets/aistudio/LOGO_SMANSA_TRANSAPARAN_09d9bfb0.png"
                alt="Logo SMAN 1 Pamekasan"
                className="w-12 h-14 object-contain shrink-0"
              />
              <div>
                <div className="text-sm font-bold text-slate-900">
                  {db.Pengaturan.nama_sekolah}
                </div>
                <p className="text-xs font-semibold text-blue-700 tracking-wide">
                  Computer Based Test · Google Apps Script & Google Sheets
                </p>
              </div>
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 leading-tight max-w-xl">
              Platform Ujian Online Terawasi, Cepat, dan Terintegrasi Spreadsheet
            </h1>
            <p className="text-base text-slate-600 leading-relaxed max-w-lg">
              Simulasi aktif aplikasi CBT lengkap dengan mode layar penuh wajib,
              deteksi pindah tab real-time, auto-save jawaban, dan paket kode{' '}
              <span className="font-mono text-sm text-slate-800">Code.gs</span>{' '}
              siap deploy ke Google Apps Script.
            </p>
          </div>

          {/* Clean Feature Highlights (No nested cards) */}
          <div className="border-t border-slate-200 pt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <ShieldCheck className="w-4 h-4 text-blue-700" />
                <span>Keamanan Proctoring</span>
              </div>
              <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                Kunci layar penuh, cegah salin-tempel, deteksi pindah tab, serta
                blokir otomatis jika melewati batas.
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <UserCheck className="w-4 h-4 text-blue-700" />
                <span>Satu Akun Satu Perangkat</span>
              </div>
              <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                Sesi login terkunci per perangkat hingga pengawas melakukan
                reset login atau peserta menyelesaikan ujian.
              </p>
            </div>
          </div>

          {/* Demo Credentials Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <div className="text-xs font-semibold text-slate-500">
              Akun Uji Coba Cepat
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
                <div>
                  <div className="font-semibold text-slate-900">Peserta Demo</div>
                  <div className="font-mono text-slate-600 tabular-nums mt-0.5">
                    NIS: 2026001 · Token: {activeExam?.token_ujian || 'CBT26A'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={fillDemoPeserta}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-md font-semibold text-blue-700 hover:bg-blue-50 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Isi
                </button>
              </div>
              <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
                <div>
                  <div className="font-semibold text-slate-900">Admin / Proktor</div>
                  <div className="font-mono text-slate-600 mt-0.5">
                    admin / admin123
                  </div>
                </div>
                <button
                  type="button"
                  onClick={fillDemoAdmin}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-md font-semibold text-blue-700 hover:bg-blue-50 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Isi
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Login Form Column */}
        <div className="lg:col-span-6 flex items-center justify-center">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-7 lg:p-8">
            <div className="mb-6 flex items-center gap-3.5">
              <img
                src="/assets/aistudio/LOGO_SMANSA_TRANSAPARAN_09d9bfb0.png"
                alt="Logo SMAN 1 Pamekasan"
                className="w-10 h-12 object-contain shrink-0"
              />
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Masuk ke Sistem Ujian
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {db.Pengaturan.nama_sekolah} · Portal Peserta & Pengawas
                </p>
              </div>
            </div>

            {/* Segmented Role Switcher */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg mb-6">
              <button
                type="button"
                onClick={() => {
                  setRoleTab('peserta');
                  setErrorMsg('');
                }}
                className={`py-2 px-3 text-sm font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  roleTab === 'peserta'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Peserta Ujian
              </button>
              <button
                type="button"
                onClick={() => {
                  setRoleTab('admin');
                  setErrorMsg('');
                }}
                className={`py-2 px-3 text-sm font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  roleTab === 'admin'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Admin / Pengawas
              </button>
            </div>

            {roleTab === 'peserta' ? (
              <form onSubmit={handleSubmitPeserta} className="space-y-4">
                <div>
                  <label
                    htmlFor="login-nis"
                    className="block text-sm font-semibold text-slate-700 mb-1.5"
                  >
                    NIS / ID Peserta
                  </label>
                  <input
                    id="login-nis"
                    type="text"
                    value={nis}
                    onChange={(e) => setNis(e.target.value)}
                    placeholder="Masukkan NIS (contoh: 2026001)"
                    required
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label
                    htmlFor="login-token"
                    className="block text-sm font-semibold text-slate-700 mb-1.5"
                  >
                    Token Ujian
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="login-token"
                      type="text"
                      value={tokenUjian}
                      onChange={(e) => setTokenUjian(e.target.value.toUpperCase())}
                      placeholder="Masukkan Token (contoh: CBT26A)"
                      required
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 font-mono uppercase tracking-wider"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full mt-2 py-2.5 px-4 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Masuk Ruang Ujian</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmitAdmin} className="space-y-4">
                <div>
                  <label
                    htmlFor="login-username"
                    className="block text-sm font-semibold text-slate-700 mb-1.5"
                  >
                    Username Admin
                  </label>
                  <input
                    id="login-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin"
                    required
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label
                    htmlFor="login-password"
                    className="block text-sm font-semibold text-slate-700 mb-1.5"
                  >
                    Kata Sandi
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="login-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full mt-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Masuk Dashboard Admin</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {errorMsg && (
              <div
                role="alert"
                className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700"
              >
                {errorMsg}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
