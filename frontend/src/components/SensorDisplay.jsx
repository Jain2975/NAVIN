/**
 * SensorDisplay — shows live sensor values: orientation, accelerometer, gyroscope.
 */
export default function SensorDisplay({ sensors }) {
  const sensorGroups = [
    {
      title: '🧭 Orientation',
      items: [
        { label: 'Compass', value: sensors.compass, unit: '°', color: 'text-navin-400' },
        { label: 'Tilt F/B', value: sensors.tilt_fb, unit: '°', color: 'text-purple-400' },
        { label: 'Tilt L/R', value: sensors.tilt_lr, unit: '°', color: 'text-cyan-400' },
      ]
    },
    {
      title: '📐 Accelerometer',
      items: [
        { label: 'X', value: sensors.accel_x, unit: 'm/s²', color: 'text-rose-400' },
        { label: 'Y', value: sensors.accel_y, unit: 'm/s²', color: 'text-amber-400' },
        { label: 'Z', value: sensors.accel_z, unit: 'm/s²', color: 'text-emerald-400' },
      ]
    },
    {
      title: '🔄 Gyroscope',
      items: [
        { label: 'Yaw', value: sensors.gyro_alpha, unit: '°/s', color: 'text-sky-400' },
        { label: 'Pitch', value: sensors.gyro_beta, unit: '°/s', color: 'text-orange-400' },
        { label: 'Roll', value: sensors.gyro_gamma, unit: '°/s', color: 'text-pink-400' },
      ]
    },
  ]

  // Detect if turning based on gyro yaw rate
  const isTurning = Math.abs(sensors.gyro_alpha) > 30
  const turnDir = sensors.gyro_alpha > 30 ? '↩️ LEFT' : sensors.gyro_alpha < -30 ? '↪️ RIGHT' : null

  return (
    <div className="glass-card p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-white/80">Sensor Data</h3>
        <div className="flex items-center gap-2">
          {isTurning && (
            <span className="text-xs font-bold text-amber-400 animate-pulse">{turnDir}</span>
          )}
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400 font-medium">LIVE</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {sensorGroups.map(group => (
          <div key={group.title} className="space-y-1.5">
            <p className="text-[10px] text-white/40 font-medium">{group.title}</p>
            {group.items.map(item => (
              <div key={item.label} className="flex justify-between items-center">
                <span className="text-[10px] text-white/50">{item.label}</span>
                <span className={`text-[10px] font-mono font-bold ${item.color}`}>
                  {item.value.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Bottom row */}
      <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-4 gap-2">
        <div className="text-center">
          <p className="text-[10px] text-white/40">Mag</p>
          <p className="text-sm font-bold text-navin-400 font-mono">{sensors.accel_mag.toFixed(1)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-white/40">Steps</p>
          <p className="text-sm font-bold text-emerald-400 font-mono">{sensors.steps}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-white/40">Heading</p>
          <p className="text-sm font-bold text-amber-400 font-mono">{sensors.heading.toFixed(0)}°</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-white/40">Yaw</p>
          <p className={`text-sm font-bold font-mono ${isTurning ? 'text-amber-400' : 'text-white/40'}`}>
            {sensors.gyro_alpha.toFixed(0)}°/s
          </p>
        </div>
      </div>
    </div>
  )
}
