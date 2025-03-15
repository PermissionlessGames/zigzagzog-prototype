'use client';

import React, { useState } from 'react';
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
        <button className="play-button">Play Now</button>
      </div>
    </div>
  );
}
