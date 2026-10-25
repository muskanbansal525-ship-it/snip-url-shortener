require("dotenv").config();
const express = require("express");
const crypto = require("crypto");
const path = require("path");
const pool = require("./db");
const { encode } = require("./base62");

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

const ALIAS_REGEX = /^[A-Za-z0-9_-]{3,20}$/;
const RESERVED = new Set(["api", "stats", "admin", "static", "public"]);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

function validateUrl(raw) {
  if (typeof raw !== "string" || raw.length > 2048) return null;
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.href; // normalized URL
  } catch {
    return null;
  }
}

// Auto-generated code: pehle row insert, phir id se code banao.
// Id hamesha unique hoti hai, isliye code bhi unique hota hai.
async function createGenerated(longUrl, hash) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const [r] = await pool.execute(
      "INSERT INTO urls (long_url, url_hash, is_custom) VALUES (?, ?, 0)",
      [longUrl, hash]
    );
    const code = encode(r.insertId);
    try {
      await pool.execute("UPDATE urls SET short_code = ? WHERE id = ?", [code, r.insertId]);
      return code;
    } catch (err) {
      // Rare: kisi ne custom alias me wahi code le rakha ho. Row hata ke naye id se retry.
      if (err.code === "ER_DUP_ENTRY") {
        await pool.execute("DELETE FROM urls WHERE id = ?", [r.insertId]);
        continue;
      }
      throw err;
    }
  }
  throw new Error("Could not generate a unique code");
}

app.post("/api/shorten", async (req, res) => {
  try {
    const longUrl = validateUrl(req.body.url);
    if (!longUrl) {
      return res.status(400).json({ error: "Valid http ya https URL daalo." });
    }
    const alias = (req.body.alias || "").trim();
    const hash = sha256(longUrl);

    // Case 1: custom alias
    if (alias) {
      if (!ALIAS_REGEX.test(alias)) {
        return res.status(400).json({
          error: "Alias 3 se 20 characters ka ho: sirf letters, numbers, - aur _.",
        });
      }
      if (RESERVED.has(alias.toLowerCase())) {
        return res.status(400).json({ error: "Ye alias reserved hai, doosra chuno." });
      }
      try {
        await pool.execute(
          "INSERT INTO urls (short_code, long_url, url_hash, is_custom) VALUES (?, ?, ?, 1)",
          [alias, longUrl, hash]
        );
        return res.status(201).json({ shortUrl: `${BASE_URL}/${alias}`, code: alias });
      } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(409).json({ error: "Ye alias pehle se le liya gaya hai." });
        }
        throw err;
      }
    }

    // Case 2: same long URL pehle se shorten ho chuka hai? Wahi code wapas do (no duplicates).
    const [existing] = await pool.execute(
      "SELECT short_code FROM urls WHERE url_hash = ? AND is_custom = 0 AND short_code IS NOT NULL LIMIT 1",
      [hash]
    );
    if (existing.length) {
      const code = existing[0].short_code;
      return res.json({ shortUrl: `${BASE_URL}/${code}`, code, existing: true });
    }

    // Case 3: naya unique code banao
    const code = await createGenerated(longUrl, hash);
    return res.status(201).json({ shortUrl: `${BASE_URL}/${code}`, code });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error. Thodi der baad try karo." });
  }
});

app.get("/api/stats/:code", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT short_code, long_url, clicks, created_at FROM urls WHERE short_code = ?",
      [req.params.code]
    );
    if (!rows.length) return res.status(404).json({ error: "Link nahi mila." });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error." });
  }
});

// Redirect: sabse last me rakho taaki /api routes na takrayein
app.get("/:code", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id, long_url FROM urls WHERE short_code = ?",
      [req.params.code]
    );
    if (!rows.length) return res.status(404).send("Link nahi mila.");
    pool.execute("UPDATE urls SET clicks = clicks + 1 WHERE id = ?", [rows[0].id]).catch(console.error);
    // 302 use kiya taaki har click server tak aaye (301 browser cache kar leta hai, clicks count nahi hote)
    res.redirect(302, rows[0].long_url);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error.");
  }
});

app.listen(PORT, () => console.log(`Server chal raha hai: ${BASE_URL}`));
