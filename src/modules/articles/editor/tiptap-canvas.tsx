'use client'

import React, { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import Image from '@tiptap/extension-image'
import CharacterCount from '@tiptap/extension-character-count'
import { YouTubeEmbedExtension } from './extensions/youtube'
import { ImageGalleryExtension } from './extensions/image-gallery'
import { EditorToolbar } from './editor-toolbar'
import { calculateReadingTime, extractTextFromTiptap } from '@/lib/utils'

interface TiptapCanvasProps {
  initialContent: any
  onChange: (json: any, wordCount: number, readingTimeMinutes: number) => void
  placeholder?: string
}

export function TiptapCanvas({
  initialContent,
  onChange,
  placeholder = 'Write your article here...',
}: TiptapCanvasProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
      }),
      CharacterCount,
      YouTubeEmbedExtension,
      ImageGalleryExtension,
    ],
    content: initialContent || { type: 'doc', content: [] },
    editorProps: {
      attributes: {
        class:
          'prose dark:prose-invert max-w-none focus:outline-none min-h-[420px] p-6 text-gray-900 dark:text-gray-100',
      },
    },
    onUpdate({ editor }) {
      const json = editor.getJSON()
      const text = extractTextFromTiptap(json)
      const wordCount = editor.storage.characterCount?.words() ?? text.trim().split(/\s+/).length
      const readingTime = calculateReadingTime(text)
      onChange(json, wordCount, readingTime)
    },
    immediatelyRender: false,
  })

  // Synchronize initial content if changed externally
  useEffect(() => {
    if (editor && initialContent && !editor.isDestroyed) {
      const currentJson = JSON.stringify(editor.getJSON())
      const nextJson = JSON.stringify(initialContent)
      if (currentJson !== nextJson && nextJson !== '{"type":"doc","content":[]}') {
        editor.commands.setContent(initialContent)
      }
    }
  }, [initialContent, editor])

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 shadow-sm flex flex-col">
      <EditorToolbar editor={editor} />
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
