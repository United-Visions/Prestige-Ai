import React from 'react';
import { Crown } from 'lucide-react';

const FinalTerminalP = () => {
  
  const StaticEffect = () => (
    <div className="absolute inset-0 pointer-events-none opacity-20">
      <div 
        className="w-full h-full" 
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='1' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.4'/%3E%3C/svg%3E")`,
          backgroundSize: "20px 20px"
        }}
      />
    </div>
  );

  const GoldCrown = () => (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
      <div className="relative">
        <Crown 
          size={32} 
          className="text-yellow-300" 
          fill="url(#goldGradient)" 
          style={{
            filter: 'drop-shadow(0 0 4px rgba(255, 215, 0, 0.6))'
          }}
        />
        <Crown 
          size={32} 
          className="absolute top-0 left-0 text-yellow-600" 
          strokeWidth={2}
        />
      </div>
      <svg width="0" height="0">
        <defs>
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{stopColor:'#FFD700', stopOpacity:1}} />
            <stop offset="50%" style={{stopColor:'#FFA500', stopOpacity:1}} />
            <stop offset="100%" style={{stopColor:'#DAA520', stopOpacity:1}} />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
      <div className="w-32 h-32 bg-gradient-to-br from-purple-950 to-black rounded-3xl flex items-center justify-center relative shadow-2xl overflow-hidden border border-purple-900/30">
        <StaticEffect />
        
        {/* Main P */}
        <div className="text-white font-sans font-black text-7xl mt-4">P</div>
        
        {/* Gold Crown */}
        <GoldCrown />
        
        {/* XML Tag - Top Left */}
        <div className="absolute top-2 left-2 text-green-400 font-mono text-sm font-bold">&lt;/&gt;</div>
        
        {/* Animated Dots - Bottom Right */}
        <div className="absolute bottom-3 right-3 flex space-x-1">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
        </div>
      </div>
    </div>
  );
};

export default FinalTerminalP;