import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const GOOGLE_DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.activity',
  'https://www.googleapis.com/auth/drive.activity.readonly',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/drive.apps.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.install',
  'https://www.googleapis.com/auth/drive.meet.readonly',
  'https://www.googleapis.com/auth/drive.metadata',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.photos.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.scripts',
] as const;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
GOOGLE_DRIVE_SCOPES.forEach((scope) => {
  provider.addScope(scope);
});

// Cache token HANYA di memori (dilarang keras menyimpan di localStorage/sessionStorage)
let isSigningIn = false;
let cachedAccessToken: string | null = null;

export function initDriveAuth(
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else if (!isSigningIn) {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
}

export async function signInWithGoogleDrive(): Promise<{
  user: User;
  accessToken: string;
}> {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error(
        'Gagal mendapatkan token akses Google Drive dari proses masuk.'
      );
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } finally {
    isSigningIn = false;
  }
}

export function getDriveAccessToken(): string | null {
  return cachedAccessToken;
}

export function getCurrentDriveUser(): User | null {
  return auth.currentUser;
}

export async function signOutGoogleDrive(): Promise<void> {
  await auth.signOut();
  cachedAccessToken = null;
}

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  parents?: string[];
}

export interface DriveActivityItem {
  timestamp?: string;
  actionType: string;
  targetTitle: string;
}

function requireToken(): string {
  if (!cachedAccessToken) {
    throw new Error('SESI_DRIVE_HABIS');
  }
  return cachedAccessToken;
}

export async function listDriveFiles(queryText = ''): Promise<DriveFileItem[]> {
  const token = requireToken();
  const baseFilter = 'trashed = false';
  const q = queryText.trim()
    ? `${baseFilter} and name contains '${queryText.trim().replace(/'/g, "\\'")}'`
    : baseFilter;

  const params = new URLSearchParams({
    q,
    pageSize: '30',
    orderBy: 'modifiedTime desc',
    fields:
      'files(id, name, mimeType, size, modifiedTime, webViewLink, parents)',
  });

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) {
    if (res.status === 401) {
      cachedAccessToken = null;
      throw new Error('SESI_DRIVE_HABIS');
    }
    const errText = await res.text();
    throw new Error(`Gagal memuat file Google Drive (${res.status}): ${errText}`);
  }
  const data = (await res.json()) as { files?: DriveFileItem[] };
  return data.files || [];
}

export async function ensureCbtFolder(
  folderName = 'Assist_Aassesment_CBT_SMAN1_Pamekasan'
): Promise<string> {
  const token = requireToken();
  const q = `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName}' and trashed = false`;
  const params = new URLSearchParams({ q, fields: 'files(id, name)' });
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (searchRes.ok) {
    const searchData = (await searchRes.json()) as { files?: DriveFileItem[] };
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }
  }

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });
  if (!createRes.ok) {
    throw new Error('Gagal membuat folder CBT di Google Drive.');
  }
  const created = (await createRes.json()) as { id: string };
  return created.id;
}

export async function uploadFileToDrive(params: {
  fileName: string;
  content: string | Blob;
  mimeType: string;
  parentFolderId?: string;
}): Promise<DriveFileItem> {
  const token = requireToken();
  const metadata: Record<string, unknown> = {
    name: params.fileName,
    mimeType: params.mimeType,
  };
  if (params.parentFolderId) {
    metadata.parents = [params.parentFolderId];
  }

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  const fileBlob =
    params.content instanceof Blob
      ? params.content
      : new Blob([params.content], { type: params.mimeType });
  form.append('file', fileBlob);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime,webViewLink',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }
  );
  if (!res.ok) {
    if (res.status === 401) {
      cachedAccessToken = null;
      throw new Error('SESI_DRIVE_HABIS');
    }
    throw new Error(`Gagal mengunggah ke Google Drive (${res.status}).`);
  }
  return (await res.json()) as DriveFileItem;
}

export async function downloadDriveFileText(fileId: string): Promise<string> {
  const token = requireToken();
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) {
    if (res.status === 401) {
      cachedAccessToken = null;
      throw new Error('SESI_DRIVE_HABIS');
    }
    throw new Error(`Gagal mengunduh file dari Google Drive (${res.status}).`);
  }
  return await res.text();
}

export async function deleteDriveFile(fileId: string): Promise<void> {
  const token = requireToken();
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) {
    if (res.status === 401) {
      cachedAccessToken = null;
      throw new Error('SESI_DRIVE_HABIS');
    }
    throw new Error(`Gagal menghapus file dari Google Drive (${res.status}).`);
  }
}

export async function queryDriveActivity(): Promise<DriveActivityItem[]> {
  const token = requireToken();
  const res = await fetch(
    'https://driveactivity.googleapis.com/v2/activity:query',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pageSize: 10 }),
    }
  );
  if (!res.ok) {
    return [];
  }
  const data = (await res.json()) as {
    activities?: Array<{
      timestamp?: string;
      primaryActionDetail?: Record<string, unknown>;
      targets?: Array<{ driveItem?: { title?: string } }>;
    }>;
  };
  return (data.activities || []).map((act) => {
    const actionKey = act.primaryActionDetail
      ? Object.keys(act.primaryActionDetail)[0] || 'activity'
      : 'activity';
    const title = act.targets?.[0]?.driveItem?.title || 'File Google Drive';
    return {
      timestamp: act.timestamp,
      actionType: actionKey,
      targetTitle: title,
    };
  });
}
