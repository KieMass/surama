import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { NotificationProvider } from './context/NotificationContext'
import ProtectedRoute from './components/ProtectedRoute'
import HomePage from './pages/HomePage'
import Login from './pages/Login'
import Register from './pages/Register'
import ChatBubble from './components/ChatBubble'

// Route-level code splitting: HomePage/Login/Register stay in the main
// bundle since they're the first thing most visitors load (and Login/
// Register are tiny). Everything else — provider/consumer/admin areas,
// chat, account settings — sits behind auth anyway, so the extra chunk
// fetch is invisible next to the async auth-state check that already
// gates them.
const ServiceDetail = lazy(() => import('./pages/ServiceDetail'))
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'))
const Inbox = lazy(() => import('./pages/Inbox'))
const Chat = lazy(() => import('./pages/Chat'))
const Account = lazy(() => import('./pages/Account'))
const TestCheckout = lazy(() => import('./pages/TestCheckout'))
const PaymentResult = lazy(() => import('./pages/PaymentResult'))
const ProviderDashboard = lazy(() => import('./pages/provider/ProviderDashboard'))
const CreateListing = lazy(() => import('./pages/provider/CreateListing'))
const EditListing = lazy(() => import('./pages/provider/EditListing'))
const MyListings = lazy(() => import('./pages/provider/MyListings'))
const ProviderRequests = lazy(() => import('./pages/provider/Requests'))
const ConsumerDashboard = lazy(() => import('./pages/consumer/ConsumerDashboard'))
const MyRequests = lazy(() => import('./pages/consumer/MyRequests'))
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'))
const AdminListings = lazy(() => import('./pages/admin/AdminListings'))
const AdminReviews = lazy(() => import('./pages/admin/AdminReviews'))

function RouteFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <NotificationProvider>
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/services/:id" element={<ServiceDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />

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
          path="/provider/listings/:id/edit"
          element={
            <ProtectedRoute allowedRole="provider">
              <EditListing />
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
        <Route
          path="/account"
          element={<ProtectedRoute><Account /></ProtectedRoute>}
        />
        <Route
          path="/pay/test/:paymentId"
          element={<ProtectedRoute><TestCheckout /></ProtectedRoute>}
        />
        <Route
          path="/pay/result"
          element={<ProtectedRoute><PaymentResult /></ProtectedRoute>}
        />

        <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/listings"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminListings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reviews"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminReviews />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      </Suspense>
      <ChatBubble />
      </NotificationProvider>
    </BrowserRouter>
  )
}
