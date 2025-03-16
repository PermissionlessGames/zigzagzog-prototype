'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Shape } from './components/Shape';

export default function Home() {
  const [hoveredShape, setHoveredShape] = useState<string | null>(null);

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
        <button className="blink-button">
          <Link href="/game" style={{ color: 'inherit', textDecoration: 'none' }}>
            Play Now
          </Link>
        </button>
      </div>
    </div>
  );
}
