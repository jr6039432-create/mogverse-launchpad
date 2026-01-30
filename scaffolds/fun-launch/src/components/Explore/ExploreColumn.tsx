'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react'; // <-- Hier der Fix
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { categorySortBy, categorySortDir, createPoolSorter } from '@/components/Explore/pool-utils';
import { ApeQueries, GemsTokenListQueryArgs, QueryData } from '@/components/Explore/queries';
import { ExploreTab, TokenListSortByField, normalizeSortByField } from '@/components/Explore/types';
import { TokenCardList } from '@/components/TokenCard/TokenCardList';
import { useExploreGemsTokenList } from '@/hooks/useExploreGemsTokenList';
import { EXPLORE_FIXED_TIMEFRAME, useExplore } from '@/contexts/ExploreProvider';
import { Pool } from '@/contexts/types';
import { isHoverableDevice, useBreakpoint } from '@/lib/device';
import { PausedIndicator } from './PausedIndicator';
import { useMogyPools } from '@/hooks/useMogyPools'; // Dein Hook für die eigenen Token

type ExploreColumnProps = {
  tab: ExploreTab;
  searchQuery?: string;
};

export const ExploreTabTitleMap: Record<ExploreTab, string> = {
  [ExploreTab.NEW]: 'New',
  [ExploreTab.GRADUATING]: 'Soon',
  [ExploreTab.GRADUATED]: 'Bonded',
};

export const ExploreColumn: React.FC<ExploreColumnProps> = ({ tab, searchQuery = '' }) => {
  const { pausedTabs, setTabPaused, request } = useExplore();
  const isPaused = pausedTabs[tab];

  const setIsPaused = useCallback(
    (paused: boolean) => setTabPaused(tab, paused),
    [setTabPaused, tab]
  );

  return (
    <div className="flex flex-col h-full lg:h-[calc(100vh-300px)]">
      {/* Desktop Column Header */}
      <div className="flex items-center justify-between p-3 max-lg:hidden">
        <div className="flex items-center gap-x-2">
          <h2 className="font-bold text-neutral-300">{ExploreTabTitleMap[tab]}</h2>
          {isPaused && <PausedIndicator />}
        </div>
      </div>
      {/* List */}
      <div className="relative flex-1 border-neutral-850 text-xs lg:border-t h-full">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-2 bg-gradient-to-b from-neutral-950 to-transparent" />
        <TokenCardListContainer
          tab={tab}
          request={request}
          isPaused={isPaused}
          setIsPaused={setIsPaused}
          searchQuery={searchQuery}
        />
      </div>
    </div>
  );
};

type TokenCardListContainerProps = {
  tab: ExploreTab;
  request: Required<GemsTokenListQueryArgs>;
  isPaused: boolean;
  setIsPaused: (isPaused: boolean) => void;
  searchQuery?: string;
};

const timeframe = EXPLORE_FIXED_TIMEFRAME;

const TokenCardListContainer: React.FC<TokenCardListContainerProps> = memo(
  ({ tab, request, isPaused, setIsPaused, searchQuery = '' }) => {
    const queryClient = useQueryClient();
    const breakpoint = useBreakpoint();
    const isMobile = breakpoint === 'md' || breakpoint === 'sm' || breakpoint === 'xs';
    const listRef = useRef<HTMLDivElement>(null);

    // 1. Deine Mogy-Pools von Jupiter laden (nur Quote njKnom...)
    const { pools: mogyPools, loading: mogyLoading, error: mogyError } = useMogyPools();

    const [snapshotData, setSnapshotData] = useState<any[]>([]);

    // Kombinierter Status (verhindert Blinken)
    const combinedStatus = useMemo(() => {
      if (!mogyLoading && mogyPools.length > 0) return 'success';
      return 'loading';
    }, [mogyLoading, mogyPools.length]);

    // Zusammenführen und Filtern der Daten
    const displayData = useMemo(() => {
      let filtered = [...mogyPools];

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(pool =>
          pool.baseAsset?.name?.toLowerCase().includes(q) ||
          pool.baseAsset?.symbol?.toLowerCase().includes(q) ||
          pool.baseAsset?.id?.toLowerCase().includes(q)
        );
      }

      return filtered;
    }, [mogyPools, searchQuery]);

    const handleMouseEnter = useCallback(() => {
      if (!isHoverableDevice() || combinedStatus !== 'success') return;
      if (!isPaused) setSnapshotData(displayData);
      setIsPaused(true);
    }, [displayData, isPaused, setIsPaused, combinedStatus]);

    const handleMouseLeave = useCallback(() => {
      if (!isHoverableDevice()) return;
      setIsPaused(false);
    }, [setIsPaused]);

    const handleScroll = useCallback(() => {
      if (!isMobile || !listRef.current) return;
      const top = listRef.current.getBoundingClientRect().top;
      if (top <= 0) {
        if (!isPaused) setSnapshotData(displayData);
        setIsPaused(true);
      } else {
        setIsPaused(false);
      }
    }, [displayData, isPaused, setIsPaused, isMobile]);

    useEffect(() => {
      if (!isMobile) return;
      handleScroll();
      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        window.removeEventListener('scroll', handleScroll);
        setIsPaused(false);
      };
    }, [isMobile, setIsPaused, handleScroll]);

    if (mogyLoading) return <div className="text-center text-gray-400">Loading Mogy Pools from Jupiter...</div>;
    if (mogyError) return <div className="text-center text-red-400">{mogyError}</div>;
    if (displayData.length === 0) return <div className="text-center text-gray-400">No tokens with MOGY quote yet.</div>;

    return (
      <TokenCardList
        ref={listRef}
        data={displayData}
        status={combinedStatus}
        timeframe={timeframe}
        trackPools
        className="lg:h-0 lg:min-h-full"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />
    );
  }
);

TokenCardListContainer.displayName = 'TokenCardListContainer';
