import { Node, mergeAttributes } from '@tiptap/core'

export interface ImageGalleryOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    imageGallery: {
      setImageGallery: (options: {
        images: { src: string; alt?: string; caption?: string }[]
      }) => ReturnType
    }
  }
}

export const ImageGalleryExtension = Node.create<ImageGalleryOptions>({
  name: 'imageGallery',
  group: 'block',
  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      images: {
        default: [],
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-image-gallery]',
        getAttrs: (element) => {
          if (typeof element === 'string') return false
          try {
            const raw = element.getAttribute('data-images')
            return {
              images: raw ? JSON.parse(raw) : [],
            }
          } catch {
            return { images: [] }
          }
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-image-gallery': 'true',
        'data-images': JSON.stringify(HTMLAttributes.images || []),
      }),
    ]
  },

  addCommands() {
    return {
      setImageGallery:
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
