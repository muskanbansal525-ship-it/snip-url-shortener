const CHARS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

// Har unique id ka base62 code bhi unique hota hai (ek id -> ek code).
// Offset isliye ki codes kam se kam 6 characters ke ho (62^5 = 916,132,832).
const OFFSET = 62 ** 5;

function encode(id) {
  let n = Number(id) + OFFSET;
  let out = "";
  while (n > 0) {
    out = CHARS[n % 62] + out;
    n = Math.floor(n / 62);
  }
  return out;
}

module.exports = { encode };
