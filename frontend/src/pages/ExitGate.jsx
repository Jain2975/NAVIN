import { useNavigate } from 'react-router-dom'

export default function ExitGate() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center p-6">
      <div className="max-w-md w-full animate-fade-in">
        <div className="glass-card p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-navin-500 to-cyan-500 flex items-center justify-center glow-blue">
            <span className="text-4xl">✅</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Session Complete</h1>
          <p className="text-white/50 text-sm mb-6">Thank you for using NAVIN. Drive safely!</p>
          <button onClick={() => navigate('/')} className="w-full btn-primary text-sm">
            Start New Session
          </button>
        </div>
      </div>
    </div>
  )
}
