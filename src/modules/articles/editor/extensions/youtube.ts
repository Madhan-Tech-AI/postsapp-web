import { Node, mergeAttributes } from '@tiptap/core'

export interface YouTubeOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    youtubeEmbed: {
      setYouTubeEmbed: (options: { videoId: string; caption?: string }) => ReturnType
    }
  }
}

export const YouTubeEmbedExtension = Node.create<YouTubeOptions>({
  name: 'youtubeEmbed',
  group: 'block',
  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      videoId: {
        default: null,
      },
      caption: {
        default: null,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-youtube-video-id]',
        getAttrs: (element) => {
          if (typeof element === 'string') return false
          return {
            videoId: element.getAttribute('data-youtube-video-id'),
            caption: element.getAttribute('data-caption'),
          }
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-youtube-video-id': HTMLAttributes.videoId,
        'data-caption': HTMLAttributes.caption,
      }),
      [
        'iframe',
        {
          src: `https://www.youtube-nocookie.com/embed/${HTMLAttributes.videoId}`,
          frameborder: '0',
          allowfullscreen: 'true',
        },
      ],
      HTMLAttributes.caption ? ['p', { class: 'caption' }, HTMLAttributes.caption] : '',
    ]
  },

  addCommands() {
    return {
      setYouTubeEmbed:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          })
        },
    }
  },
})
