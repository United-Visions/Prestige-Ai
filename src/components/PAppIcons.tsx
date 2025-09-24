import React from 'react';

// Modern Gradient P Icon
export const PIcon01 = ({ size = 64 }: { size?: number }) => (
  <div 
    className="relative flex items-center justify-center rounded-2xl shadow-2xl"
    style={{
      width: size,
      height: size,
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }}
  >
    <div 
      className="font-bold text-white"
      style={{ 
        fontSize: size * 0.6,
        fontFamily: 'Inter, system-ui, sans-serif',
        textShadow: '0 2px 4px rgba(0,0,0,0.3)'
      }}
    >
      P
    </div>
  </div>
);

// Tech/AI Themed P Icon
export const PIcon02 = ({ size = 64 }: { size?: number }) => (
  <div 
    className="relative flex items-center justify-center rounded-2xl shadow-2xl overflow-hidden"
    style={{
      width: size,
      height: size,
      background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #2d2d5f 100%)',
    }}
  >
    <div className="absolute inset-0 opacity-20">
      <div className="absolute top-2 left-2 w-1 h-1 bg-cyan-400 rounded-full animate-pulse"></div>
      <div className="absolute top-4 right-3 w-1 h-1 bg-purple-400 rounded-full animate-pulse delay-100"></div>
      <div className="absolute bottom-3 left-3 w-1 h-1 bg-blue-400 rounded-full animate-pulse delay-200"></div>
      <div className="absolute bottom-2 right-2 w-1 h-1 bg-indigo-400 rounded-full animate-pulse delay-300"></div>
    </div>
    <div 
      className="font-bold text-transparent bg-clip-text relative z-10"
      style={{ 
        fontSize: size * 0.6,
        fontFamily: 'JetBrains Mono, monospace',
        backgroundImage: 'linear-gradient(135deg, #00f5ff 0%, #a855f7 100%)',
        filter: 'drop-shadow(0 0 8px rgba(168, 85, 247, 0.3))'
      }}
    >
      P
    </div>
  </div>
);

// Prestige Gold/Luxury P Icon
export const PIcon03 = ({ size = 64 }: { size?: number }) => (
  <div 
    className="relative flex items-center justify-center rounded-2xl shadow-2xl"
    style={{
      width: size,
      height: size,
      background: 'linear-gradient(135deg, #f7931e 0%, #ffd700 50%, #ffed4a 100%)',
      boxShadow: '0 8px 32px rgba(247, 147, 30, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
    }}
  >
    <div 
      className="font-bold"
      style={{ 
        fontSize: size * 0.6,
        fontFamily: 'Playfair Display, serif',
        color: '#8b4513',
        textShadow: '0 1px 2px rgba(255, 255, 255, 0.3), 0 2px 4px rgba(139, 69, 19, 0.2)'
      }}
    >
      P
    </div>
  </div>
);

// Neon Cyberpunk P Icon
export const PIcon04 = ({ size = 64 }: { size?: number }) => (
  <div 
    className="relative flex items-center justify-center rounded-2xl shadow-2xl overflow-hidden"
    style={{
      width: size,
      height: size,
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a1a 100%)',
      border: '1px solid #ff0080'
    }}
  >
    <div 
      className="absolute inset-0 opacity-30"
      style={{
        background: 'repeating-linear-gradient(90deg, transparent, transparent 2px, #ff0080 2px, #ff0080 4px)',
        animation: 'slide 2s linear infinite'
      }}
    ></div>
    <div 
      className="font-bold relative z-10"
      style={{ 
        fontSize: size * 0.6,
        fontFamily: 'Orbitron, monospace',
        color: '#00ffff',
        textShadow: '0 0 10px #00ffff, 0 0 20px #00ffff, 0 0 30px #00ffff'
      }}
    >
      P
    </div>
    <style jsx>{`
      @keyframes slide {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
    `}</style>
  </div>
);

// Minimalist P Icon
export const PIcon05 = ({ size = 64 }: { size?: number }) => (
  <div 
    className="relative flex items-center justify-center rounded-3xl shadow-lg"
    style={{
      width: size,
      height: size,
      background: '#ffffff',
      border: '1px solid #e5e7eb'
    }}
  >
    <div 
      className="font-black"
      style={{ 
        fontSize: size * 0.6,
        fontFamily: 'Inter, system-ui, sans-serif',
        color: '#1f2937'
      }}
    >
      P
    </div>
  </div>
);

// Glass Morphism P Icon
export const PIcon06 = ({ size = 64 }: { size?: number }) => (
  <div 
    className="relative flex items-center justify-center rounded-2xl shadow-2xl overflow-hidden"
    style={{
      width: size,
      height: size,
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
    }}
  >
    <div 
      className="absolute inset-0"
      style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)'
      }}
    ></div>
    <div 
      className="font-bold text-white relative z-10"
      style={{ 
        fontSize: size * 0.6,
        fontFamily: 'Inter, system-ui, sans-serif',
        textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
      }}
    >
      P
    </div>
  </div>
);

