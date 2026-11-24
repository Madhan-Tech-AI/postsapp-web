'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteMediaAction } from '@/modules/media/actions'
import type { UserRole } from '@/lib/schemas'

interface MediaClientProps {
  initialItems: any[]
  totalCount: number
  currentPage: number
  userRole: UserRole
  currentUserId: string
}

export function MediaClient({
  initialItems,
  totalCount,
  currentPage,
  userRole,
  currentUserId,
}: MediaClientProps) {
  const router = useRouter()
  const [items, setItems] = useState<any[]>(initialItems)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Copy helper
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Delete handler
  const handleDelete = (mediaId: string) => {
    setActionError(null)
    startTransition(async () => {
      const res = await deleteMediaAction(mediaId)
      if (!res.success) {
        setActionError(res.error || 'Failed to delete media')
      } else {
        setItems((prev) => prev.filter((m) => m.id !== mediaId))
        setDeleteTargetId(null)
      }
    })
  }

  // Upload handler via fetch to the secure API route
  const handleUploadSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setUploadError(null)
    setIsUploading(true)

    const form = e.currentTarget
    const formData = new FormData(form)

    try {
      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        setUploadError(data.error || 'Upload failed')
      } else {
        setShowUploadModal(false)
        router.refresh()
      }
    } catch {
      setUploadError('Network error during upload')
    } finally {
      setIsUploading(false)
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Media Library
          </h1>
          <p className="text-sm text-gray-500">
            {userRole === 'author'
              ? 'Your uploaded editorial assets with automatic WebP optimization and EXIF stripping'
              : 'All publication media assets, dimensions, and storage paths'}
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          + Upload Media
        </button>
      </div>

      {actionError && (
        <div role="alert" className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {actionError}
        </div>
      )}

      {/* Media Grid */}
      {items.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
          <p className="text-gray-400 text-sm">No media assets found in library.</p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="mt-3 text-xs text-primary-600 hover:underline font-semibold"
          >
            Upload your first image
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {items.map((item) => {
            const publicUrl = `${supabaseUrl}/storage/v1/object/public/${item.storage_path}`
            const sizeKb = Math.round((item.file_size_bytes || 0) / 1024)
            const canDelete = userRole !== 'author' || item.uploader_id === currentUserId

            return (
              <div
                key={item.id}
                className="group relative bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm flex flex-col"
              >
                <div className="aspect-square bg-gray-100 dark:bg-gray-800 relative overflow-hidden">
                  <img
                    src={publicUrl}
                    alt={item.alt_text || 'Media thumbnail'}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  {/* Badge */}
                  <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/60 text-white backdrop-blur-xs">
                    {item.width && item.height ? `${item.width}×${item.height}` : 'IMG'}
                  </span>
                </div>

                <div className="p-2.5 flex-1 flex flex-col justify-between text-[11px] space-y-1.5">
                  <div>
                    <div className="text-gray-400 text-[10px]">
                      {sizeKb} KB • {new Date(item.created_at).toLocaleDateString()}
                    </div>
                    <div className="font-medium text-gray-700 dark:text-gray-300 truncate">
                      {item.profiles?.display_name || 'Staff'}
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleCopy(item.id, item.storage_path)}
                      className="text-xs text-primary-600 hover:underline font-medium truncate"
                      title="Copy Storage Path for Articles"
                    >
                      {copiedId === item.id ? 'Copied!' : 'Copy Path'}
                    </button>

                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => setDeleteTargetId(item.id)}
                        className="text-gray-400 hover:text-red-600 text-xs"
                        title="Delete Media"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Upload Dropzone Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">
              Upload Media
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Uploads are automatically validated with magic bytes, stripped of GPS/EXIF metadata, and compressed into WebP.
            </p>

            {uploadError && (
              <div role="alert" className="mb-3 p-3 bg-red-50 text-red-700 text-xs rounded-lg">
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Target Bucket
                </label>
                <select
                  name="bucket"
                  defaultValue="article-content"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-xs dark:bg-gray-800"
                >
                  <option value="article-content">Article Content (article-content)</option>
                  <option value="article-featured">Featured Cover Image (article-featured)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Choose Image (JPEG, PNG, WebP — max 10MB)
                </label>
                <input
                  type="file"
                  name="file"
                  required
                  accept="image/jpeg,image/png,image/webp"
                  className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Alt Text (for accessibility)
                </label>
                <input
                  type="text"
                  name="altText"
                  placeholder="Describe image content..."
                  className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg text-xs dark:bg-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Caption (Optional)
                </label>
                <input
                  type="text"
                  name="caption"
                  placeholder="Optional image caption"
                  className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg text-xs dark:bg-gray-800"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium"
                >
                  {isUploading ? 'Processing & Uploading...' : 'Upload Image'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
              Confirm Media Deletion
            </h3>
            <p className="text-xs text-gray-500 mb-6">
              This will permanently delete the image from storage and database records. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTargetId(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteTargetId)}
                disabled={isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium"
              >
                {isPending ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
