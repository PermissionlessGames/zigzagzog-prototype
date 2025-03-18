'use client';

import Link from 'next/link';
import WalletConnect from './WalletConnect';
import { useWeb3 } from '@/contexts/Web3Context';

export default function Header() {
  const { isConnected, isCorrectNetwork } = useWeb3();

  return (
    <header className="fixed top-0 left-0 right-0 bg-gray-900 text-white shadow-md px-4 py-3 flex justify-between items-center z-10">
      <div className="flex items-center">
        <Link href="/" className="text-xl font-bold mr-6 hover:text-blue-400 transition-colors">
          ZigZagZog
        </Link>
        <nav className="hidden sm:flex space-x-4">
          <Link href="/" className="hover:text-blue-400 transition-colors">
            Home
          </Link>
          <Link 
            href={isConnected && isCorrectNetwork ? "/game" : "#"} 
            className={`hover:text-blue-400 transition-colors ${!isConnected || !isCorrectNetwork ? 'opacity-50 cursor-not-allowed' : ''}`}
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
      <div className="flex items-center">
        <div className="mr-2">
          {isConnected && (
            <div className={`px-2 py-1 rounded-md text-xs ${isCorrectNetwork ? 'bg-green-800' : 'bg-red-800'}`}>
              {isCorrectNetwork ? 'Connected' : 'Wrong Network'}
            </div>
          )}
        </div>
        <WalletConnect />
      </div>
    </header>
  );
}