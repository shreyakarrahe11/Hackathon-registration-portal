import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ClerkProvider } from '@clerk/clerk-react'

// Import your Publishable Key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error('Add your Clerk Publishable Key to the .env file')
}

// Clerk appearance customization for transparent glass effect
const clerkAppearance = {
  elements: {
    card: 'bg-black/60 backdrop-blur-xl border border-white/10',
    modalBackdrop: 'bg-black/30 backdrop-blur-sm',
    headerTitle: 'text-white',
    headerSubtitle: 'text-gray-300',
    formFieldLabel: 'text-gray-300',
    formFieldInput: 'bg-white/10 border-white/20 text-white',
    footerActionLink: 'text-purple-400 hover:text-purple-300',
    formButtonPrimary: 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500',
  },
  variables: {
    colorBackground: 'rgba(0, 0, 0, 0.6)',
    colorInputBackground: 'rgba(255, 255, 255, 0.1)',
    colorText: 'white',
    colorTextSecondary: 'rgba(255, 255, 255, 0.7)',
    colorPrimary: '#8b5cf6',
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} appearance={clerkAppearance}>
      <App />
    </ClerkProvider>
  </StrictMode>,
)
