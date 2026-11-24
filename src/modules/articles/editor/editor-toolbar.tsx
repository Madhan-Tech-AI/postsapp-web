'use client'

import React, { useState } from 'react'
import type { Editor } from '@tiptap/react'
import { youtubeVideoIdSchema, safeUrlSchema } from '@/lib/schemas'

interface EditorToolbarProps {
  editor: Editor | null
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [showYouTubeModal, setShowYouTubeModal] = useState(false)

  const [linkUrl, setLinkUrl] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imageAlt, setImageAlt] = useState('')
  const [imageCaption, setImageCaption] = useState('')
  const [youtubeInput, setYoutubeInput] = useState('')
  const [youtubeCaption, setYoutubeCaption] = useState('')
  const [modalError, setModalError] = useState<string | null>(null)

  if (!editor) return null

  // Link handler
  const handleSetLink = (e: React.FormEvent) => {
    e.preventDefault()
    setModalError(null)
    const safe = safeUrlSchema.safeParse(linkUrl)
    if (!safe.success) {
      setModalError('Invalid URL. Only http, https, and mailto URLs are allowed.')
      return
    }
    editor.chain().focus().setLink({ href: safe.data, target: '_blank' }).run()
    setLinkUrl('')
    setShowLinkModal(false)
  }

  // Image handler
  const handleInsertImage = (e: React.FormEvent) => {
    e.preventDefault()
    setModalError(null)
    if (!imageUrl) return
    editor.chain().focus().setImage({
      src: imageUrl,
      alt: imageAlt || 'Article image',
      title: imageCaption,
    }).run()
    setImageUrl('')
    setImageAlt('')
    setImageCaption('')
    setShowImageModal(false)
  }

  // YouTube handler (accepts 11-char ID or full youtube URL and extracts the 11 chars)
  const handleInsertYouTube = (e: React.FormEvent) => {
    e.preventDefault()
    setModalError(null)
    let videoId = youtubeInput.trim()

    // Extract ID if a full URL was pasted
    const match = videoId.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([A-Za-z0-9_-]{11})/)
    if (match && match[1]) {
      videoId = match[1]
    }

    const validId = youtubeVideoIdSchema.safeParse(videoId)
    if (!validId.success) {
      setModalError('Invalid YouTube video. Must be an 11-character video ID or valid YouTube URL.')
      return
    }

    editor.chain().focus().setYouTubeEmbed({
      videoId: validId.data,
      caption: youtubeCaption || undefined,
    }).run()

    setYoutubeInput('')
    setYoutubeCaption('')
    setShowYouTubeModal(false)
  }

  return (
    <div className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/50 p-2 flex flex-wrap items-center gap-1 text-sm rounded-t-xl">
      {/* Headings */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`px-2 py-1 rounded font-bold text-xs ${
          editor.isActive('heading', { level: 1 }) ? 'bg-primary-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
        title="Heading 1"
      >
        H1
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`px-2 py-1 rounded font-bold text-xs ${
          editor.isActive('heading', { level: 2 }) ? 'bg-primary-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
        title="Heading 2"
      >
        H2
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={`px-2 py-1 rounded font-bold text-xs ${
          editor.isActive('heading', { level: 3 }) ? 'bg-primary-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
        title="Heading 3"
      >
        H3
      </button>

      <span className="w-px h-4 bg-gray-300 dark:bg-gray-700 mx-1" />

      {/* Basic Marks */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`px-2 py-1 rounded font-bold ${
          editor.isActive('bold') ? 'bg-primary-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
        title="Bold"
      >
        B
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`px-2 py-1 rounded italic font-serif ${
          editor.isActive('italic') ? 'bg-primary-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
        title="Italic"
      >
        I
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`px-2 py-1 rounded underline ${
          editor.isActive('underline') ? 'bg-primary-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
        title="Underline"
      >
        U
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={`px-2 py-1 rounded line-through ${
          editor.isActive('strike') ? 'bg-primary-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
        title="Strikethrough"
      >
        S
      </button>

      <span className="w-px h-4 bg-gray-300 dark:bg-gray-700 mx-1" />

      {/* Alignment */}
      <button
        type="button"
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        className={`px-2 py-1 rounded text-xs ${
          editor.isActive({ textAlign: 'left' }) ? 'bg-primary-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
        title="Align Left"
      >
        Left
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className={`px-2 py-1 rounded text-xs ${
          editor.isActive({ textAlign: 'center' }) ? 'bg-primary-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
        title="Align Center"
      >
        Center
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        className={`px-2 py-1 rounded text-xs ${
          editor.isActive({ textAlign: 'right' }) ? 'bg-primary-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
        title="Align Right"
      >
        Right
      </button>

      <span className="w-px h-4 bg-gray-300 dark:bg-gray-700 mx-1" />

      {/* Lists & Blocks */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`px-2 py-1 rounded text-xs ${
          editor.isActive('bulletList') ? 'bg-primary-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
        title="Bullet List"
      >
        • List
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`px-2 py-1 rounded text-xs ${
          editor.isActive('orderedList') ? 'bg-primary-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
        title="Numbered List"
      >
        1. List
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`px-2 py-1 rounded text-xs ${
          editor.isActive('blockquote') ? 'bg-primary-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
        title="Blockquote"
      >
        &ldquo; Quote
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        className="px-2 py-1 rounded text-xs hover:bg-gray-200 dark:hover:bg-gray-700"
        title="Divider"
      >
        ― Line
      </button>

      <span className="w-px h-4 bg-gray-300 dark:bg-gray-700 mx-1" />

      {/* Links & Media */}
      <button
        type="button"
        onClick={() => setShowLinkModal(true)}
        className={`px-2 py-1 rounded text-xs ${
          editor.isActive('link') ? 'bg-primary-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
        title="Insert Link"
      >
        🔗 Link
      </button>
      <button
        type="button"
        onClick={() => setShowImageModal(true)}
        className="px-2 py-1 rounded text-xs hover:bg-gray-200 dark:hover:bg-gray-700"
        title="Insert Image"
      >
        🖼 Image
      </button>
      <button
        type="button"
        onClick={() => setShowYouTubeModal(true)}
        className="px-2 py-1 rounded text-xs hover:bg-gray-200 dark:hover:bg-gray-700 text-red-600 font-semibold"
        title="Insert YouTube Video"
      >
        ▶ YouTube
      </button>

      <span className="w-px h-4 bg-gray-300 dark:bg-gray-700 mx-1" />

      {/* History */}
      <button
        type="button"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        className="px-2 py-1 rounded text-xs disabled:opacity-30 hover:bg-gray-200 dark:hover:bg-gray-700"
        title="Undo"
      >
        ↺ Undo
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        className="px-2 py-1 rounded text-xs disabled:opacity-30 hover:bg-gray-200 dark:hover:bg-gray-700"
        title="Redo"
      >
        ↻ Redo
      </button>

      {/* Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={handleSetLink} className="bg-white dark:bg-gray-900 rounded-xl p-5 max-w-sm w-full space-y-4 shadow-xl border border-gray-200">
            <h4 className="font-bold text-sm">Add Web Link</h4>
            {modalError && <p className="text-xs text-red-600">{modalError}</p>}
            <input
              type="url"
              required
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="w-full px-3 py-2 border rounded text-xs outline-none focus:ring-1 focus:ring-primary-500 dark:bg-gray-800"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowLinkModal(false); setModalError(null); }}
                className="px-3 py-1.5 text-xs border rounded"
              >
                Cancel
              </button>
              <button type="submit" className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded">
                Apply Link
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={handleInsertImage} className="bg-white dark:bg-gray-900 rounded-xl p-5 max-w-sm w-full space-y-3 shadow-xl border border-gray-200">
            <h4 className="font-bold text-sm">Insert Image</h4>
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">Image URL / Storage Path</label>
              <input
                type="text"
                required
                placeholder="https://... or article-content/..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full px-3 py-1.5 border rounded text-xs outline-none focus:ring-1 focus:ring-primary-500 dark:bg-gray-800"
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">Alt Text (Accessibility)</label>
              <input
                type="text"
                placeholder="Description of image..."
                value={imageAlt}
                onChange={(e) => setImageAlt(e.target.value)}
                className="w-full px-3 py-1.5 border rounded text-xs outline-none focus:ring-1 focus:ring-primary-500 dark:bg-gray-800"
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">Caption (Optional)</label>
              <input
                type="text"
                placeholder="Caption text displayed below image"
                value={imageCaption}
                onChange={(e) => setImageCaption(e.target.value)}
                className="w-full px-3 py-1.5 border rounded text-xs outline-none focus:ring-1 focus:ring-primary-500 dark:bg-gray-800"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="px-3 py-1.5 text-xs border rounded"
              >
                Cancel
              </button>
              <button type="submit" className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded">
                Insert Image
              </button>
            </div>
          </form>
        </div>
      )}

      {/* YouTube Modal */}
      {showYouTubeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={handleInsertYouTube} className="bg-white dark:bg-gray-900 rounded-xl p-5 max-w-sm w-full space-y-3 shadow-xl border border-gray-200">
            <h4 className="font-bold text-sm">Embed YouTube Video</h4>
            <p className="text-[11px] text-gray-500">
              Only YouTube is supported in V1.0. Arbitrary iframe HTML is disallowed for security.
            </p>
            {modalError && <p className="text-xs text-red-600">{modalError}</p>}
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">Video URL or 11-char ID</label>
              <input
                type="text"
                required
                placeholder="https://youtube.com/watch?v=... or dQw4w9WgXcQ"
                value={youtubeInput}
                onChange={(e) => setYoutubeInput(e.target.value)}
                className="w-full px-3 py-1.5 border rounded text-xs outline-none focus:ring-1 focus:ring-primary-500 dark:bg-gray-800"
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">Caption (Optional)</label>
              <input
                type="text"
                placeholder="Optional video caption"
                value={youtubeCaption}
                onChange={(e) => setYoutubeCaption(e.target.value)}
                className="w-full px-3 py-1.5 border rounded text-xs outline-none focus:ring-1 focus:ring-primary-500 dark:bg-gray-800"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setShowYouTubeModal(false); setModalError(null); }}
                className="px-3 py-1.5 text-xs border rounded"
              >
                Cancel
              </button>
              <button type="submit" className="px-3 py-1.5 text-xs bg-red-600 text-white rounded font-medium">
                Embed Video
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
