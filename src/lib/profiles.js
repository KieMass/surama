import { useEffect, useState } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

// profiles/{uid} is the public face of an account — just a name and photo,
// readable by anyone (including signed-out visitors). users/{uid} holds the
// private details (email, phone, role) and needs sign-in to read, which is
// why listing cards and service pages used to show "Local Provider" to
// visitors. Kept in step with users/{uid} by syncProfile below, which runs
// on every sign-in and whenever the name or photo changes.

const cache = new Map() // uid -> Promise<{ name, photoURL } | null>

function fetchProfile(uid) {
  if (!cache.has(uid)) {
    cache.set(uid, getDoc(doc(db, 'profiles', uid))
      .then((snap) => (snap.exists() ? snap.data() : null))
      .catch(() => null))
  }
  return cache.get(uid)
}

// Writes the public profile if it differs from what's stored. Returns
// quietly on failure: a stale public profile is cosmetic, never blocking.
export async function syncProfile(uid, { name, photoURL }) {
  const next = { name: name ?? '', photoURL: photoURL ?? null }
  const current = await fetchProfile(uid)
  if (current && current.name === next.name && current.photoURL === next.photoURL) return
  try {
    await setDoc(doc(db, 'profiles', uid), next)
    cache.set(uid, Promise.resolve(next))
  } catch {
    // Retried on the next sign-in.
  }
}

// Map of uid -> { name, photoURL } for the given ids; ids without a public
// profile yet (accounts that haven't signed in since profiles were added)
// are simply absent, so callers fall back to whatever name they already have.
export async function getProfiles(uids) {
  const ids = [...new Set(uids.filter(Boolean))]
  const entries = await Promise.all(ids.map((uid) => fetchProfile(uid).then((p) => [uid, p])))
  return Object.fromEntries(entries.filter(([, p]) => p))
}

// Hook form of getProfiles, for components.
export function useProfiles(uids) {
  const key = [...new Set(uids.filter(Boolean))].sort().join(',')
  const [profiles, setProfiles] = useState({})

  useEffect(() => {
    if (!key) return
    let cancelled = false
    getProfiles(key.split(',')).then((result) => {
      if (!cancelled) setProfiles(result)
    })
    return () => { cancelled = true }
  }, [key])

  return profiles
}

export function useProfile(uid) {
  return useProfiles(uid ? [uid] : [])[uid] ?? null
}
