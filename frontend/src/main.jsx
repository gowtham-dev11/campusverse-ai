import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AuthGate from './auth/AuthGate.jsx'

// Single common entry point: AuthGate itself decides whether to show the
// shared Student/Staff login page, the student app, or the staff console,
// based on which session (if any) is already valid — see auth/AuthGate.jsx.
// '/admin' is kept as a convenience alias for old bookmarks/links: it lands
// on the exact same common page, just with the Staff tab pre-selected.
const initialRole = window.location.pathname.startsWith('/admin') ? 'staff' : 'student'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthGate initialRole={initialRole} />
  </StrictMode>,
)
