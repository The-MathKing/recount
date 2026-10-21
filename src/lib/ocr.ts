// On-device text recognition for photographed lab reports. Tesseract's LSTM model runs in a Web Worker
// in this tab; the image is never uploaded. The engine and model are served from this site (public/ocr).

export type OcrProgress = { stage: 'loading' | 'reading'; fraction: number }

// The largest side we pass to OCR. Phone photos are often 4000px+, which is slow and no more accurate.
const MAX_SIDE = 2400

async function prepare(image: Blob): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(image)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')!
  // Grayscale with a little extra contrast helps on photos taken under warm indoor light.
  ctx.filter = 'grayscale(1) contrast(1.25)'
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas
}

export async function readImage(image: Blob, onProgress: (p: OcrProgress) => void): Promise<string> {
  // Loaded on demand so the 7 MB engine only downloads for people who use this feature.
  const { createWorker, OEM, PSM } = await import('tesseract.js')
  const asset = (path: string) => new URL(`ocr/${path}`, document.baseURI).href
  onProgress({ stage: 'loading', fraction: 0 })
  const worker = await createWorker('eng', OEM.LSTM_ONLY, {
    workerPath: asset('worker.min.js'),
    corePath: asset(''),
    langPath: asset('').replace(/\/$/, ''),
    logger: (m) => {
      if (m.status === 'recognizing text') onProgress({ stage: 'reading', fraction: m.progress })
      else onProgress({ stage: 'loading', fraction: m.progress })
    },
  })
  try {
    // Lab reports are tables: read each printed row as one line instead of splitting columns into blocks.
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK, preserve_interword_spaces: '1' })
    const { data } = await worker.recognize(await prepare(image))
    return data.text
  } finally {
    await worker.terminate()
  }
}
