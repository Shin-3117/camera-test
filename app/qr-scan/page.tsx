'use client'

import {useEffect, useRef, useState} from 'react'
import {BrowserMultiFormatReader, NotFoundException, Result} from '@zxing/library'

export default function QrScanPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined)
  const [scanning, setScanning] = useState(false)
  const [resultText, setResultText] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [capturedImage, setCapturedImage] = useState<string>('')

  // Initialize the reader once
  useEffect(() => {
    readerRef.current = new BrowserMultiFormatReader()
    return () => {
      stopScanning()
      readerRef.current?.reset()
      readerRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Ask for permission and enumerate cameras
  useEffect(() => {
    let cancelled = false
    async function initDevices() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setError('This browser does not support camera access.')
          return
        }
        // Request permission so that enumerateDevices returns labels
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        try {
          const devices = await navigator.mediaDevices.enumerateDevices()
          if (!cancelled) {
            const videoInputs = devices.filter(d => d.kind === 'videoinput')
            setCameras(videoInputs)
            // Prefer back camera if available
            const backCam = videoInputs.find(d => /back|rear|environment/i.test(d.label))
            setSelectedDeviceId(backCam?.deviceId || videoInputs[0]?.deviceId)
          }
        } finally {
          // Stop the temp stream used only for permissions
          stream.getTracks().forEach(t => t.stop())
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || String(e))
      }
    }
    initDevices()
    return () => { cancelled = true }
  }, [])

  // Auto-start scanning when device is selected
  useEffect(() => {
    if (!selectedDeviceId) return
    startScanning(selectedDeviceId)
    // cleanup: handled by stopScanning on device change
    return () => { stopScanning() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDeviceId])

  function startScanning(deviceId?: string) {
    if (!videoRef.current || !readerRef.current) return
    setError('')
    setResultText('')

    try {
      setScanning(true)
      readerRef.current.decodeFromVideoDevice(
        deviceId ?? null,
        videoRef.current,
        (result: Result | undefined, err: unknown) => {
          if (result) {
            setResultText(result.getText())
          }
          if (err && !(err instanceof NotFoundException)) {
            const anyErr = err as any
            setError(anyErr?.message || String(err))
          }
        }
      )
    } catch (e: any) {
      setError(e?.message || String(e))
      setScanning(false)
    }
  }

  function stopScanning() {
    setScanning(false)
    try {
      readerRef.current?.reset()
    } catch {}
    const video = videoRef.current
    const stream = video && (video.srcObject as MediaStream | null)
    if (stream) {
      stream.getTracks().forEach(t => t.stop())
      if (video) video.srcObject = null
    }
  }

  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value || undefined
    setSelectedDeviceId(newId)
  }

  function captureImage() {
    const video = videoRef.current
    if (!video || !scanning) return

    try {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        setError('Cannot create canvas context')
        return
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageDataUrl = canvas.toDataURL('image/png')
      setCapturedImage(imageDataUrl)
    } catch (e: any) {
      setError(e?.message || String(e))
    }
  }

  function downloadImage() {
    if (!capturedImage) return
    const link = document.createElement('a')
    link.href = capturedImage
    link.download = `capture-${Date.now()}.png`
    link.click()
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      <h1 className="text-xl font-semibold">QR Scanner</h1>

      <div className="flex items-center gap-2">
        <label className="text-sm">Camera:</label>
        <select
          className="border p-1 rounded min-w-48"
          value={selectedDeviceId || ''}
          onChange={handleDeviceChange}
          disabled={!cameras.length}
        >
          {cameras.length === 0 && <option value="">No cameras</option>}
          {cameras.map((cam) => (
            <option key={cam.deviceId} value={cam.deviceId}>
              {cam.label || `Camera ${cam.deviceId.substring(0, 6)}...`}
            </option>
          ))}
        </select>
        <button
          className="px-3 py-1 rounded bg-green-600 text-white disabled:opacity-50"
          onClick={() => startScanning(selectedDeviceId)}
          disabled={scanning || !cameras.length}
        >
          Start
        </button>
        <button
          className="px-3 py-1 rounded bg-gray-700 text-white disabled:opacity-50"
          onClick={stopScanning}
          disabled={!scanning}
        >
          Stop
        </button>
        <button
          className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-50"
          onClick={captureImage}
          disabled={!scanning}
        >
          📷 Capture
        </button>
      </div>

      <div className="w-full max-w-md aspect-video bg-black rounded overflow-hidden">
        <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted playsInline />
      </div>

      {resultText && (
        <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-800">
          <div className="text-sm font-medium">Result</div>
          <div className="break-words text-sm">{resultText}</div>
        </div>
      )}

      {error && (
        <div className="p-3 rounded bg-red-50 border border-red-200 text-red-800">
          <div className="text-sm font-medium">Error</div>
          <div className="break-words text-sm">{error}</div>
        </div>
      )}

      {capturedImage && (
        <div className="p-3 rounded bg-blue-50 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-blue-800">Captured Image</div>
            <div className="flex gap-2">
              <button
                className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
                onClick={downloadImage}
              >
                Download
              </button>
              <button
                className="px-2 py-1 text-xs rounded bg-gray-500 text-white hover:bg-gray-600"
                onClick={() => setCapturedImage('')}
              >
                Clear
              </button>
            </div>
          </div>
          <img src={capturedImage} alt="Captured" className="w-full max-w-md rounded" />
        </div>
      )}
      <p className="text-xs text-gray-500">Uses @zxing/library to decode QR from live camera. Grant camera permission when prompted.</p>
    </div>
  )
}