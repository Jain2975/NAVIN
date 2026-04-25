/**
 * OccupancyGrid — visual grid of parking bays.
 * Green = free, Red = occupied, Yellow = uncertain.
 * 
 * Props:
 *   bays: [{id, bay_number, floor, status, bay_type}]
 *   selectedFloor: number
 *   onBayClick: (bay) => void
 */
export default function OccupancyGrid({ bays = [], selectedFloor = 0, onBayClick }) {
  const floorBays = bays.filter(b => b.floor === selectedFloor)
  const floors = [...new Set(bays.map(b => b.floor))].sort()

  const statusConfig = {
    free: {
      bg: 'bg-emerald-500/20',
      border: 'border-emerald-500/40',
      text: 'text-emerald-400',
      glow: 'hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]',
      dot: 'bg-emerald-400',
    },
    occupied: {
      bg: 'bg-red-500/20',
      border: 'border-red-500/40',
      text: 'text-red-400',
      glow: '',
      dot: 'bg-red-400',
    },
    uncertain: {
      bg: 'bg-amber-500/20',
      border: 'border-amber-500/40',
      text: 'text-amber-400',
      glow: '',
      dot: 'bg-amber-400',
    },
  }

  return (
    <div className="glass-card p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white/80">Parking Bays</h3>
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Free
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-400" /> Taken
          </span>
        </div>
      </div>

      {/* Floor selector */}
      {floors.length > 1 && (
        <div className="flex gap-2 mb-3">
          {floors.map(f => (
            <button
              key={f}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all
                ${f === selectedFloor
                  ? 'bg-navin-600 text-white'
                  : 'bg-white/5 text-white/50 hover:bg-white/10'
                }`}
            >
              Floor {f + 1}
            </button>
          ))}
        </div>
      )}

      {/* Bay grid */}
      <div className="grid grid-cols-5 gap-2">
        {floorBays.map(bay => {
          const config = statusConfig[bay.status] || statusConfig.uncertain
          return (
            <button
              key={bay.id}
              onClick={() => bay.status === 'free' && onBayClick?.(bay)}
              disabled={bay.status !== 'free'}
              className={`relative p-2 rounded-lg border transition-all duration-300
                ${config.bg} ${config.border} ${config.glow}
                ${bay.status === 'free' ? 'cursor-pointer hover:scale-105' : 'cursor-default opacity-80'}
              `}
            >
              <div className={`text-xs font-bold ${config.text}`}>
                {bay.bay_number}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                <span className="text-[10px] text-white/30">
                  {bay.bay_type === 'ev' ? '⚡' : ''}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {floorBays.length === 0 && (
        <p className="text-center text-white/30 text-sm py-6">No bays on this floor</p>
      )}
    </div>
  )
}
