import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { asset } from '../lib/asset'
import { updateUserProfile, uploadAvatar, removeAvatar, changePassword } from '../lib/users'

const GRADIENT = 'linear-gradient(135deg, #ff5a5f 0%, #e8464b 55%, #c93338 100%)'

const inputClass =
  'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition'

function initials(name) {
  if (!name) return '?'
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')
}

export default function Account() {
  const { userDoc, refreshUserDoc } = useAuth()
  const navigate = useNavigate()
  const dashboardPath =
    userDoc?.role === 'admin' ? '/admin/users'
    : userDoc?.role === 'provider' ? '/provider/dashboard'
    : '/consumer/dashboard'

  // ── Photo ──
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState('')

  // ── Profile details ──
  const [name, setName] = useState(userDoc?.name ?? '')
  const [phone, setPhone] = useState(userDoc?.phone ?? '')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileSaved, setProfileSaved] = useState(false)

  // ── Password ──
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSaved, setPasswordSaved] = useState(false)

  const handleSignOut = async () => {
    await signOut(auth)
    navigate('/login')
  }

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0] || null
    e.target.value = ''
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Image must be under 5 MB.')
      return
    }
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please choose an image file.')
      return
    }
    setPhotoError('')
    setUploadingPhoto(true)
    try {
      await uploadAvatar(auth.currentUser.uid, file, userDoc?.photoURL)
      await refreshUserDoc()
    } catch (err) {
      setPhotoError(err.message)
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleRemovePhoto = async () => {
    setUploadingPhoto(true)
    setPhotoError('')
    try {
      await removeAvatar(auth.currentUser.uid, userDoc?.photoURL)
      await refreshUserDoc()
    } catch (err) {
      setPhotoError(err.message)
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setProfileError('')
    setProfileSaved(false)
    setSavingProfile(true)
    try {
      await updateUserProfile(auth.currentUser.uid, { name: name.trim(), phone: phone.trim() })
      await refreshUserDoc()
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 3000)
    } catch (err) {
      setProfileError(err.message)
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSaved(false)
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.')
      return
    }
    setChangingPassword(true)
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordSaved(true)
      setTimeout(() => setPasswordSaved(false), 3000)
    } catch (err) {
      setPasswordError(
        err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password'
          ? 'Current password is incorrect.'
          : err.message
      )
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <Link to="/"><img src={asset('logo-dark.png')} alt="Surama.net" className="h-10 w-auto" /></Link>
        <div className="flex items-center gap-5">
          <Link to={dashboardPath} className="text-sm text-gray-600 hover:text-primary-600 font-medium transition-colors">
            Dashboard
          </Link>
          <button onClick={handleSignOut} className="text-sm text-gray-600 hover:text-primary-600 font-medium transition-colors">
            Sign out
          </button>
        </div>
      </nav>

      {/* Header */}
      <div className="relative overflow-hidden" style={{ background: GRADIENT }}>
        <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-white/5 pointer-events-none" />
        <div className="relative max-w-2xl mx-auto px-6 py-10">
          <p className="text-primary-100 text-sm font-medium mb-1">Settings</p>
          <h1 className="text-3xl font-extrabold text-white mb-1">Account</h1>
          <p className="text-primary-100 text-sm">Manage your profile, photo, and password</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Profile photo */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Profile photo</h2>
          <div className="flex items-center gap-5">
            {userDoc?.photoURL ? (
              <img src={userDoc.photoURL} alt="Your profile" className="w-20 h-20 rounded-full object-cover border border-gray-100" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-2xl font-bold flex-shrink-0">
                {initials(userDoc?.name)}
              </div>
            )}
            <div className="flex flex-col gap-2">
              <label className="inline-block cursor-pointer bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors w-fit disabled:opacity-50">
                {uploadingPhoto ? 'Uploading…' : userDoc?.photoURL ? 'Change photo' : 'Upload photo'}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} disabled={uploadingPhoto} />
              </label>
              {userDoc?.photoURL && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={uploadingPhoto}
                  className="text-xs font-semibold text-gray-500 hover:text-red-600 transition-colors text-left disabled:opacity-50"
                >
                  Remove photo
                </button>
              )}
            </div>
          </div>
          {photoError && (
            <div className="mt-4 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
              {photoError}
            </div>
          )}
          <p className="text-xs text-gray-400 mt-3">JPG, PNG, or WEBP — up to 5 MB.</p>
        </div>

        {/* Profile details */}
        <form onSubmit={handleSaveProfile} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Profile details</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
            <input
              type="text" required value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              type="tel" value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +592 600 0000"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" disabled value={userDoc?.email ?? ''} className={`${inputClass} text-gray-400 cursor-not-allowed`} />
            <p className="text-xs text-gray-400 mt-1">Contact support to change the email on your account.</p>
          </div>

          {profileError && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
              {profileError}
            </div>
          )}
          {profileSaved && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 flex items-center gap-2">
              <span className="text-emerald-500 text-base">✅</span>
              <p className="text-sm font-semibold text-emerald-700">Profile updated!</p>
            </div>
          )}

          <button
            type="submit" disabled={savingProfile}
            className="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
          >
            {savingProfile ? 'Saving…' : 'Save changes'}
          </button>
        </form>

        {/* Change password */}
        <form onSubmit={handleChangePassword} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Change password</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current password</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'} required value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={`${inputClass} pr-11`}
              />
              <button
                type="button" onClick={() => setShowCurrent((v) => !v)}
                aria-label={showCurrent ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700 transition-colors"
              >
                {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'} required minLength={8} value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className={`${inputClass} pr-11`}
              />
              <button
                type="button" onClick={() => setShowNew((v) => !v)}
                aria-label={showNew ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700 transition-colors"
              >
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm new password</label>
            <input
              type={showNew ? 'text' : 'password'} required minLength={8} value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
            />
          </div>

          {passwordError && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
              {passwordError}
            </div>
          )}
          {passwordSaved && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 flex items-center gap-2">
              <span className="text-emerald-500 text-base">✅</span>
              <p className="text-sm font-semibold text-emerald-700">Password changed!</p>
            </div>
          )}

          <button
            type="submit" disabled={changingPassword}
            className="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
          >
            {changingPassword ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}
