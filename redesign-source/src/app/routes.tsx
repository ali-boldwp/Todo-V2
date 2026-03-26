import { createBrowserRouter } from "react-router";
import { PremiumLayout } from "./components/PremiumLayout";
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
import { PlaceholderPage } from "./pages/PlaceholderPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: PremiumLayout,
    children: [
      { 
        index: true, 
        Component: DashboardPage 
      },
      {
        path: "verifications",
        element: <VerificationsPage />
      },
      {
        path: "team",
        Component: TeamPage
      },
      {
        path: "team/:id",
        Component: TeamMemberProfilePage
      },
      {
        path: "time",
        element: <TimePage />
      },
      {
        path: "chat",
        element: <PlaceholderPage title="Chat" description="Team messaging and collaboration." />
      },
      {
        path: "projects",
        Component: ProjectsListPage
      },
      {
        path: "project/:id/overview",
        Component: ProjectOverviewPage
      },
      {
        path: "project/:id/tasks",
        Component: ProjectTasksPage
      },
      {
        path: "project/:id/verifications",
        element: <PlaceholderPage title="Project Verifications" description="Task verifications for this project." />
      },
      {
        path: "project/:id/documents",
        element: <PlaceholderPage title="Project Documents" description="Manage project documentation and files." />
      },
      {
        path: "project/:id/settings",
        element: <ProjectSettingsPage />
      },
      {
        path: "github-settings",
        element: <GitHubSettingsPage />
      },
      {
        path: "ai-settings",
        element: <AISettingsPage />
      },
    ],
  },
]);