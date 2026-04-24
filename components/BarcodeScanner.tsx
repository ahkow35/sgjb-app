'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Loader2 } from 'lucide-react'

interface ScannedProduct {
  id: string
  name: string
  brand: string
  category: string
  unit_type: 'weight' | 'each' | 'volume'
  barcode: string | null
  image_url: string | null
}

interface ScanResult {
  found: boolean
  product: ScannedProduct | null
  source?: string
}

interface Props {
  onClose: () => void
  onProduct: (product: ScannedProduct) => void
  onNotFound: (barcode: string) => void
}

export function BarcodeScanner({ onClose, onProduct, onNotFound }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const [status, setStatus] = useState<'starting' | 'scanning' | 'looking_up' | 'error'>('starting')
  const [error, setError] = useState('')
  const hasResultRef = useRef(false)

  useEffect(() => {
    let stopped = false

    async function start() {
      // Dynamically import to avoid SSR issues
      const { BrowserMultiFormatReader } = await import('@zxing/browser')
      if (stopped) return

      const reader = new BrowserMultiFormatReader()

      try {
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current!,
          async (result, err) => {
            if (stopped || hasResultRef.current) return
            if (!result) return

            const barcode = result.getText()
            hasResultRef.current = true
            setStatus('looking_up')
            controls.stop()

            try {
              const res = await fetch(`/api/barcode?code=${encodeURIComponent(barcode)}`)
              const data: ScanResult = await res.json()

              if (data.product) {
                onProduct(data.product)
              } else {
                onNotFound(barcode)
              }
            } catch {
              // Even if lookup fails, pass the raw barcode back
              onNotFound(barcode)
            }
          },
        )

        if (!stopped) {
          controlsRef.current = controls
          setStatus('scanning')
        } else {
          controls.stop()
        }
      } catch (e) {
        if (!stopped) {
          setError(e instanceof Error ? e.message : 'Camera unavailable')
          setStatus('error')
        }
      }
    }

    start()

    return () => {
      stopped = true
      controlsRef.current?.stop()
      controlsRef.current = null
    }
  }, [onProduct, onNotFound])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80">
        <p className="text-white text-sm font-medium">
          {status === 'starting' && 'Starting camera…'}
          {status === 'scanning' && 'Point at a barcode'}
          {status === 'looking_up' && 'Looking up product…'}
          {status === 'error' && 'Camera error'}
        </p>
        <button onClick={onClose} className="text-white p-1">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Video */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
        />

        {/* Scanning overlay */}
        {(status === 'starting' || status === 'scanning') && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-64 h-40">
              {/* Corner guides */}
              <span className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white" />
              <span className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white" />
              <span className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white" />
              <span className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white" />
              {/* Scan line animation */}
              {status === 'scanning' && (
                <span className="absolute left-0 right-0 h-0.5 bg-red-500 animate-scan-line" />
              )}
            </div>
          </div>
        )}

        {/* Looking up spinner */}
        {status === 'looking_up' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60">
            <Loader2 className="h-10 w-10 text-white animate-spin" />
            <p className="text-white text-sm">Looking up barcode…</p>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 px-8 text-center">
            <p className="text-white">{error || 'Could not access camera'}</p>
            <p className="text-white/60 text-sm">
              Make sure camera permissions are granted and try again.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
