'use client';

import React from 'react';
import { Shape } from './components/Shape';

export default function Home() {
  return (
    <div className="container">
      <div>
        <h1 className="title">Zig Zag Zog</h1>
        <div className="card-grid">
          {['circle', 'square', 'triangle', 'diamond'].map((shape) => (
            <div key={shape} className="card">
              <Shape type={shape as 'circle' | 'square' | 'triangle' | 'diamond'} />
            </div>
          ))}
        </div>
        <button className="play-button">Play Now</button>
      </div>
    </div>
  );
}
