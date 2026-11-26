import { useEffect, useState } from 'react';
import { AdminLayout } from './components/AdminLayout';
import { GasBlueprintStudio } from './components/gas/GasBlueprintStudio';
import { LoginView } from './components/LoginView';
import { StudentPortal } from './components/student/StudentPortal';
import {
  loadAuthSession,
  loadDatabase,
  logoutCurrentUser,
  subscribeDatabaseSync,
} from './store/cbtStore';
import { ActiveAuthSession, CbtDatabase } from './types/cbt';

export default function App() {
  const [db, setDb] = useState<CbtDatabase>(() => loadDatabase());
  const [session, setSession] = useState<ActiveAuthSession | null>(() =>
    loadAuthSession()
  );
  const [showGasStudio, setShowGasStudio] = useState(false);

  // Sinkronisasi real-time antar tab (misal Tab 1 Admin Monitoring, Tab 2 Peserta Ujian)
  useEffect(() => {
    const unsubscribe = subscribeDatabaseSync((nextDb) => {
      setDb(nextDb);
    });
    return unsubscribe;
  }, []);

  const handleLogout = () => {
    logoutCurrentUser(session);
    setSession(null);
    setDb(loadDatabase());
  };

  if (showGasStudio) {
    return <GasBlueprintStudio onBack={() => setShowGasStudio(false)} />;
  }

  if (!session) {
    return (
      <LoginView
        db={db}
        onLoginSuccess={(nextSession) => {
          setSession(nextSession);
          setDb(loadDatabase());
        }}
        onOpenGasStudio={() => setShowGasStudio(true)}
      />
    );
  }

  if (session.role === 'admin') {
    return (
      <AdminLayout
        db={db}
        session={session}
        onRefreshDb={setDb}
        onLogout={handleLogout}
        onOpenGasStudio={() => setShowGasStudio(true)}
      />
    );
  }

  return (
    <StudentPortal
      db={db}
      session={session}
      onRefreshDb={setDb}
      onLogout={handleLogout}
    />
  );
}
