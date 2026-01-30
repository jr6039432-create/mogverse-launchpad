import React from 'react';
import { Pool, TokenListTimeframe } from '../Explore/types';
import { cn } from '@/lib/utils';
import { Skeleton } from '../ui/Skeleton';
import { Copyable } from '../ui/Copyable';
import CopyIconSVG from '@/icons/CopyIconSVG';
import { TokenAge } from '../TokenAge';
import { TokenSocials } from '../TokenSocials';
import { TokenCardMcapMetric, TokenCardVolumeMetric } from './TokenCardMetric';
import Link from 'next/link';

type TokenCardProps = {
  pool: Pool;
  timeframe: TokenListTimeframe;
  rowRef: (element: HTMLElement | null, poolId: string) => void;
};

export const TokenCard: React.FC<TokenCardProps> = ({ pool, timeframe, rowRef }) => {
  // Fix: Backticks für dynamischen Key
  const stats = (pool.baseAsset as any)?.[`stats${timeframe}`] || {
    buyVolume: 0,
    sellVolume: 0,
    mcap: 0,
  };

  const baseAsset = pool.baseAsset || {
    id: '',
    name: 'Unknown Token',
    symbol: '???',
    logo: 'https://pub-0891aa35b71548069b2a4ffad83a65f1.r2.dev/default-token-logo.png',
    mcap: 0,
  };

  return (
    <div
      ref={(el) => rowRef(el, pool.id)}
      data-pool-id={pool.id}
      className="relative flex cursor-pointer items-center border-neutral-850 py-3 pl-1.5 pr-2 text-xs has-hover:hover:bg-neutral-900 [&:nth-child(n+2)]:border-t"
    >
      <div className="shrink-0 pl-2 pr-4">
<img
  src={pool.baseAsset?.logo || 'https://pub-0891aa35b71548069b2a4ffad83a65f1.r2.dev/default-token-logo.png'} // Fallback
  alt={pool.baseAsset?.name || 'Token'}
  className="w-16 h-16 rounded-full mx-auto mb-4"
  onError={(e) => {
    e.currentTarget.src = 'https://pub-0891aa35b71548069b2a4ffad83a65f1.r2.dev/default-token-logo.png'; // Error-Fallback
  }}
/>
      </div>

      <div className="flex w-full flex-col gap-1 overflow-hidden">
        <div className="flex w-full items-center justify-between">
          <div className="overflow-hidden">
            <div className="flex items-center gap-0.5 xl:gap-1">
              <div className="whitespace-nowrap text-sm font-semibold" title={baseAsset.symbol || 'Unknown'}>
                {baseAsset.symbol || 'Unknown'}
              </div>

              {/* Badge Check: Prüft nun auch auf deine Quote Mint */}
              {(baseAsset.id === 'njKnom8XKGy4hUqJeT4rABeFWGyTJWWSGTEf7Z1mogy' || (pool as any).quoteAsset?.id === 'DGN4xXbN7vBMZ2w2Qboznf5FPBrWuqPYzCU7D1Cs5idv') && (
                <span className="badge bg-cyan-500 text-black px-2 py-1 rounded text-[10px] font-bold ml-2 shrink-0">
                  Mogy Launchpad
                </span>
              )}

              <div className="ml-1 flex items-center gap-1 overflow-hidden z-10">
                <Copyable
                  name="Address"
                  copyText={baseAsset.id || pool.id}
                  className="z-[1] flex min-w-0 items-center gap-0.5 text-[0.625rem] leading-none text-neutral-500 duration-500 hover:text-neutral-200 data-[copied=true]:text-green-400"
                >
                  {(copied) => (
                    <>
                      <div className="truncate text-xs" title={baseAsset.name || 'Unknown'}>
                        {baseAsset.name || 'Unknown'}
                      </div>
                      {copied ? (
                        <div className="iconify h-3 w-3 shrink-0 text-primary ph--check-bold" />
                      ) : (
                        <CopyIconSVG className="h-3 w-3 shrink-0" width={12} height={12} />
                      )}
                    </>
                  )}
                </Copyable>
              </div>
            </div>
          </div>
        </div>

        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-1.5">
            <TokenAge className="opacity-80" date={pool.createdAt} />
            <TokenSocials className="z-[1]" token={baseAsset as any} />
          </div>
          <div className="flex items-center gap-2.5">
            <TokenCardVolumeMetric 
              buyVolume={stats.buyVolume || 0}sellVolume={stats.sellVolume || 0} 
            />
            <TokenCardMcapMetric mcap={baseAsset.mcap || 0} />
          </div>
        </div>
      </div>

      <Link
        className="absolute inset-0 cursor-pointer rounded-lg"
        href={`/token/${baseAsset.id || pool.id}`}
      />
    </div>
  );
};

type TokenCardSkeletonProps = React.ComponentPropsWithoutRef<'div'>;

export const TokenCardSkeleton: React.FC<TokenCardSkeletonProps> = ({ className, ...props }) => (
  <div className={cn('border-b border-neutral-925 py-3 pl-1.5 pr-2 text-xs', className)} {...props}>
    <div className="flex items-center">
      <div className="shrink-0 pl-2 pr-4">
        <Skeleton className="h-14 w-14 rounded-full" />
      </div>
      <div className="flex w-full flex-col gap-2 overflow-hidden">
        <div className="flex w-full items-center justify-between gap-1">
          <div className="flex flex-col gap-1 overflow-hidden">
            <div className="flex items-center gap-1">
              <Skeleton className="h-5 w-16" />
            </div>
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="shrink-0">
            <Skeleton className="h-6 w-6 rounded-full lg:w-12" />
          </div>
        </div>
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-3 w-10" />
          </div>
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-5 w-10" />
            <Skeleton className="h-5 w-10" />
          </div>
        </div>
      </div>
    </div>
  </div>
);
