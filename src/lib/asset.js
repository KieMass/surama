// Resolves public-folder asset paths correctly for any Vite base URL
// (works in dev at "/" and in production at "/surama/" or any subdirectory)
export const asset = (filename) => `${import.meta.env.BASE_URL}${filename}`
