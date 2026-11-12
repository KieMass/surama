// Resolves public-folder asset paths correctly for any Vite base URL
// ("/" on surama.net and in dev; still correct if ever served from a subdirectory)
export const asset = (filename) => `${import.meta.env.BASE_URL}${filename}`
