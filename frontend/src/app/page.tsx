'use client';

import React from 'react';
import Link from 'next/link';
import { useWeb3 } from '@/contexts/Web3Context';

export default function Home() {
  const { isConnected, isCorrectNetwork } = useWeb3();

  return (
    <div className="container">
      <div style={{ textAlign: 'center' }}>
        <h1>Welcome to Zig Zag Zog</h1>
        <p>A simple blockchain game of shapes and strategy.</p>
        
        <div className="grid" style={{ maxWidth: '600px', margin: '2rem auto' }}>
          {['▲', '■', '●', '◆'].map((shape) => (
            <div key={shape} className="card" style={{ textAlign: 'center', fontSize: '2rem' }}>
              {shape}
            </div>
          ))}
        </div>
        
        <div style={{ margin: '2rem 0' }}>
          {!isConnected ? (
            <p>Please connect your wallet to play the game.</p>
          ) : !isCorrectNetwork ? (
            <p>Please switch to the correct network to play.</p>
          ) : (
            <Link 
              href="/game" 
              className="button"
              style={{ fontSize: '1.2rem', padding: '0.5rem 1.5rem' }}
            >
              Play Now
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
