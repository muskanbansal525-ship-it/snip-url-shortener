// Saari backend calls yahin hain. Vite proxy ki wajah se "/api" seedha backend tak jata hai.

async function parse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

export async function shorten(url, alias) {
  const res = await fetch("/api/shorten", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, alias }),
  });
  return parse(res);
}

export async function getStats(code) {
  const res = await fetch(`/api/stats/${encodeURIComponent(code)}`);
  return parse(res);
}
