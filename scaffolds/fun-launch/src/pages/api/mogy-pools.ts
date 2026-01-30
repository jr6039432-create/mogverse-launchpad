import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = "f2c31c882b194e5fbcf05d6b7d5d1a96";
  const url = "https://public-api.birdeye.so";

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-API-KEY": apiKey,
        "x-chain": "solana",
        "Accept": "application/json",
        // Diese Header simulieren einen echten Browser-Besuch:
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Origin": "https://birdeye.so",
        "Referer": "https://birdeye.so"
      }
    });

    // Wir prüfen erst den Text, um HTML-Fehler abzufangen
    const responseText = await response.text();
    
    if (responseText.startsWith("<!DOCTYPE")) {
      console.error("❌ Birdeye blockiert uns noch mit HTML (Cloudflare).");
      return res.status(403).json({ success: false, message: "Cloudflare Block" });
    }

    const data = JSON.parse(responseText);
    return res.status(200).json(data);
    
  } catch (error: any) {
    console.error("🔥 Proxy Absturz:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}
