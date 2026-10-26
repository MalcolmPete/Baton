import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { ImageNodeView } from './ImageNodeView'

export const ImageBlockExtension = Node.create({
  name: 'imageBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      imageId: { default: null },
      uploadId: { default: null },        // set while the image is still uploading (imageId is null)
      caption: { default: '' },
      width:   { default: 100 },          // percent: 25 | 50 | 75 | 100
      align:   { default: 'center' },     // 'left' | 'center' | 'right'
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-image-block]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-image-block': '' }, HTMLAttributes)]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView)
  },
})
