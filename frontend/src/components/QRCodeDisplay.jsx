import { getQRUrl } from '../services/api'

export default function QRCodeDisplay({ structureId, type = 'entry' }) {
  const url = getQRUrl(structureId, type)
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="p-3 bg-white rounded-xl">
        <img src={url} alt={`${type} QR`} className="w-48 h-48" />
      </div>
      <a
        href={url}
        download={`navin-${type}-qr.png`}
        className="text-navin-400 text-sm underline hover:text-navin-300 transition-colors"
      >
        Download to print
      </a>
    </div>
  )
}
