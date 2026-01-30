import { useState, useEffect, useRef } from 'react';

export const useMogyPools = () => {
  const [pools, setPools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const isFetching = useRef(false);

  useEffect(() => {
    // Verhindert doppelte Abfragen
    if (isFetching.current) return;

    const fetchFromProxy = async () => {
      isFetching.current = true;
      try {
        const response = await fetch('/api/mogy-pools');
        const json = await response.json();

        // Flexiblere Prüfung der Datenstruktur (falls Birdeye das Format leicht ändert)
        // KORREKTUR im Hook:
     const items = (json && json.data && json.data.items) || (json && json.items) || [];

        if (items.length > 0) {
          const mapped = items.map((item: any) => ({
            id: item.address || item.base_address,
            createdAt: (item.list_time * 1000) || Date.now(),
            baseAsset: {
              id: item.base_address,
              name: item.base_name || "Mogy Token",
              symbol: item.base_symbol || "MOGY",
              logo: item.base_logo_url || "https://pub-0891aa35b71548069b2a4ffad83a65f1.r2.dev",
              mcap: 0
            },
            quoteAsset: { id: "njKnom8XKGy4hUqJeT4rABeFWGyTJWWSGTEf7Z1mogy" },
            stats1h: {
              buyVolume: item.v1hVolume || 0,
              sellVolume: 0,
              mcap: item.liquidity || 0
            }
          }));
          
          console.log("✅ Hook hat " + mapped.length + " Pools verarbeitet");
          setPools(mapped);
        } else {
          console.log("📭 Proxy lieferte keine Items (Liste leer)");
        }
      } catch (e) {
        console.error("❌ Fehler über Proxy:", e);
      } finally {
        setLoading(false);
        isFetching.current = false;
      }
    };

    fetchFromProxy();
  }, []); // Leeres Array bedeutet: Nur einmal beim Laden ausführen

  return { pools, loading };
};
