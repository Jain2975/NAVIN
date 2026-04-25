import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// Lazy load pages for code splitting
const EntryGate = lazy(() => import('./pages/EntryGate.jsx'))
const NavigatePage = lazy(() => import('./pages/Navigate.jsx'))
const Parked = lazy(() => import('./pages/Parked.jsx'))
const ExitGate = lazy(() => import('./pages/ExitGate.jsx'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard.jsx'))

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-mesh">
      <div className="text-center animate-fade-in">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-navin-500 border-t-transparent animate-spin" />
        <p className="text-white/50 text-sm font-medium">Loading…</p>
      </div>
    </div>
  )
}

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={
          <ErrorBoundary><EntryGate /></ErrorBoundary>
        } />
        <Route path="/navigate/:sessionId?" element={
          <ErrorBoundary><NavigatePage /></ErrorBoundary>
        } />
        <Route path="/parked/:sessionId?" element={
          <ErrorBoundary><Parked /></ErrorBoundary>
        } />
        <Route path="/exit" element={
          <ErrorBoundary><ExitGate /></ErrorBoundary>
        } />
        <Route path="/admin" element={
          <ErrorBoundary><AdminDashboard /></ErrorBoundary>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default App
