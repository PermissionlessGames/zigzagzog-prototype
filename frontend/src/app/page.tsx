'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Shape } from './components/Shape';
import { useWeb3 } from '@/contexts/Web3Context';

export default function Home() {
  const [hoveredShape, setHoveredShape] = useState<string | null>(null);
  const { isConnected, isCorrectNetwork } = useWeb3();

  return (
    <div className="container">
      <div>
        <h1 className="title">Zig Zag Zog</h1>
        <div className="card-grid">
          {['circle', 'square', 'triangle', 'diamond'].map((shape) => (
            <div 
              key={shape} 
              className="card"
              onMouseEnter={() => setHoveredShape(shape)}
              onMouseLeave={() => setHoveredShape(null)}
            >
              <Shape 
                type={shape as 'circle' | 'square' | 'triangle' | 'diamond'} 
                isActive={hoveredShape === shape}
              />
            </div>
          ))}
        </div>
        <button 
          className={`blink-button ${!isConnected || !isCorrectNetwork ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={!isConnected || !isCorrectNetwork}
        >
          <Link 
            href={isConnected && isCorrectNetwork ? "/game" : "#"} 
            style={{ color: 'inherit', textDecoration: 'none' }}
            onClick={(e) => {
              if (!isConnected || !isCorrectNetwork) {
                e.preventDefault();
              }
            }}
          >
            {isConnected && isCorrectNetwork ? "Play Now" : "Connect Wallet to Play"}
          </Link>
        </button>
      </div>
    </div>
  );
}
