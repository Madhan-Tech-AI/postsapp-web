'use client'

import React, { useState, useEffect, useRef, useTransition, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { TiptapCanvas } from '@/modules/articles/editor/tiptap-canvas'
import { ArticleRenderer } from '@/modules/articles/components/article-renderer'
import { updateArticleAction } from '@/modules/articles/actions'
import type { UserRole, LanguageCode, ArticleStatus } from '@/lib/schemas'

interface EditorClientProps {
  initialArticle: any
  userRole: UserRole
  currentUserId: string
  categories: any[]
  tags: any[]
}

export function EditorClient({
  initialArticle,
  userRole,
  categories,
  tags,
}: EditorClientProps) {
  const router = useRouter()

  // Form State
  const [title, setTitle] = useState(initialArticle.title || '')
  const [subtitle, setSubtitle] = useState(initialArticle.subtitle || '')
  const [shortDescription, setShortDescription] = useState(initialArticle.short_description || '')
  const [slug, setSlug] = useState(initialArticle.slug || '')
  const [contentJson, setContentJson] = useState(initialArticle.content_json || { type: 'doc', content: [] })
  const [coverImagePath, setCoverImagePath] = useState(initialArticle.cover_image_path || '')
  const [coverImageAlt, setCoverImageAlt] = useState(initialArticle.cover_image_alt || '')
  const [seoTitle, setSeoTitle] = useState(initialArticle.seo_title || '')
  const [seoDescription, setSeoDescription] = useState(initialArticle.seo_description || '')

  // Primary category & tags
  const primaryCat = initialArticle.article_categories?.find((ac: any) => ac.is_primary)?.category_id || ''
  const [categoryId, setCategoryId] = useState(primaryCat)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    initialArticle.article_tags?.map((at: any) => at.tag_id) || []
  )

  // Editor telemetry & UX
  const [wordCount, setWordCount] = useState(0)
  const [readingTime, setReadingTime] = useState(initialArticle.reading_time_minutes || 1)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'offline'>('saved')
  const [isDirty, setIsDirty] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const localDraftKey = `postsapp_draft_${initialArticle.id}`

  // Check Draft Recovery on mount
  useEffect(() => {
    const localSaved = localStorage.getItem(localDraftKey)
    if (localSaved) {
      try {
        const parsed = JSON.parse(localSaved)
        if (parsed.timestamp > new Date(initialArticle.updated_at).getTime()) {
          // Local autosave is newer than DB snapshot
          const restore = window.confirm(
            'We found unsaved changes saved in this browser from a previous session. Would you like to restore them?'
          )
          if (restore) {
            if (parsed.title) setTitle(parsed.title)
            if (parsed.contentJson) setContentJson(parsed.contentJson)
            if (parsed.shortDescription) setShortDescription(parsed.shortDescription)
          }
        }
      } catch {
        // Ignore parse error
      }
    }
  }, [initialArticle.id, initialArticle.updated_at, localDraftKey])

  // Save Draft function
  const saveDraft = useCallback(
    async (isAutosave = false) => {
      if (isAutosave) {
        setSaveStatus('saving')
      }

      // Backup to local storage for crash/draft recovery
      localStorage.setItem(
        localDraftKey,
        JSON.stringify({
          title,
          contentJson,
          shortDescription,
          timestamp: Date.now(),
        })
      )

      const formData = new FormData()
      formData.set('title', title)
      formData.set('subtitle', subtitle)
      formData.set('shortDescription', shortDescription)
      formData.set('slug', slug)
      formData.set('contentJson', JSON.stringify(contentJson))
      formData.set('coverImagePath', coverImagePath)
      formData.set('coverImageAlt', coverImageAlt)
      if (categoryId) formData.set('categoryId', categoryId)

      const res = await updateArticleAction(initialArticle.id, null, formData)

      if (res.success) {
        setSaveStatus('saved')
        setIsDirty(false)
        if (!isAutosave) {
          setFeedbackMessage({ type: 'success', text: 'Draft saved successfully!' })
          setTimeout(() => setFeedbackMessage(null), 3000)
        }
      } else {
        setSaveStatus('offline')
        if (!isAutosave) {
          setFeedbackMessage({ type: 'error', text: res.error || 'Failed to save draft' })
        }
      }
    },
    [
      title,
      subtitle,
      shortDescription,
      slug,
      contentJson,
      coverImagePath,
      coverImageAlt,
      categoryId,
      initialArticle.id,
      localDraftKey,
    ]
  )

  // Trigger throttled autosave whenever content changes
  const handleEditorChange = (json: any, words: number, minutes: number) => {
    setContentJson(json)
    setWordCount(words)
    setReadingTime(minutes)
    setIsDirty(true)
    setSaveStatus('saving')

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
    }

    autosaveTimerRef.current = setTimeout(() => {
      saveDraft(true)
    }, 4000) // 4s debounced autosave
  }

  // Unsaved changes guard
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/articles"
            className="text-xs font-medium text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
          >
            ← Back to Articles
          </Link>
          <span className="w-px h-4 bg-gray-200 dark:bg-gray-700" />
          {/* Autosave Indicator */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span
              className={`w-2 h-2 rounded-full ${
                saveStatus === 'saved'
                  ? 'bg-green-500'
                  : saveStatus === 'saving'
                  ? 'bg-amber-500 animate-pulse'
                  : 'bg-red-500'
              }`}
            />
            <span className="capitalize">{saveStatus}</span>
          </div>
          <span className="text-xs text-gray-400">
            {wordCount} words • {readingTime} min read
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Live Preview Toggle */}
          <button
            type="button"
            onClick={() => setIsPreviewOpen(!isPreviewOpen)}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {isPreviewOpen ? 'Hide Preview' : '👁 Live Preview'}
          </button>

          {/* Manual Save Draft Button */}
          <button
            type="button"
            onClick={() => saveDraft(false)}
            disabled={isPending}
            className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg text-xs font-semibold"
          >
            Save Draft
          </button>
        </div>
      </div>

      {feedbackMessage && (
        <div
          role="status"
          className={`p-3 rounded-lg text-xs font-medium ${
            feedbackMessage.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {feedbackMessage.text}
        </div>
      )}

      {/* Two-Pane Editorial Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Pane: Editorial Canvas */}
        <div className={`space-y-4 ${isPreviewOpen ? 'lg:col-span-5' : 'lg:col-span-8'}`}>
          <div className="space-y-3 bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
            {/* Title / Headline Input */}
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                setIsDirty(true)
              }}
              placeholder="Headline / Article Title"
              className="w-full text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 border-none outline-none focus:ring-0 placeholder-gray-300 dark:placeholder-gray-700"
            />

            {/* Subtitle Input */}
            <input
              type="text"
              value={subtitle}
              onChange={(e) => {
                setSubtitle(e.target.value)
                setIsDirty(true)
              }}
              placeholder="Subtitle / Standfirst (optional)"
              className="w-full text-base text-gray-600 dark:text-gray-300 border-none outline-none focus:ring-0 placeholder-gray-300 dark:placeholder-gray-700 italic"
            />
          </div>

          {/* TipTap Rich Text Canvas */}
          <TiptapCanvas
            initialContent={contentJson}
            onChange={handleEditorChange}
          />
        </div>

        {/* Live Preview Column (if active) */}
        {isPreviewOpen && (
          <div className="lg:col-span-4 bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm max-h-[85vh] overflow-y-auto">
            <h3 className="text-xs uppercase tracking-wider font-bold text-gray-400 mb-4 pb-2 border-b">
              Live Reader Preview
            </h3>
            <h1 className="text-2xl font-bold mb-2">{title || 'Untitled Article'}</h1>
            {subtitle && <p className="text-gray-500 italic mb-4">{subtitle}</p>}
            <ArticleRenderer content={contentJson} />
          </div>
        )}

        {/* Right Pane: Settings & Publication Panel */}
        <div className={`${isPreviewOpen ? 'lg:col-span-3' : 'lg:col-span-4'} space-y-4`}>
          <div className="bg-white dark:bg-gray-900 p-5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-5">
            {/* Status & Language Badge */}
            <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-gray-800">
              <div>
                <span className="text-xs text-gray-400 uppercase tracking-wider block">Status</span>
                <span className="text-xs font-bold capitalize text-amber-600">
                  {initialArticle.status}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-400 uppercase tracking-wider block">Language</span>
                <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-blue-50 text-blue-700">
                  {initialArticle.language}
                </span>
              </div>
            </div>

            {/* Bilingual Linkage */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Story Translation
              </label>
              <div className="text-xs p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg flex justify-between items-center">
                <span>
                  Counterpart:{' '}
                  <strong>{initialArticle.language === 'en' ? 'Tamil (ta)' : 'English (en)'}</strong>
                </span>
                {initialArticle.translations?.length > 1 ? (
                  <Link
                    href={`/admin/articles/${
                      initialArticle.translations.find((t: any) => t.language !== initialArticle.language)?.article_id
                    }/edit`}
                    className="text-primary-600 hover:underline font-semibold"
                  >
                    Open
                  </Link>
                ) : (
                  <Link
                    href={`/admin/articles/new?translationGroupId=${initialArticle.translation_group_id}&language=${
                      initialArticle.language === 'en' ? 'ta' : 'en'
                    }`}
                    className="text-primary-600 hover:underline font-semibold"
                  >
                    + Create
                  </Link>
                )}
              </div>
            </div>

            {/* Primary Category */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Primary Category <span className="text-red-500">*</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value)
                  setIsDirty(true)
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-xs dark:bg-gray-800 outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">Select Category</option>
                {categories.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* URL Slug */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                URL Slug <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value)
                  setIsDirty(true)
                }}
                className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg text-xs font-mono dark:bg-gray-800 outline-none focus:ring-1 focus:ring-primary-500"
              />
              <p className="text-[10px] text-gray-400 mt-1">Unique per language.</p>
            </div>

            {/* Short Description */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Short Description (Card Summary) <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={shortDescription}
                onChange={(e) => {
                  setShortDescription(e.target.value)
                  setIsDirty(true)
                }}
                placeholder="Required for publishing (preview cards)..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-xs dark:bg-gray-800 outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            {/* Featured Image */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Cover Image Path / URL <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={coverImagePath}
                onChange={(e) => {
                  setCoverImagePath(e.target.value)
                  setIsDirty(true)
                }}
                placeholder="article-featured/... or https://..."
                className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg text-xs dark:bg-gray-800 outline-none focus:ring-1 focus:ring-primary-500"
              />
              <input
                type="text"
                value={coverImageAlt}
                onChange={(e) => {
                  setCoverImageAlt(e.target.value)
                  setIsDirty(true)
                }}
                placeholder="Cover image alt text"
                className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg text-xs dark:bg-gray-800 outline-none mt-1.5 focus:ring-1 focus:ring-primary-500"
              />
            </div>

            {/* SEO Metadata */}
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                SEO Metadata
              </span>
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">Meta Title</label>
                <input
                  type="text"
                  maxLength={160}
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder="Defaults to article title"
                  className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg text-xs dark:bg-gray-800 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">Meta Description</label>
                <textarea
                  rows={2}
                  maxLength={320}
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  placeholder="Defaults to short description"
                  className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg text-xs dark:bg-gray-800 outline-none"
                />
              </div>
            </div>

            {/* Author info (display only — derived on server) */}
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400">
              Author:{' '}
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {initialArticle.profiles?.display_name || 'Staff'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
