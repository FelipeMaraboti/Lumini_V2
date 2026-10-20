import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import App from '@/App';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { MembersPage } from '@/features/auth/MembersPage';
import { RolesPage } from '@/features/auth/RolesPage';
import { ClientsPage } from '@/features/clients/ClientsPage';
import { ProjectsPage } from '@/features/projects/ProjectsPage';
import { ProjectPage } from '@/features/projects/ProjectPage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<RequireAuth />}>
          <Route path="/" element={<App />} />
          <Route element={<RequireAuth permission="clients.read" />}>
            <Route path="/clients" element={<ClientsPage />} />
          </Route>
          <Route element={<RequireAuth permission="projects.read" />}>
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:id" element={<ProjectPage />} />
          </Route>
          <Route element={<RequireAuth permission="members.read" />}>
            <Route path="/settings/members" element={<MembersPage />} />
          </Route>
          <Route element={<RequireAuth permission="roles.read" />}>
            <Route path="/settings/roles" element={<RolesPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
