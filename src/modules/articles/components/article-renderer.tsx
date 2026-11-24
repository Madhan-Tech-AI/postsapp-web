import React from 'react'
import Image from 'next/image'
import { tiptapDocumentSchema, safeUrlSchema, youtubeVideoIdSchema } from '@/lib/schemas'
import { getStorageUrl } from '@/lib/utils'

interface ArticleRendererProps {
  content: any
  className?: string
}

/**
 * Controlled TipTap JSON React Renderer
 *
 * Implements Architecture Principle 1 & Section 7.5:
 * - TipTap JSON in JSONB is the source of truth
 * - Zero dangerouslySetInnerHTML
 * - Renders via a recursive React component tree
 * - Validates schema and allowlists node types and mark attributes
 * - Renders YouTube only through the hardened template `https://www.youtube-nocookie.com/embed/{id}`
 */
export function ArticleRenderer({ content, className = '' }: ArticleRendererProps) {
  if (!content) return null

  // Validate TipTap JSON against the strict allowlist schema
  const parsed = tiptapDocumentSchema.safeParse(content)
  if (!parsed.success) {
    // If invalid JSON structure, do not crash; render fallback or nothing
    return (
      <div className="text-sm text-gray-500 italic py-4">
        Content could not be rendered safely.
      </div>
    )
  }

  return (
    <article className={`prose dark:prose-invert max-w-none space-y-4 ${className}`}>
      {parsed.data.content.map((node: any, index: number) => (
        <RenderNode key={index} node={node} />
      ))}
    </article>
  )
}

function RenderNode({ node }: { node: any }): React.ReactElement | null {
  if (!node) return null

  switch (node.type) {
    case 'paragraph': {
      const alignClass = getAlignmentClass(node.attrs?.textAlign)
      if (!node.content || node.content.length === 0) {
        return <p className="min-h-[1.5rem]" />
      }
      return (
        <p className={`leading-relaxed ${alignClass}`}>
          {node.content.map((child: any, i: number) => (
            <RenderInline key={i} node={child} />
          ))}
        </p>
      )
    }

    case 'heading': {
      const level = node.attrs?.level || 2
      const alignClass = getAlignmentClass(node.attrs?.textAlign)
      const children = node.content?.map((child: any, i: number) => (
        <RenderInline key={i} node={child} />
      ))

      switch (level) {
        case 1:
          return <h1 className={`text-3xl font-extrabold tracking-tight mt-6 mb-3 ${alignClass}`}>{children}</h1>
        case 2:
          return <h2 className={`text-2xl font-bold tracking-tight mt-6 mb-3 ${alignClass}`}>{children}</h2>
        case 3:
          return <h3 className={`text-xl font-semibold mt-4 mb-2 ${alignClass}`}>{children}</h3>
        case 4:
        default:
          return <h4 className={`text-lg font-medium mt-3 mb-2 ${alignClass}`}>{children}</h4>
      }
    }

    case 'blockquote':
      return (
        <blockquote className="border-l-4 border-primary-500 pl-4 py-1 italic my-4 text-gray-700 dark:text-gray-300">
          {node.content?.map((child: any, i: number) => (
            <RenderNode key={i} node={child} />
          ))}
        </blockquote>
      )

    case 'bulletList':
      return (
        <ul className="list-disc pl-6 space-y-1.5 my-3">
          {node.content?.map((child: any, i: number) => (
            <RenderNode key={i} node={child} />
          ))}
        </ul>
      )

    case 'orderedList':
      return (
        <ol className="list-decimal pl-6 space-y-1.5 my-3">
          {node.content?.map((child: any, i: number) => (
            <RenderNode key={i} node={child} />
          ))}
        </ol>
      )

    case 'listItem':
      return (
        <li>
          {node.content?.map((child: any, i: number) => (
            <RenderNode key={i} node={child} />
          ))}
        </li>
      )

    case 'horizontalRule':
      return <hr className="my-6 border-gray-200 dark:border-gray-800" />

    case 'image': {
      const src = node.attrs?.src
      const alt = node.attrs?.alt || 'Article image'
      const caption = node.attrs?.caption
      const alignClass = getAlignmentClass(node.attrs?.textAlign)

      // Storage path or safe URL
      const imageUrl = src?.startsWith('http') ? src : getStorageUrl(src, 'article-content')
      if (!imageUrl) return null

      return (
        <figure className={`my-6 ${alignClass}`}>
          <div className="relative w-full max-h-[500px] overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
            {/* img element fallback for versatile storage previews */}
            <img
              src={imageUrl}
              alt={alt}
              loading="lazy"
              className="w-full h-auto object-cover rounded-lg"
            />
          </div>
          {caption && (
            <figcaption className="text-xs text-center text-gray-500 mt-2 italic">
              {caption}
            </figcaption>
          )}
        </figure>
      )
    }

    case 'imageGallery': {
      const images: any[] = node.attrs?.images || []
      if (!images || images.length === 0) return null

      return (
        <div className="my-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {images.map((img: any, idx: number) => {
            const url = img.src?.startsWith('http') ? img.src : getStorageUrl(img.src, 'article-content')
            if (!url) return null
            return (
              <figure key={idx} className="space-y-1">
                <img
                  src={url}
                  alt={img.alt || `Gallery image ${idx + 1}`}
                  loading="lazy"
                  className="w-full h-44 object-cover rounded-lg bg-gray-100 dark:bg-gray-800"
                />
                {img.caption && (
                  <figcaption className="text-[11px] text-gray-500 text-center italic">
                    {img.caption}
                  </figcaption>
                )}
              </figure>
            )
          })}
        </div>
      )
    }

    case 'youtubeEmbed': {
      const videoId = node.attrs?.videoId
      const caption = node.attrs?.caption
      const validId = youtubeVideoIdSchema.safeParse(videoId)

      if (!validId.success) return null

      // Section 7.5: store only 11-char ID and render from hardened template
      return (
        <figure className="my-6">
          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-md">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${validId.data}`}
              title="YouTube video player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full border-0"
            />
          </div>
          {caption && (
            <figcaption className="text-xs text-center text-gray-500 mt-2 italic">
              {caption}
            </figcaption>
          )}
        </figure>
      )
    }

    default:
      return null
  }
}

/**
 * Render inline text with mark decorators (bold, italic, underline, strike, link)
 */
function RenderInline({ node }: { node: any }): React.ReactElement {
  if (node.type === 'hardBreak') {
    return <br />
  }

  let element: React.ReactNode = node.text ?? ''

  if (node.marks && Array.isArray(node.marks)) {
    // Apply marks from inside out
    for (const mark of node.marks) {
      switch (mark.type) {
        case 'bold':
          element = <strong className="font-bold">{element}</strong>
          break
        case 'italic':
          element = <em className="italic">{element}</em>
          break
        case 'underline':
          element = <u className="underline">{element}</u>
          break
        case 'strike':
          element = <s className="line-through">{element}</s>
          break
        case 'link': {
          const href = mark.attrs?.href
          const safeHref = safeUrlSchema.safeParse(href)
          if (safeHref.success) {
            element = (
              <a
                href={safeHref.data}
                target={mark.attrs?.target || '_blank'}
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700 underline font-medium"
              >
                {element}
              </a>
            )
          }
          break
        }
      }
    }
    return <>{element}</>
  }

  return <span>{element}</span>
}

function getAlignmentClass(align?: string): string {
  switch (align) {
    case 'center':
      return 'text-center'
    case 'right':
      return 'text-right'
    case 'justify':
      return 'text-justify'
    case 'left':
    default:
      return 'text-left'
  }
}
