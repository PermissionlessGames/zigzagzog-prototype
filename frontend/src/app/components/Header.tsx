'use client';

import Link from 'next/link';
import WalletConnect from './WalletConnect';
import { useWeb3 } from '@/contexts/Web3Context';

export default function Header() {
  const { isConnected, isCorrectNetwork } = useWeb3();

  return (
    <header>
      <div>
        <Link href="/">
          <strong>ZigZagZog</strong>
        </Link>
        <nav style={{ display: 'inline-block', marginLeft: '1rem' }}>
          <Link 
            href={isConnected && isCorrectNetwork ? "/" : "#"} 
            style={{ 
              opacity: !isConnected || !isCorrectNetwork ? 0.5 : 1,
              cursor: !isConnected || !isCorrectNetwork ? 'not-allowed' : 'pointer'
            }}
            onClick={(e) => {
              if (!isConnected || !isCorrectNetwork) {
                e.preventDefault();
              }
            }}
          >
            Play
          </Link>
        </nav>
      </div>
      <div>
        {isConnected && (
          <span className={`status ${isCorrectNetwork ? 'status-connected' : 'status-error'}`}>
            {isCorrectNetwork ? 'Connected' : 'Wrong Network'}
          </span>
        )}
        <WalletConnect />
      </div>
    </header>
  );
}