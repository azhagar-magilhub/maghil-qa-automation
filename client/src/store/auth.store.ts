import { create } from 'zustand'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  type User,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import type { UserProfile } from '@/types'

interface AuthState {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  error: string | null
  initialized: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => {
  // Listen for auth state changes
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const profileDoc = await getDoc(doc(db, 'users', user.uid))
        let profile = profileDoc.exists()
          ? ({ uid: user.uid, ...profileDoc.data() } as UserProfile)
          : null
        // Ensure fullName falls back through: profile.fullName > user.displayName > email prefix
        if (profile && (!profile.fullName || profile.fullName === 'User')) {
          profile = {
            ...profile,
            fullName: user.displayName || user.email?.split('@')[0] || 'User',
          }
        }
        set({ user, profile, loading: false, initialized: true })
      } catch {
        set({ user, profile: null, loading: false, initialized: true })
      }
    } else {
      set({ user: null, profile: null, loading: false, initialized: true })
    }
  })

  return {
    user: null,
    profile: null,
    loading: true,
    error: null,
    initialized: false,

    signIn: async (email, password) => {
      set({ loading: true, error: null })
      try {
        await signInWithEmailAndPassword(auth, email, password)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Sign in failed'
        set({ loading: false, error: message })
        throw err
      }
    },

    signUp: async (email, password, fullName) => {
      set({ loading: true, error: null })
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password)
        // Set Firebase Auth displayName
        await updateProfile(cred.user, { displayName: fullName })
        // Create Firestore user profile directly (don't rely only on Cloud Function)
        await setDoc(doc(db, 'users', cred.user.uid), {
          email,
          fullName,
          role: 'USER',
          isActive: true,
          setupComplete: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Sign up failed'
        set({ loading: false, error: message })
        throw err
      }
    },

    signOut: async () => {
      await firebaseSignOut(auth)
      set({ user: null, profile: null })
    },

    resetPassword: async (email) => {
      set({ error: null })
      try {
        await sendPasswordResetEmail(auth, email)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Password reset failed'
        set({ error: message })
        throw err
      }
    },

    clearError: () => set({ error: null }),
  }
})
