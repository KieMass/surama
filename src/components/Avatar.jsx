// A person's photo, or their initials when they haven't uploaded one (or
// it fails to load). `className` sets size, shape and initials text size
// (e.g. "w-12 h-12 rounded-2xl text-sm"); `variant` picks the initials
// style — the brand gradient used across the marketplace, or the soft
// tint used on account/admin pages.
import { useState } from 'react'

const GRADIENT = 'linear-gradient(135deg, #ff5a5f, #c93338)'

function initials(name) {
  if (!name?.trim()) return '?'
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')
}

export default function Avatar({ name, photoURL, className = 'w-10 h-10 rounded-full text-sm', variant = 'gradient' }) {
  const [failedUrl, setFailedUrl] = useState(null)

  if (photoURL && failedUrl !== photoURL) {
    return (
      <img
        src={photoURL}
        alt={name ? `${name}'s photo` : ''}
        loading="lazy"
        onError={() => setFailedUrl(photoURL)}
        className={`${className} object-cover flex-shrink-0 bg-gray-100`}
      />
    )
  }

  return variant === 'soft' ? (
    <div className={`${className} bg-primary-100 text-primary-600 flex items-center justify-center font-bold flex-shrink-0`}>
      {initials(name)}
    </div>
  ) : (
    <div className={`${className} text-white flex items-center justify-center font-bold flex-shrink-0`} style={{ background: GRADIENT }}>
      {initials(name)}
    </div>
  )
}
