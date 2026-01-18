export default async function handler(req, res) {
  try {
    const OWNER = process.env.GITHUB_OWNER;
    const REPO = process.env.GITHUB_REPO;
    const BRANCH = process.env.GITHUB_BRANCH || "main";
    const FILE_PATH = process.env.GITHUB_FILE_PATH || "data/nfts.json";
    const TOKEN = process.env.GITHUB_TOKEN;

    if (!OWNER || !REPO || !TOKEN) {
      return res.status(500).json({
        ok: false,
        error: "Missing env vars: GITHUB_OWNER / GITHUB_REPO / GITHUB_TOKEN"
      });
    }

    const ghBase = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(FILE_PATH)}`;

    // 1) Read current file from GitHub
    const readResp = await fetch(`${ghBase}?ref=${encodeURIComponent(BRANCH)}`, {
      headers: {
        "Authorization": `Bearer ${TOKEN}`,
        "Accept": "application/vnd.github+json",
        "User-Agent": "latch-vercel-api"
      }
    });

    if (!readResp.ok) {
      const text = await readResp.text();
      return res.status(500).json({ ok: false, error: "GitHub read failed", details: text });
    }

    const readJson = await readResp.json();
    const sha = readJson.sha;
    const contentBase64 = readJson.content || "";
    const decoded = Buffer.from(contentBase64, "base64").toString("utf8");
    let db;
    try {
      db = JSON.parse(decoded);
    } catch {
      db = { version: 1, updatedAt: new Date().toISOString(), items: [] };
    }
    if (!db.items) db.items = [];

    // GET: return items
    if (req.method === "GET") {
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({ ok: true, ...db });
    }

    // POST: add new item
    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

      // Minimal validation
      const required = ["name", "img", "bg", "pattern", "model"];
      for (const k of required) {
        if (!body?.[k]) return res.status(400).json({ ok: false, error: `Missing field: ${k}` });
      }

      const now = new Date().toISOString();
      const id = body.id || `u_${Math.random().toString(16).slice(2)}_${Date.now()}`;
      const num = body.num || ("#" + String(Math.floor(100000 + Math.random() * 900000)));

      const item = {
        id,
        name: String(body.name).slice(0, 40),
        num,
        img: body.img,              // dataURL (MVP)
        bg: body.bg,
        pattern: body.pattern,
        model: body.model,
        rarityModel: Number(body.rarityModel ?? 3.0),
        rarityPattern: Number(body.rarityPattern ?? 0.7),
        rarityBg: Number(body.rarityBg ?? 1.2),
        supplyNow: Number(body.supplyNow ?? 1),
        supplyMax: Number(body.supplyMax ?? 1000),
        estRub: Number(body.estRub ?? 999),
        marketStatus: "Не выставлен",
        priceTon: Number(body.priceTon ?? 1.0),
        interest: String(body.interest ?? "Средний"),
        liquidity: String(body.liquidity ?? "Средний"),
        sharesTotal: Number(body.sharesTotal ?? 1000),
        sharesSold: Number(body.sharesSold ?? 0),
        sharePriceTon: Number(body.sharePriceTon ?? 0.001),
        auctionActive: Boolean(body.auctionActive ?? false),
        auctionTopBidTon: Number(body.auctionTopBidTon ?? 0),
        auctionEnds: String(body.auctionEnds ?? "—"),
        owner: String(body.owner ?? "Вы"),
        createdAt: now,
        updatedAt: now
      };

      // prepend newest
      db.items.unshift(item);
      db.updatedAt = now;
      db.version = Number(db.version || 1) + 1;

      const newContent = JSON.stringify(db, null, 2);
      const newBase64 = Buffer.from(newContent, "utf8").toString("base64");

      // 2) Write updated file back to GitHub
      const writeResp = await fetch(`${ghBase}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${TOKEN}`,
          "Accept": "application/vnd.github+json",
          "User-Agent": "latch-vercel-api",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: `chore: add nft ${item.id}`,
          content: newBase64,
          sha,
          branch: BRANCH
        })
      });

      if (!writeResp.ok) {
        const text = await writeResp.text();
        return res.status(500).json({ ok: false, error: "GitHub write failed", details: text });
      }

      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({ ok: true, item, version: db.version, updatedAt: db.updatedAt });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });

  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
