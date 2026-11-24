import React from 'react'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ArticleRenderer } from '@/modules/articles/components/article-renderer'

describe('ArticleRenderer — Controlled TipTap React Renderer (PRD §5, §7.5)', () => {
  it('renders standard headings and paragraphs', () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Important Headline' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'This is the body paragraph.' }],
        },
      ],
    }

    const { getByRole, getByText } = render(<ArticleRenderer content={content} />)

    expect(getByRole('heading', { level: 2 })).toHaveTextContent('Important Headline')
    expect(getByText('This is the body paragraph.')).toBeInTheDocument()
  })

  it('renders formatting marks: bold, italic, underline, strike', () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Bold Text', marks: [{ type: 'bold' }] },
            { type: 'text', text: 'Italic Text', marks: [{ type: 'italic' }] },
            { type: 'text', text: 'Underline Text', marks: [{ type: 'underline' }] },
            { type: 'text', text: 'Strike Text', marks: [{ type: 'strike' }] },
          ],
        },
      ],
    }

    const { getByText } = render(<ArticleRenderer content={content} />)

    expect(getByText('Bold Text').tagName).toBe('STRONG')
    expect(getByText('Italic Text').tagName).toBe('EM')
    expect(getByText('Underline Text').tagName).toBe('U')
    expect(getByText('Strike Text').tagName).toBe('S')
  })

  it('renders safe https links with noopener noreferrer', () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Visit Google',
              marks: [{ type: 'link', attrs: { href: 'https://google.com' } }],
            },
          ],
        },
      ],
    }

    const { getByRole } = render(<ArticleRenderer content={content} />)

    const link = getByRole('link', { name: 'Visit Google' })
    expect(link).toHaveAttribute('href', 'https://google.com')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('neutralizes javascript: XSS link payloads', () => {
    const malicious = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Click For Prize',
              marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }],
            },
          ],
        },
      ],
    }

    const { queryByRole, getByText } = render(<ArticleRenderer content={malicious} />)

    // The safeUrlSchema rejects javascript: at document schema validation time
    expect(queryByRole('link')).toBeNull()
    expect(getByText('Content could not be rendered safely.')).toBeInTheDocument()
  })

  it('renders YouTube embeds through hardened youtube-nocookie template only', () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'youtubeEmbed',
          attrs: {
            videoId: 'dQw4w9WgXcQ',
            caption: 'Music video',
          },
        },
      ],
    }

    const { getByTitle, getByText } = render(<ArticleRenderer content={content} />)

    const iframe = getByTitle('YouTube video player')
    expect(iframe).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
    expect(getByText('Music video')).toBeInTheDocument()
  })

  it('rejects malicious iframe URLs or script tags in document', () => {
    const attackDoc = {
      type: 'doc',
      content: [
        {
          type: 'rawHTML',
          attrs: { html: '<script>window.pwned=true</script>' },
        },
      ],
    }

    const { getByText } = render(<ArticleRenderer content={attackDoc} />)

    // Because 'rawHTML' is not in the allowlist, schema parsing fails safely
    expect(getByText('Content could not be rendered safely.')).toBeInTheDocument()
  })
})
