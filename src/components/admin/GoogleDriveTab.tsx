import React, { useCallback, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  Download,
  ExternalLink,
  FolderPlus,
  HardDrive,
  LogOut,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  deleteDriveFile,
  downloadDriveFileText,
  DriveActivityItem,
  DriveFileItem,
  ensureCbtFolder,
  getCurrentDriveUser,
  getDriveAccessToken,
  initDriveAuth,
  listDriveFiles,
  queryDriveActivity,
  signInWithGoogleDrive,
  signOutGoogleDrive,
  uploadFileToDrive,
} from '../../services/googleDriveAuth';
import { saveDatabase } from '../../store/cbtStore';
import { CbtDatabase } from '../../types/cbt';
import { formatDateTimeID } from '../../utils/crypto';

interface GoogleDriveTabProps {
  db: CbtDatabase;
  onRefreshDb: (next: CbtDatabase) => void;
}

interface PendingConfirmAction {
  title: string;
  description: string;
  confirmLabel: string;
  isDanger?: boolean;
  execute: () => Promise<void>;
}

export const GoogleDriveTab: React.FC<GoogleDriveTabProps> = ({
  db,
  onRefreshDb,
}) => {
  const [driveUser, setDriveUser] = useState<User | null>(() =>
    getCurrentDriveUser()
  );
  const [needsAuth, setNeedsAuth] = useState<boolean>(
    () => !getDriveAccessToken()
  );
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [activities, setActivities] = useState<DriveActivityItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  // Dialog konfirmasi wajib untuk setiap operasi mutasi/hapus ke Google Drive
  const [confirmAction, setConfirmAction] =
    useState<PendingConfirmAction | null>(null);
  const [isExecutingAction, setIsExecutingAction] = useState(false);

  const fetchDriveWorkspace = useCallback(async (q = '') => {
    if (!getDriveAccessToken()) {
      setNeedsAuth(true);
      return;
    }
    setLoadingFiles(true);
    setErrorMsg('');
    try {
      const [fileList, activityList] = await Promise.all([
        listDriveFiles(q),
        queryDriveActivity(),
      ]);
      setFiles(fileList);
      setActivities(activityList);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat Google Drive.';
      if (msg === 'SESI_DRIVE_HABIS') {
        setNeedsAuth(true);
        setErrorMsg(
          'Sesi Google Drive berakhir. Silakan masuk kembali dengan Google.'
        );
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setLoadingFiles(false);
    }
  }, []);

  useEffect(() => {
    const unsub = initDriveAuth(
      (user) => {
        setDriveUser(user);
        setNeedsAuth(false);
        fetchDriveWorkspace();
      },
      () => {
        setDriveUser(getCurrentDriveUser());
        setNeedsAuth(true);
      }
    );
    if (getDriveAccessToken()) {
      setNeedsAuth(false);
      fetchDriveWorkspace();
    }
    return unsub;
  }, [fetchDriveWorkspace]);

  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    setErrorMsg('');
    try {
      const res = await signInWithGoogleDrive();
      setDriveUser(res.user);
      setNeedsAuth(false);
      await fetchDriveWorkspace();
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Gagal masuk dengan akun Google.'
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    await signOutGoogleDrive();
    setDriveUser(null);
    setNeedsAuth(true);
    setFiles([]);
    setActivities([]);
  };

  const handleConfirmExecute = async () => {
    if (!confirmAction) return;
    setIsExecutingAction(true);
    setErrorMsg('');
    try {
      await confirmAction.execute();
      setConfirmAction(null);
      await fetchDriveWorkspace(searchQuery);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Operasi gagal dijalankan.';
      if (msg === 'SESI_DRIVE_HABIS') {
        setNeedsAuth(true);
      }
      setErrorMsg(msg);
      setConfirmAction(null);
    } finally {
      setIsExecutingAction(false);
    }
  };

  const promptBackupDatabase = () => {
    const fileName = `Backup_CBT_SMAN1_Pamekasan_${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    setConfirmAction({
      title: 'Unggah Cadangan Database CBT ke Google Drive?',
      description: `Aplikasi akan membuat/menggunakan folder "Assist_Aassesment_CBT_SMAN1_Pamekasan" di Google Drive Anda dan mengunggah file "${fileName}" berisi seluruh 10 sheet data CBT.`,
      confirmLabel: 'Unggah Cadangan',
      execute: async () => {
        const folderId = await ensureCbtFolder();
        await uploadFileToDrive({
          fileName,
          content: JSON.stringify(db, null, 2),
          mimeType: 'application/json',
          parentFolderId: folderId,
        });
        setStatusMsg(`Cadangan "${fileName}" berhasil disimpan ke Google Drive.`);
      },
    });
  };

  const promptExportResultsCsv = () => {
    const fileName = `Rekap_Hasil_CBT_SMAN1_Pamekasan_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    const headers = [
      'NIS',
      'Nama',
      'Kelas',
      'Ujian',
      'Nilai',
      'Benar',
      'Salah',
      'Pelanggaran',
      'Status',
    ];
    const lines = [
      headers.join(','),
      ...db.Hasil_Ujian.map((h) =>
        [
          h.nis,
          `"${h.nama.replace(/"/g, '""')}"`,
          `"${h.kelas}"`,
          `"${h.nama_ujian.replace(/"/g, '""')}"`,
          h.nilai,
          h.jumlah_benar,
          h.jumlah_salah,
          h.jumlah_pelanggaran,
          `"${h.status}"`,
        ].join(',')
      ),
    ].join('\n');

    setConfirmAction({
      title: 'Simpan Rekap Nilai ke Google Drive?',
      description: `File CSV "${fileName}" (${db.Hasil_Ujian.length} baris hasil ujian) akan diunggah ke folder CBT di Google Drive Anda.`,
      confirmLabel: 'Simpan CSV ke Drive',
      execute: async () => {
        const folderId = await ensureCbtFolder();
        await uploadFileToDrive({
          fileName,
          content: lines,
          mimeType: 'text/csv',
          parentFolderId: folderId,
        });
        setStatusMsg(`Rekap nilai "${fileName}" berhasil diunggah ke Google Drive.`);
      },
    });
  };

  const handleUploadLocalFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setConfirmAction({
      title: 'Unggah File ke Google Drive?',
      description: `File "${file.name}" (${Math.round(file.size / 1024)} KB) akan diunggah ke folder CBT di Google Drive Anda.`,
      confirmLabel: 'Unggah File',
      execute: async () => {
        const folderId = await ensureCbtFolder();
        await uploadFileToDrive({
          fileName: file.name,
          content: file,
          mimeType: file.type || 'application/octet-stream',
          parentFolderId: folderId,
        });
        setStatusMsg(`File "${file.name}" berhasil diunggah ke Google Drive.`);
      },
    });
  };

  const promptRestoreBackup = (file: DriveFileItem) => {
    setConfirmAction({
      title: 'Pulihkan Database CBT dari File Google Drive?',
      description: `Data lokal aplikasi CBT saat ini akan ditimpa dengan isi dari file "${file.name}". Pastikan file tersebut adalah cadangan JSON Assist_Aassesment CBT yang valid.`,
      confirmLabel: 'Pulihkan Database',
      isDanger: true,
      execute: async () => {
        const text = await downloadDriveFileText(file.id);
        const parsed = JSON.parse(text) as CbtDatabase;
        if (!parsed || !parsed.Admin || !parsed.Peserta || !parsed.Ujian) {
          throw new Error(
            'Format file tidak valid. Harus berupa JSON cadangan 10 sheet CBT.'
          );
        }
        saveDatabase(parsed);
        onRefreshDb(parsed);
        setStatusMsg(`Database berhasil dipulihkan dari "${file.name}".`);
      },
    });
  };

  const promptDeleteFile = (file: DriveFileItem) => {
    setConfirmAction({
      title: 'Hapus File dari Google Drive?',
      description: `Anda yakin ingin menghapus file "${file.name}" secara permanen dari Google Drive? Tindakan ini tidak dapat dibatalkan.`,
      confirmLabel: 'Hapus File',
      isDanger: true,
      execute: async () => {
        await deleteDriveFile(file.id);
        setStatusMsg(`File "${file.name}" telah dihapus dari Google Drive.`);
      },
    });
  };

  // ==================== BELUM LOGIN GOOGLE DRIVE ====================
  if (needsAuth) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-xl mx-auto text-center space-y-5">
        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mx-auto">
          <HardDrive className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            Hubungkan Google Drive SMAN 1 Pamekasan
          </h3>
          <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
            Masuk dengan akun Google Admin untuk mencadangkan database 10 sheet
            CBT, menyimpan rekap nilai CSV, mengunggah berkas soal, serta
            mengelola file langsung di Google Drive Anda.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
            {errorMsg}
          </div>
        )}

        {/* Official Google Sign-In Button Styling */}
        <div className="flex justify-center pt-1">
          <button
            type="button"
            disabled={isLoggingIn}
            onClick={handleGoogleSignIn}
            className="inline-flex items-center gap-3 px-5 py-2.5 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 text-sm font-medium text-slate-800 cursor-pointer disabled:opacity-60"
          >
            <svg
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 48 48"
              className="w-5 h-5 shrink-0"
            >
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
              <path fill="none" d="M0 0h48v48H0z" />
            </svg>
            <span>
              {isLoggingIn ? 'Menghubungkan...' : 'Sign in with Google'}
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Akun & Aksi Drive */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-emerald-700">
            Terhubung ke Google Drive
          </div>
          <div className="text-sm font-bold text-slate-900 mt-0.5">
            {driveUser?.displayName || 'Akun Google'} ·{' '}
            <span className="font-normal text-slate-600">
              {driveUser?.email}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={promptBackupDatabase}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-lg cursor-pointer whitespace-nowrap"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Cadangkan Database CBT</span>
          </button>
          <button
            type="button"
            onClick={promptExportResultsCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Simpan Rekap Nilai CSV</span>
          </button>
          <label className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap">
            <Upload className="w-3.5 h-3.5" />
            <span>Unggah File</span>
            <input
              type="file"
              onChange={handleUploadLocalFile}
              className="hidden"
            />
          </label>
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 cursor-pointer whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Putuskan</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg">
          {statusMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Daftar File Google Drive */}
        <div className="xl:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetchDriveWorkspace(searchQuery);
              }}
              className="flex items-center gap-2 flex-1 min-w-[220px]"
            >
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama file di Google Drive..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Cari
              </button>
            </form>

            <button
              type="button"
              onClick={() => fetchDriveWorkspace(searchQuery)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loadingFiles ? 'animate-spin' : ''}`}
              />
              <span>Muat Ulang</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Nama File</th>
                  <th className="px-4 py-3 text-left">Tipe</th>
                  <th className="px-4 py-3 text-left">Diubah</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingFiles ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-8 text-center text-slate-500 text-sm"
                    >
                      Memuat daftar file Google Drive...
                    </td>
                  </tr>
                ) : files.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-8 text-center text-slate-500 text-sm"
                    >
                      Belum ada file ditemukan di Google Drive Anda.
                    </td>
                  </tr>
                ) : (
                  files.map((file) => {
                    const isJson =
                      file.mimeType === 'application/json' ||
                      file.name.endsWith('.json');
                    return (
                      <tr key={file.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-900 max-w-xs truncate">
                          {file.name}
                        </td>
                        <td className="px-4 py-3 text-slate-500 font-mono">
                          {file.mimeType
                            .replace('application/vnd.google-apps.', 'g-')
                            .replace('application/', '')}
                        </td>
                        <td className="px-4 py-3 text-slate-500 tabular-nums whitespace-nowrap">
                          {file.modifiedTime
                            ? formatDateTimeID(file.modifiedTime)
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            {isJson && (
                              <button
                                type="button"
                                title="Pulihkan Database dari Backup JSON ini"
                                onClick={() => promptRestoreBackup(file)}
                                className="px-2 py-1 text-xs font-semibold text-blue-700 border border-blue-200 bg-blue-50 rounded hover:bg-blue-100 cursor-pointer"
                              >
                                <Download className="w-3 h-3 inline mr-1" />
                                Pulihkan
                              </button>
                            )}
                            {file.webViewLink && (
                              <a
                                href={file.webViewLink}
                                target="_blank"
                                rel="noreferrer"
                                title="Buka di Google Drive"
                                className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button
                              type="button"
                              title="Hapus File di Google Drive"
                              onClick={() => promptDeleteFile(file)}
                              className="p-1.5 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Aktivitas Terbaru Google Drive */}
        <div className="xl:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">
              Aktivitas Google Drive Terbaru
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {activities.length === 0 ? (
              <div className="p-6 text-xs text-slate-500 text-center">
                Belum ada riwayat aktivitas Drive yang ditampilkan.
              </div>
            ) : (
              activities.map((act, i) => (
                <div key={i} className="px-5 py-3.5 text-xs space-y-0.5">
                  <div className="font-semibold text-slate-900 truncate">
                    {act.targetTitle}
                  </div>
                  <div className="text-slate-500">
                    Aksi: <span className="font-mono">{act.actionType}</span> ·{' '}
                    {act.timestamp ? formatDateTimeID(act.timestamp) : '-'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal Konfirmasi Wajib untuk Operasi Mutasi/Hapus Data Google Drive */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {confirmAction.title}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {confirmAction.description}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isExecutingAction}
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 text-xs font-semibold border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isExecutingAction}
                onClick={handleConfirmExecute}
                className={`px-4 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer disabled:opacity-60 ${
                  confirmAction.isDanger
                    ? 'bg-red-700 hover:bg-red-800'
                    : 'bg-blue-700 hover:bg-blue-800'
                }`}
              >
                {isExecutingAction
                  ? 'Memproses...'
                  : confirmAction.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
