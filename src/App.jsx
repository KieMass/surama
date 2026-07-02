import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { NotificationProvider } from './context/NotificationContext'
import ProtectedRoute from './components/ProtectedRoute'
import HomePage from './pages/HomePage'
import Login from './pages/Login'
import Register from './pages/Register'
import ServiceDetail from './pages/ServiceDetail'
import ProviderDashboard from './pages/provider/ProviderDashboard'
import CreateListing from './pages/provider/CreateListing'
import MyListings from './pages/provider/MyListings'
import ProviderRequests from './pages/provider/Requests'
import ConsumerDashboard from './pages/consumer/ConsumerDashboard'
import MyRequests from './pages/consumer/MyRequests'
import Inbox from './pages/Inbox'
import Chat from './pages/Chat'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <NotificationProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/services/:id" element={<ServiceDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/provider/dashboard"
          element={
            <ProtectedRoute allowedRole="provider">
              <ProviderDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/provider/listings"
          element={
            <ProtectedRoute allowedRole="provider">
              <MyListings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/provider/listings/create"
          element={
            <ProtectedRoute allowedRole="provider">
              <CreateListing />
            </ProtectedRoute>
          }
        />
        <Route
          path="/provider/requests"
          element={
            <ProtectedRoute allowedRole="provider">
              <ProviderRequests />
            </ProtectedRoute>
          }
        />
        <Route
          path="/consumer/dashboard"
          element={
            <ProtectedRoute allowedRole="consumer">
              <ConsumerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/consumer/requests"
          element={
            <ProtectedRoute allowedRole="consumer">
              <MyRequests />
            </ProtectedRoute>
          }
        />

        <Route
          path="/inbox"
          element={<ProtectedRoute><Inbox /></ProtectedRoute>}
        />
        <Route
          path="/chat/:conversationId"
          element={<ProtectedRoute><Chat /></ProtectedRoute>}
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      </NotificationProvider>
    </BrowserRouter>
  )
}
