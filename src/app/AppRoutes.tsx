import { BrowserRouter, MemoryRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AppShell } from '@/app/AppShell';
import { AuthProvider } from '@/features/auth/AuthContext';
import { LibraryDocumentPage } from '@/features/library/LibraryDocumentPage';
import { BookmarksPage } from '@/features/library/BookmarksPage';
import { PersonalizationProvider } from '@/features/personalization/PersonalizationContext';
import { LibraryPage } from '@/features/library/LibraryPage';
import { DailyPracticePage } from '@/features/practice/DailyPracticePage';
import { DoctrinePage } from '@/features/reader/DoctrinePage';
import { SermonPage } from '@/features/sermons/SermonPage';
import { SermonsPage } from '@/features/sermons/SermonsPage';
import { ReadingSettingsProvider } from '@/features/settings/ReadingSettingsContext';
import {
  AboutLegalSettingsPage,
  ReadingDisplaySettingsPage,
  TimerDefaultsSettingsPage,
} from '@/features/settings/SettingsPanels';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { SyncProvider } from '@/features/sync/SyncContext';
import { TimerPage } from '@/features/timer/TimerPage';

function RoutedApp() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route element={<Navigate replace to="/library" />} path="/" />
        <Route element={<LibraryPage />} path="/library" />
        <Route element={<BookmarksPage />} path="/library/bookmarks" />
        <Route element={<DoctrinePage />} path="/library/doctrine/:slug" />
        <Route element={<LibraryDocumentPage authorityClass="supplemental" />} path="/library/supplemental/:slug" />
        <Route element={<SermonsPage />} path="/library/sermons" />
        <Route element={<SermonPage />} path="/library/sermons/:slug" />
        <Route element={<Navigate replace to="/settings" />} path="/auth/callback" />
        <Route element={<DailyPracticePage />} path="/daily" />
        <Route element={<TimerPage />} path="/timer" />
        <Route element={<SettingsPage />} path="/settings" />
        <Route element={<ReadingDisplaySettingsPage />} path="/settings/reading-display" />
        <Route element={<TimerDefaultsSettingsPage />} path="/settings/timer-defaults" />
        <Route element={<AboutLegalSettingsPage />} path="/settings/about-legal" />
        <Route element={<Navigate replace to="/settings" />} path="/settings/account" />
      </Route>
    </Routes>
  );
}

export function AppRoutes() {
  return (
    <ReadingSettingsProvider>
      <AuthProvider>
        <SyncProvider>
          <PersonalizationProvider>
            <RoutedApp />
          </PersonalizationProvider>
        </SyncProvider>
      </AuthProvider>
    </ReadingSettingsProvider>
  );
}

export function AppTestRouter({ initialEntries = ['/library'] }: { initialEntries?: string[] }) {
  return (
    <ReadingSettingsProvider>
      <AuthProvider>
        <SyncProvider>
          <PersonalizationProvider>
            <MemoryRouter initialEntries={initialEntries}>
              <RoutedApp />
            </MemoryRouter>
          </PersonalizationProvider>
        </SyncProvider>
      </AuthProvider>
    </ReadingSettingsProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppRoutes />
    </BrowserRouter>
  );
}
