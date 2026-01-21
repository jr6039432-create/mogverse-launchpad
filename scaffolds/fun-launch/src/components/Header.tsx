import { useUnifiedWalletContext, useWallet } from '@jup-ag/wallet-adapter';
import Link from 'next/link';
import { Button } from './ui/button';
import { useRouter } from 'next/router';
import { useMemo } from 'react';
import { shortenAddress } from '@/lib/utils';

// CreatePoolButton als separater Button
const CreatePoolButton = ({ className }) => {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        router.push('/create-pool');
      }}
      className={className}
    >
      Create Pool
    </button>
  );
};

export const Header = () => {
  const { setShowModal } = useUnifiedWalletContext();
  const { disconnect, publicKey } = useWallet();
  const address = useMemo(() => publicKey?.toBase58(), [publicKey]);

  const handleConnectWallet = () => {
    if (setShowModal) {
      setShowModal(true);
    }

    if (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      window.location.href = 'phantom://v1/connect';
      setTimeout(() => {
        window.location.href = 'solflare://connect';
      }, 800);
      setTimeout(() => {
        if (document.visibilityState === 'visible') {
          window.location.href = 'https://phantom.app/download';
        }
      }, 2000);
    }
  };
return (
  <header className="w-full px-4 py-4 md:px-6 md:py-6 bg-black relative">
    {/* X-Logo ganz oben links */}
    <a href="https://x.com/mogytoken" target="_blank" rel="noopener noreferrer" className="absolute top-4 left-4 md:top-6 md:left-6 z-10">
      <img
        src="/x-logo-black.png"
        alt="X Logo"
        className="h-8 w-8 md:h-10 md:w-10 opacity-90 hover:opacity-100 transition bg-transparent"
      />
    </a>

    {/* Mogy-Logo mittig oben – mehr Abstand auf Mobil */}
    <div className="flex justify-center mt-12 md:mt-0 mb-4">
      <img
        src="https://gateway.pinata.cloud/ipfs/bafybeigq32trxngtqmuakl3wqzbzd4cli3a5vwjjhf4ar4mzs2a4xligmm"
        alt="Mogy Logo"
        className="h-20 w-20 md:h-32 md:w-32 object-contain"
      />
    </div>

    {/* Überschrift mittig unter Mogy-Logo */}
    <div className="text-center mb-4">
      <span className="text-2xl md:text-5xl font-bold text-cyan-400 whitespace-nowrap">
        $Mogy's Mogverse Launchpad
      </span>
    </div>

    {/* CA mittig unter Überschrift – schmaler */}
    <div className="text-center mb-6">
<p className="text-xs text-gray-400 text-center max-w-[100%] mx-auto break-words">
        CA: njKnom8XKGy4hUqJeT4rABeFWGyTJWWSGTEf7Z1mogy
      </p>
    </div>

    {/* Create Pool + Connect Wallet Buttons – rechts oben neben Mogy-Logo */}
    <div className="absolute top-3 right-4 md:top-6 md:right-6 flex gap-2 md:gap-6 z-10">
      <CreatePoolButton 
        className="text-xs md:text-sm px-2.5 md:px-5 py-1 md:py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl shadow-md font-bold transition transform hover:scale-105 min-w-[90px]"
      />

      {publicKey ? (
        <Button
          onClick={() => disconnect()}
          className="text-xs md:text-sm px-2.5 md:px-5 py-1 md:py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-xl shadow-md font-bold transition transform hover:scale-105 min-w-[90px]"
        >
          Disconnect
        </Button>
      ) : (
        <Button
          onClick={handleConnectWallet}
          className="text-xs md:text-sm px-2.5 md:px-5 py-1 md:py-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 rounded-xl shadow-md font-bold transition transform hover:scale-105 min-w-[90px]"
        >
          Connect Wallet
        </Button>
      )}
    </div>
    </header>
  );
};

export default Header;
