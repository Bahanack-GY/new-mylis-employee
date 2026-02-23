import { Routes, Route, Navigate } from "react-router-dom"
import DashboardLayout from "./layouts/DashboardLayout"
import EmbedLayout from "./layouts/EmbedLayout"
import ProtectedRoute from "./components/ProtectedRoute"
import PublicRoute from "./components/PublicRoute"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Profile from "./pages/Profile"
import Tickets from "./pages/Tickets"
import Meetings from "./pages/Meetings"
import Documents from "./pages/Documents"
import Tasks from "./pages/Tasks"
import Projects from "./pages/Projects"
import Formations from "./pages/Formations"
import Sanctions from "./pages/Sanctions"
import Notifications from "./pages/Notifications"
import Messages from "./pages/Messages"
import Demands from "./pages/Demands"
import OShome from "./pages/OShome"

const isMobile = () => window.innerWidth < 768;

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login />} />
      </Route>

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/os" element={<OShome />} />
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/tickets" element={<Tickets />} />
          <Route path="/meetings" element={<Meetings />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/formations" element={<Formations />} />
          <Route path="/sanctions" element={<Sanctions />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/demands" element={<Demands />} />
        </Route>
        <Route path="/messages" element={<Messages />} />
      </Route>

      {/* Embed routes for OS desktop iframes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<EmbedLayout />}>
          <Route path="/embed/dashboard" element={<Dashboard />} />
          <Route path="/embed/tasks" element={<Tasks />} />
          <Route path="/embed/projects" element={<Projects />} />
          <Route path="/embed/tickets" element={<Tickets />} />
          <Route path="/embed/meetings" element={<Meetings />} />
          <Route path="/embed/documents" element={<Documents />} />
          <Route path="/embed/formations" element={<Formations />} />
          <Route path="/embed/sanctions" element={<Sanctions />} />
          <Route path="/embed/demands" element={<Demands />} />
          <Route path="/embed/notifications" element={<Notifications />} />
          <Route path="/embed/profile" element={<Profile />} />
        </Route>
        <Route path="/embed/messages" element={<Messages />} />
      </Route>

      {/* Redirects */}
      <Route path="/" element={<Navigate to={isMobile() ? '/dashboard' : '/os'} replace />} />
      <Route path="*" element={<Navigate to={isMobile() ? '/dashboard' : '/os'} replace />} />
    </Routes>
  )
}

export default App
