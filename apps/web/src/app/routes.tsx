import { createBrowserRouter } from "react-router";
import { PremiumLayout } from "./components/PremiumLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { DashboardPage } from "./pages/DashboardPage";
import { ProjectOverviewPage } from "./pages/ProjectOverviewPage";
import { ProjectTasksPage } from "./pages/ProjectTasksPage";
import { ProjectsListPage } from "./pages/ProjectsListPage";
import { TeamPage } from "./pages/TeamPage";
import { TimePage } from "./pages/TimePage";
import { VerificationsPage } from "./pages/VerificationsPage";
import { GitHubSettingsPage } from "./pages/GitHubSettingsPage";
import { ProjectSettingsPage } from "./pages/ProjectSettingsPage";
import { AISettingsPage } from "./pages/AISettingsPage";
import { TeamMemberProfilePage } from "./pages/TeamMemberProfilePage";

import Login from "./pages/Login";
import ProfileSetup from "./pages/ProfileSetup";
import GithubMemberSetup from "./pages/GithubMemberSetup";
import { RegisterPage } from "./pages/RegisterPage";
import { ChatPage } from "./pages/ChatPage";
import { PayrollPage } from "./pages/PayrollPage";
import { AttendancePage } from "./pages/AttendancePage";
import { ClientsPage } from "./pages/ClientsPage";
import { ClientDetailPage } from "./pages/ClientDetailPage";
import { GithubIntegrationPage } from "./pages/GithubIntegrationPage";
import { IdeUpdatesIntegrationPage } from "./pages/IdeUpdatesIntegrationPage";
import { AntigravityIntegrationPage } from "./pages/AntigravityIntegrationPage";
import { ProjectDocumentsPage } from "./pages/ProjectDocumentsPage";
import { ProjectBacklogPage } from "./pages/ProjectBacklogPage";
import { SprintsPage } from "./pages/SprintsPage";
import { ProjectAccessPage } from "./pages/ProjectAccessPage";
import { ProjectVerificationsPage } from "./pages/ProjectVerificationsPage";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    path: "/setup-profile",
    element: <ProtectedRoute><ProfileSetup /></ProtectedRoute>,
  },
  {
    path: "/setup-github",
    element: <ProtectedRoute><GithubMemberSetup /></ProtectedRoute>,
  },
  {
    path: "/",
    element: <ProtectedRoute><PremiumLayout /></ProtectedRoute>,
    children: [
      { 
        index: true, 
        element: <DashboardPage /> 
      },
      {
        path: "verifications",
        element: <VerificationsPage />
      },
      {
        path: "team",
        element: <ProtectedRoute><TeamPage /></ProtectedRoute>
      },
      {
        path: "team/:id",
        element: <TeamMemberProfilePage />
      },
      {
        path: "time",
        element: <TimePage />
      },
      {
        path: "chat",
        element: <ChatPage />
      },
      {
        path: "payroll",
        element: <PayrollPage />
      },
      {
        path: "attendance",
        element: <AttendancePage />
      },
      {
        path: "clients",
        element: <ProtectedRoute requireAdmin><ClientsPage /></ProtectedRoute>
      },
      {
        path: "clients/:id",
        element: <ProtectedRoute requireAdmin><ClientDetailPage /></ProtectedRoute>
      },
      {
        path: "github-integration",
        element: <ProtectedRoute requireAdmin><GithubIntegrationPage /></ProtectedRoute>
      },
      {
        path: "ide-updates-integration",
        element: <ProtectedRoute requireAdmin><IdeUpdatesIntegrationPage /></ProtectedRoute>
      },
      {
        path: "antigravity",
        element: <ProtectedRoute requireAdmin><AntigravityIntegrationPage /></ProtectedRoute>
      },
      {
        path: "projects",
        element: <ProjectsListPage />
      },
      {
        path: "project/:id/overview",
        element: <ProjectOverviewPage />
      },
      {
        path: "project/:id/tasks",
        element: <ProjectTasksPage />
      },
      {
        path: "project/:id/verifications",
        element: <ProjectVerificationsPage />
      },
      {
        path: "project/:id/documents",
        element: <ProjectDocumentsPage />
      },
      {
        path: "project/:id/backlog",
        element: <ProjectBacklogPage />
      },
      {
        path: "project/:id/sprints",
        element: <SprintsPage />
      },
      {
        path: "project/:id/access",
        element: <ProtectedRoute requireAdmin><ProjectAccessPage /></ProtectedRoute>
      },
      {
        path: "project/:id/settings",
        element: <ProtectedRoute requireAdmin><ProjectSettingsPage /></ProtectedRoute>
      },
      {
        path: "github-settings",
        element: <ProtectedRoute requireAdmin><GitHubSettingsPage /></ProtectedRoute>
      },
      {
        path: "ai-settings",
        element: <ProtectedRoute requireAdmin><AISettingsPage /></ProtectedRoute>
      },
    ],
  },
]);