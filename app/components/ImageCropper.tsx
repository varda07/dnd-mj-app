'use client'

import { useState, useRef, ChangeEvent, SyntheticEvent } from 'react'
import ReactCrop, {
  Crop,
  PixelCrop,
  centerCrop,
  makeAspectCrop,
  convertToPixelCrop
} from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

type Props = {
  inputId?: string
  currentImageUrl?: string
  aspect?: number
  onChange: (file: File | null) => void
  label?: string
}

export default function ImageCropper({
  inputId = 'img-file',
  currentImageUrl,
  aspect,
  onChange,
  label
}: Props) {
  const [src, setSrc] = useState('')
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [croppedPreview, setCroppedPreview] = useState('')
  const imgRef = useRef<HTMLImageElement>(null)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setSrc(reader.result as string)
      setCroppedPreview('')
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleImageLoad = (e: SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    const initial = aspect
      ? centerCrop(
          makeAspectCrop({ unit: '%', width: 80 }, aspect, img.width, img.height),
          img.width,
          img.height
        )
      : centerCrop(
          { unit: '%', x: 10, y: 10, width: 80, height: 80 },
          img.width,
          img.height
        )
    setCrop(initial)
    setCompletedCrop(convertToPixelCrop(initial, img.width, img.height))
  }

  const validerCrop = () => {
    if (!imgRef.current || !completedCrop) return
    const img = imgRef.current
    const scaleX = img.naturalWidth / img.width
    const scaleY = img.naturalHeight / img.height
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(completedCrop.width * scaleX)
    canvas.height = Math.round(completedCrop.height * scaleY)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(
      img,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    )
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
    setCroppedPreview(dataUrl)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        onChange(new File([blob], `cropped-${Date.now()}.jpg`, { type: 'image/jpeg' }))
      },
      'image/jpeg',
      0.9
    )
    setSrc('')
  }

  const annulerCrop = () => {
    setSrc('')
    setCrop(undefined)
    setCompletedCrop(undefined)
  }

  const recommencer = () => {
    setCroppedPreview('')
    setCrop(undefined)
    setCompletedCrop(undefined)
    onChange(null)
  }

  return (
    <div>
      {label && <label className="text-gray-400 text-sm block mb-1">{label}</label>}

      {!src && !croppedPreview && (
        <>
          <input
            id={inputId}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-yellow-500 file:text-gray-900 file:font-bold"
          />
          {currentImageUrl && (
            <div className="mt-2">
              <p className="text-gray-400 text-xs mb-1">Image actuelle :</p>
              <img
                src={currentImageUrl}
                alt="actuelle"
                className="max-h-32 rounded bg-gray-900 object-contain"
              />
            </div>
          )}
        </>
      )}

      {src && (
        <div className="mt-2 space-y-2">
          <p className="text-yellow-400 text-xs">
            Ajuste le cadrage en déplaçant / redimensionnant le rectangle, puis valide.
          </p>
          <div className="bg-gray-900 p-2 rounded inline-block max-w-full">
            <ReactCrop
              crop={crop}
              onChange={(_, percent) => setCrop(percent)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspect}
            >
              <img
                ref={imgRef}
                src={src}
                onLoad={handleImageLoad}
                alt="à cadrer"
                className="max-h-[60vh] object-contain"
              />
            </ReactCrop>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={validerCrop}
              disabled={!completedCrop || completedCrop.width === 0}
              className="px-3 py-2 bg-yellow-500 text-gray-900 font-bold rounded text-sm hover:bg-yellow-400 disabled:opacity-50"
            >
              ✓ Valider le cadrage
            </button>
            <button
              type="button"
              onClick={annulerCrop}
              className="px-3 py-2 bg-gray-700 text-white font-bold rounded text-sm hover:bg-gray-600"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {croppedPreview && (
        <div className="mt-2 space-y-2">
          <p className="text-green-400 text-xs">
            ✓ Cadrage validé. Cette portion sera uploadée à la sauvegarde.
          </p>
          <img
            src={croppedPreview}
            alt="preview"
            className="max-h-48 rounded bg-gray-900 object-contain"
          />
          <button
            type="button"
            onClick={recommencer}
            className="text-gray-400 hover:text-white text-xs underline"
          >
            Recommencer (choisir une autre image)
          </button>
        </div>
      )}
    </div>
  )
}