// Retro 80s P Icon
export const PIcon07 = ({ size = 64 }: { size?: number }) => (
  <div 
    className="relative flex items-center justify-center rounded-xl shadow-2xl"
    style={{
      width: size,
      height: size,
      background: 'linear-gradient(135deg, #ff006e 0%, #8338ec 50%, #3a86ff 100%)',
    }}
  >
    <div 
      className="absolute inset-2 rounded-lg border-2 border-white opacity-50"
    ></div>
    <div 
      className="font-bold text-white relative z-10"
      style={{ 
        fontSize: size * 0.6,
        fontFamily: 'Courier New, monospace',
        textShadow: '2px 2px 0px #000000, -1px -1px 0px #ffffff'
      }}
    >
      P
    </div>
  </div>
);

// Dark Mode Premium P Icon
export const PIcon08 = ({ size = 64 }: { size?: number }) => (
  <div 
    className="relative flex items-center justify-center rounded-2xl shadow-2xl"
    style={{
      width: size,
      height: size,
      background: 'linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%)',
      border: '1px solid #404040'
    }}
  >
    <div 
      className="font-bold"
      style={{ 
        fontSize: size * 0.6,
        fontFamily: 'SF Pro Display, system-ui, sans-serif',
        background: 'linear-gradient(135deg, #ffffff 0%, #a1a1aa 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)'
      }}
    >
      P
    </div>
  </div>
);

// Holographic P Icon
export const PIcon09 = ({ size = 64 }: { size?: number }) => (
  <div 
    className="relative flex items-center justify-center rounded-2xl shadow-2xl overflow-hidden"
    style={{
      width: size,
      height: size,
      background: 'linear-gradient(45deg, #ff0080, #00ffff, #ff0080, #00ffff)',
      backgroundSize: '400% 400%',
      animation: 'hologram 3s ease-in-out infinite'
    }}
  >
    <div 
      className="absolute inset-0.5 rounded-2xl flex items-center justify-center"
      style={{ background: '#000000' }}
    >
      <div 
        className="font-bold"
        style={{ 
          fontSize: size * 0.6,
          fontFamily: 'Futura, sans-serif',
          background: 'linear-gradient(45deg, #ff0080, #00ffff, #ff0080)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 0 10px rgba(255, 0, 128, 0.5))'
        }}
      >
        P
      </div>
    </div>
    <style jsx>{`
      @keyframes hologram {
        0%, 100% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
      }
    `}</style>
  </div>
);

// Neural Network P Icon
export const PIcon10 = ({ size = 64 }: { size?: number }) => (
  <div 
    className="relative flex items-center justify-center rounded-2xl shadow-2xl overflow-hidden"
    style={{
      width: size,
      height: size,
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    }}
  >
    {/* Neural network dots */}
    <div className="absolute inset-0">
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-blue-400 rounded-full opacity-60"
          style={{
            top: `${20 + (i * 8)}%`,
            left: `${10 + (i % 3) * 30}%`,
            animation: `pulse ${1 + (i * 0.2)}s ease-in-out infinite alternate`
          }}
        />
      ))}
    </div>
    
    {/* Connection lines */}
    <svg className="absolute inset-0 w-full h-full opacity-30">
      <line x1="20%" y1="30%" x2="50%" y2="50%" stroke="#3b82f6" strokeWidth="1"/>
      <line x1="80%" y1="30%" x2="50%" y2="50%" stroke="#3b82f6" strokeWidth="1"/>
      <line x1="20%" y1="70%" x2="50%" y2="50%" stroke="#3b82f6" strokeWidth="1"/>
      <line x1="80%" y1="70%" x2="50%" y2="50%" stroke="#3b82f6" strokeWidth="1"/>
    </svg>
    
    <div 
      className="font-bold relative z-10"
      style={{ 
        fontSize: size * 0.6,
        fontFamily: 'JetBrains Mono, monospace',
        background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        filter: 'drop-shadow(0 0 8px rgba(96, 165, 250, 0.3))'
      }}
    >
      P
    </div>
  </div>
);

// Demo component to show all icons
export const PIconShowcase = () => (
  <div className="grid grid-cols-5 gap-4 p-8 bg-gray-100 min-h-screen">
    <div className="flex flex-col items-center gap-2">
      <PIcon01 size={80} />
      <span className="text-xs text-gray-600">Gradient</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <PIcon02 size={80} />
      <span className="text-xs text-gray-600">AI Tech</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <PIcon03 size={80} />
      <span className="text-xs text-gray-600">Prestige Gold</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <PIcon04 size={80} />
      <span className="text-xs text-gray-600">Cyberpunk</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <PIcon05 size={80} />
      <span className="text-xs text-gray-600">Minimalist</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <PIcon06 size={80} />
      <span className="text-xs text-gray-600">Glass</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <PIcon07 size={80} />
      <span className="text-xs text-gray-600">Retro 80s</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <PIcon08 size={80} />
      <span className="text-xs text-gray-600">Dark Premium</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <PIcon09 size={80} />
      <span className="text-xs text-gray-600">Holographic</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <PIcon10 size={80} />
      <span className="text-xs text-gray-600">Neural Network</span>
    </div>
  </div>
);