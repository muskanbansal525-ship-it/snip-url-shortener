CREATE DATABASE IF NOT EXISTS url_shortener;
USE url_shortener;

CREATE TABLE IF NOT EXISTS urls (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  -- utf8mb4_bin = case-sensitive, kyunki base62 me "Ab" aur "ab" alag codes hain
  short_code VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
  long_url   VARCHAR(2048) NOT NULL,
  url_hash   CHAR(64) NOT NULL,
  is_custom  BOOLEAN NOT NULL DEFAULT FALSE,
  clicks     INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_short_code (short_code),  -- UNIQUENESS ki guarantee yahin se aati hai
  KEY idx_url_hash (url_hash)
);
