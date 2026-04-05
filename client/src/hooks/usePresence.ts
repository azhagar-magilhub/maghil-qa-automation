import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  doc, setDoc, onSnapshot, collection, query, where,
  serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth.store'

export interface PresenceUser {
  userId: string
  displayName: string
  email: string
  avatarUrl?: string
  currentPage: string
  lastSeen: Timestamp | null
  isOnline: boolean
}

export function usePresence() {
  const { user, profile } = useAuthStore()
  const location = useLocation()
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([])

  // Write own presence on mount, update currentPage on route change
  useEffect(() => {
    if (!user) return

    const presenceRef = doc(db, 'presence', user.uid)

    const writePresence = (page: string) => {
      setDoc(presenceRef, {
        userId: user.uid,
        displayName: profile?.fullName || user.displayName || user.email?.split('@')[0] || 'User',
        email: user.email || '',
        avatarUrl: user.photoURL || '',
        currentPage: page,
        lastSeen: serverTimestamp(),
        isOnline: true,
      }, { merge: true })
    }

    writePresence(location.pathname)

    const handleBeforeUnload = () => {
      // Use sendBeacon pattern — setDoc may not complete on unload
      // Fallback: set offline
      setDoc(presenceRef, { isOnline: false, lastSeen: serverTimestamp() }, { merge: true })
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      setDoc(presenceRef, { isOnline: false, lastSeen: serverTimestamp() }, { merge: true })
    }
  }, [user, profile])

  // Update currentPage on route change
  useEffect(() => {
    if (!user) return
    const presenceRef = doc(db, 'presence', user.uid)
    setDoc(presenceRef, {
      currentPage: location.pathname,
      lastSeen: serverTimestamp(),
    }, { merge: true })
  }, [location.pathname, user])

  // Listen to all online users
  useEffect(() => {
    const q = query(
      collection(db, 'presence'),
      where('isOnline', '==', true)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users: PresenceUser[] = []
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as PresenceUser
        users.push({ ...data, userId: docSnap.id })
      })
      setOnlineUsers(users)
    })

    return () => unsubscribe()
  }, [])

  return { onlineUsers }
}
