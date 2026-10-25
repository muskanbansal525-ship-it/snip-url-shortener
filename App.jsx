import { useEffect, useState } from "react";
import { shorten, getStats } from "./api";

const STORAGE_KEY = "snip-history";
const ALIAS_REGEX = /^[A-Za-z0-9_-]{3,20}$/;

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveHistory(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* storage band ho toh bhi app chalti rahe */
  }
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy this link:", text);
    }
  }

  return (
    <button type="button" className="btn-dark" onClick={copy}>
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}

export default function App() {
  const [url, setUrl] = useState("");
  const [alias, setAlias] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState(loadHistory);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => saveHistory(history), [history]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setResult(null);

    const cleanAlias = alias.trim();
    if (cleanAlias && !ALIAS_REGEX.test(cleanAlias)) {
      setError("Alias must be 3 to 20 characters: letters, numbers, - and _ only.");
      return;
    }

    setLoading(true);
    try {
      const data = await shorten(url, cleanAlias);
      setResult(data);
      setHistory((prev) => {
        const without = prev.filter((h) => h.code !== data.code);
        return [{ code: data.code, shortUrl: data.shortUrl, longUrl: url, clicks: 0 }, ...without].slice(0, 20);
      });
      setUrl("");
      setAlias("");
    } catch (err) {
      setError(err.message === "Failed to fetch" ? "Cannot reach the server. Is the backend running?" : err.message);
    } finally {
      setLoading(false);
    }
  }

  async function refreshClicks() {
    setRefreshing(true);
    const updated = await Promise.all(
      history.map(async (h) => {
        try {
          const s = await getStats(h.code);
          return { ...h, clicks: s.clicks };
        } catch {
          return h;
        }
      })
    );
    setHistory(updated);
    setRefreshing(false);
  }

  function removeItem(code) {
    setHistory((prev) => prev.filter((h) => h.code !== code));
  }

  return (
    <div className="page">
      <header className="hero">
        <h1>Snip</h1>
        <p>Paste a long link. Get a short one that is yours alone.</p>
      </header>

      <form className="card form" onSubmit={handleSubmit}>
        <label>
          Long URL
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/a/very/long/link"
            required
          />
        </label>
        <label>
          Custom alias <span className="hint">optional, 3 to 20 characters</span>
          <input
            type="text"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            placeholder="my-resume"
            maxLength={20}
          />
        </label>
        <button type="submit" className="btn-main" disabled={loading}>
          {loading ? "Shortening..." : "Shorten link"}
        </button>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </form>

      {result && (
        <section className="ticket" aria-live="polite">
          <p className="ticket-label">{result.existing ? "You already had this one" : "Your short link"}</p>
          <a href={result.shortUrl} target="_blank" rel="noopener noreferrer" className="ticket-link">
            {result.shortUrl}
          </a>
          <CopyButton text={result.shortUrl} />
        </section>
      )}

      <section className="history">
        <div className="history-head">
          <h2>Your links</h2>
          {history.length > 0 && (
            <button type="button" className="btn-ghost" onClick={refreshClicks} disabled={refreshing}>
              {refreshing ? "Refreshing..." : "Refresh clicks"}
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <p className="muted">Links you create will show up here, with their click counts.</p>
        ) : (
          <ul>
            {history.map((h) => (
              <li key={h.code} className="card item">
                <div className="item-main">
                  <a href={h.shortUrl} target="_blank" rel="noopener noreferrer">
                    {h.shortUrl}
                  </a>
                  <span className="long" title={h.longUrl}>
                    {h.longUrl}
                  </span>
                </div>
                <div className="item-side">
                  <span className="clicks">{h.clicks} clicks</span>
                  <CopyButton text={h.shortUrl} />
                  <button type="button" className="btn-ghost" onClick={() => removeItem(h.code)} aria-label={`Remove ${h.code} from list`}>
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="muted small">Remove only clears it from this list. The short link keeps working.</p>
      </section>
    </div>
  );
}
