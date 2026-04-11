/**
 * Resize an image file via a canvas, preserving aspect ratio.
 * Used for generating product thumbnails and compressing hero images before upload.
 *
 * @param file Source image file
 * @param maxSize Maximum edge length (the longer side will be scaled down to this)
 * @param quality JPEG quality 0-1
 */
export const resizeImage = (file: File, maxSize: number, quality = 0.8): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      reject(new Error('Canvas 2D context unavailable'))
      return
    }
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      let { width, height } = img
      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width
          width = maxSize
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height
          height = maxSize
        }
      }
      canvas.width = width
      canvas.height = height
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Failed to create resized image'))
        },
        'image/jpeg',
        quality,
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load image'))
    }
    img.src = objectUrl
  })
}
