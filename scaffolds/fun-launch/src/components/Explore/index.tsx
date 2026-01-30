import ExploreGrid from './ExploreGrid';
import { DataStreamProvider } from '@/contexts/DataStreamProvider';
import { ExploreMsgHandler } from './ExploreMsgHandler';
import { ExploreProvider } from '@/contexts/ExploreProvider';
import { PropsWithChildren } from 'react';
import { useState, useEffect } from 'react';

const Explore = () => {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <DataStreamProvider> {/* Provider um den gesamten Inhalt */}
      <div className="py-8 bg-black">
        {/* Preisanzeige mittig – kleiner */}
        <div className="text-center mb-8">
          <p className="text-lg font-bold text-cyan-400 mb-1">
            CURRENT $MOGY PRICE
          </p>
          <PriceDisplay />
          <p className="text-xs text-gray-500 mt-1">
            Live price – updates automatically
          </p>
        </div>

        {/* Buy $MOGY Button mittig – kleiner & dezenter */}
        <div className="text-center mb-16">
          <a
            href="https://jup.ag/swap/SOL-njKnom8XKGy4hUqJeT4rABeFWGyTJWWSGTEf7Z1mogy"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-6 py-2.5 rounded-xl text-base font-bold text-white shadow-md transition transform hover:scale-105"
          >
            Buy $MOGY
          </a>
        </div>

        {/* Kleines Suchfeld – responsiv */}
        <div className="flex justify-end mb-6 px-4 md:px-0">
          <div className="relative w-full md:w-80 lg:w-64 xl:w-56">
            <input
              type="text"
              placeholder="Search name, symbol or CA..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.trim())}
              className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition text-sm pl-10 pr-10"
            />
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
              <span className="iconify w-4 h-4 md:w-5 md:h-5 ph--magnifying-glass-bold" />
            </span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white"
              >
                <span className="iconify w-4 h-4 md:w-5 md:h-5 ph--x-bold" />
              </button>
            )}
          </div>
        </div>

        {/* Original Grid */}
        <ExploreGrid className="flex-1" searchQuery={searchQuery} />


        {/* Footer */}
        <div className="flex flex-col items-center mt-12 text-gray-500 text-sm bg-black pt-6 pb-6">
          <a href="https://x.com/mogytoken" target="_blank" rel="noopener noreferrer">
            <img
              src="/x-logo-black.png"
              alt="X Logo"
              className="h-10 w-10 opacity-90 hover:opacity-100 transition bg-transparent mb-3"
            />
          </a>
          <p>©2026 by Mogy.</p>
        </div>
      </div>
    </DataStreamProvider>
  );
};

const PriceDisplay = () => {
  const [mogyPrice, setMogyPrice] = useState<number | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const response = await fetch(
          'https://api.dexscreener.com/latest/dex/tokens/njKnom8XKGy4hUqJeT4rABeFWGyTJWWSGTEf7Z1mogy'
        );
        if (!response.ok) throw new Error('Netzwerkfehler');
        const data = await response.json();
        const pair = data.pairs?.[0];
        if (pair && pair.priceUsd) {
          setMogyPrice(Number(pair.priceUsd));
          setPriceError(null);
        }
      } catch (err) {
        setPriceError('Preisabruf fehlgeschlagen');
      }
    };
    fetchPrice();
    const interval = setInterval(fetchPrice, 10000);
    return () => clearInterval(interval);
  }, []);

  if (priceError) return <span className="text-red-400">{priceError}</span>;
  if (mogyPrice == null) return 'Loading...';
  return `$${mogyPrice.toFixed(8)} (${(mogyPrice / 150).toFixed(8)} SOL)`;
};

export default Explore;
