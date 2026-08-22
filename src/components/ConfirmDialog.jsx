// Blocking confirmation for actions that are destructive or hard to reverse
// (disabling an account, granting/removing admin, deleting a review, …).
// Pass `action` as null to keep the dialog closed.
export default function ConfirmDialog({ action, busy, onConfirm, onCancel }) {
  if (!action) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-2">{action.title}</h3>
        <p className="text-sm text-gray-600 mb-6 leading-relaxed">{action.message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50"
          >
            {busy ? 'Saving…' : action.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
