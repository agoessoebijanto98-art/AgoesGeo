import React, { useState } from 'react';
import {
  BarChart3,
  BookOpen,
  CalendarClock,
  Code2,
  Eye,
  FileSpreadsheet,
  HardDrive,
  LayoutDashboard,
  LogOut,
  Menu,
  RotateCcw,
  ShieldAlert,
  ShieldBan,
  Users,
  X,
} from 'lucide-react';
import { resetDatabaseToSeed } from '../store/cbtStore';
import { ActiveAuthSession, CbtDatabase } from '../types/cbt';
import { BankSoalTab } from './admin/BankSoalTab';
import { BlokirTab } from './admin/BlokirTab';
import { DashboardTab } from './admin/DashboardTab';
import { GoogleDriveTab } from './admin/GoogleDriveTab';
import { HasilLaporanTab } from './admin/HasilLaporanTab';
import { KelasPesertaTab } from './admin/KelasPesertaTab';
import { LogPelanggaranTab } from './admin/LogPelanggaranTab';
import { MonitoringTab } from './admin/MonitoringTab';
import { PengaturanUjianTab } from './admin/PengaturanUjianTab';
import { SpreadsheetModal } from './admin/SpreadsheetModal';

interface AdminLayoutProps {
  db: CbtDatabase;
  session: ActiveAuthSession;
  onRefreshDb: (next: CbtDatabase) => void;
  onLogout: () => void;
  onOpenGasStudio: () => void;
}

const MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'peserta', label: 'Kelas & Peserta', icon: Users },
  { id: 'soal', label: 'Bank Soal', icon: BookOpen },
  { id: 'ujian', label: 'Pengaturan Ujian', icon: CalendarClock },
  { id: 'monitoring', label: 'Monitoring Live', icon: Eye },
  { id: 'log', label: 'Log Pelanggaran', icon: ShieldAlert },
  { id: 'blokir', label: 'Menu Blokir', icon: ShieldBan },
  { id: 'hasil', label: 'Hasil & Laporan', icon: BarChart3 },
  { id: 'drive', label: 'Google Drive', icon: HardDrive },
] as const;

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  db,
  session,
  onRefreshDb,
  onLogout,
  onOpenGasStudio,
}) => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSpreadsheet, setShowSpreadsheet] = useState(false);

  const currentMenu =
    MENU_ITEMS.find((m) => m.id === activeTab) || MENU_ITEMS[0];

  const handleResetDemo = () => {
    const next = resetDatabaseToSeed();
    onRefreshDb(next);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Desktop */}
      <aside className="no-print hidden lg:flex w-64 bg-white border-r border-slate-200 flex-col justify-between shrink-0">
        <div>
          <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-3">
            <img
              src="/assets/aistudio/LOGO_SMANSA_TRANSAPARAN_09d9bfb0.png"
              alt="Logo SMAN 1 Pamekasan"
              className="w-8 h-10 object-contain shrink-0"
            />
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-900 truncate">
                Assist_Aassesment CBT
              </div>
              <div className="text-xs text-slate-500 truncate mt-0.5">
                {db.Pengaturan.nama_sekolah}
              </div>
            </div>
          </div>
          <nav className="p-3 space-y-1">
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-200 space-y-2">
          <button
            type="button"
            onClick={() => setShowSpreadsheet(true)}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Buka Spreadsheet DB</span>
          </button>
          <button
            type="button"
            onClick={onOpenGasStudio}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            <Code2 className="w-4 h-4 text-blue-700" />
            <span>Kode GAS & Deploy</span>
          </button>
          <button
            type="button"
            onClick={handleResetDemo}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Data Contoh</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-64 bg-white h-full p-4 flex flex-col justify-between z-10">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <span className="font-bold text-slate-900">Menu Admin</span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="mt-3 space-y-1">
                {MENU_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                        activeTab === item.id
                          ? 'bg-blue-50 text-blue-700 font-semibold'
                          : 'text-slate-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
            <button
              type="button"
              onClick={onOpenGasStudio}
              className="w-full py-2 text-xs font-semibold border border-slate-300 rounded-lg"
            >
              Kode GAS & Deploy
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="no-print bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-600"
              aria-label="Buka menu navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-sm font-bold text-slate-900 truncate">
              Panel Admin · {currentMenu.label}
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <span className="hidden sm:inline text-xs font-medium text-slate-600">
              {session.namaLengkap}
            </span>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-5 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardTab db={db} onNavigateTab={setActiveTab} />
          )}
          {activeTab === 'peserta' && (
            <KelasPesertaTab db={db} onRefresh={onRefreshDb} />
          )}
          {activeTab === 'soal' && (
            <BankSoalTab db={db} onRefresh={onRefreshDb} />
          )}
          {activeTab === 'ujian' && (
            <PengaturanUjianTab db={db} onRefresh={onRefreshDb} />
          )}
          {activeTab === 'monitoring' && (
            <MonitoringTab db={db} onRefresh={onRefreshDb} />
          )}
          {activeTab === 'log' && <LogPelanggaranTab db={db} />}
          {activeTab === 'blokir' && (
            <BlokirTab db={db} onRefresh={onRefreshDb} />
          )}
          {activeTab === 'hasil' && (
            <HasilLaporanTab
              db={db}
              onOpenSpreadsheet={() => setShowSpreadsheet(true)}
            />
          )}
          {activeTab === 'drive' && (
            <GoogleDriveTab db={db} onRefreshDb={onRefreshDb} />
          )}
        </main>
      </div>

      {showSpreadsheet && (
        <SpreadsheetModal
          db={db}
          onClose={() => setShowSpreadsheet(false)}
        />
      )}
    </div>
  );
};
