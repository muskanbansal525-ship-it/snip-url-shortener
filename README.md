# Snip - URL Shortener

A full-stack URL shortener that gives every long link a **unique** short code. Built with React, Node.js, Express and MySQL.
<img width="1567" height="868" alt="image" src="https://github.com/user-attachments/assets/61551a59-c16b-44bf-be90-e70aa0872b4d" />
<img width="932" height="795" alt="image" src="https://github.com/user-attachments/assets/9c0f43f7-5a59-44b2-b5bc-ada9d0166fbf" />



## Features

- Shorten any `http` or `https` link into a short, unique URL
- Optional **custom alias** (for example `/my-resume`) with a clear error if it is already taken
- Shortening the same link twice returns the **same short code** instead of creating a duplicate
- Click tracking: every visit to a short link is counted in MySQL
- "Your links" list with click counts and a copy button
- Input validation on both the frontend and the backend

## Tech stack

| Layer | Tools |
|---|---|
| Frontend | React, Vite, plain CSS |
| Backend | Node.js, Express |
| Database | MySQL (`mysql2`) |

## How uniqueness is guaranteed

1. **Generated codes come from the database id.** A new row is inserted first, and MySQL gives it a unique auto-increment `id`. That `id` is converted to base62 (`0-9`, `a-z`, `A-Z`). One id always maps to exactly one code, so two links can never get the same code, even when many requests arrive at the same time.
2. **The database enforces it too.** `short_code` has a `UNIQUE` index, so MySQL rejects a duplicate even if there is a bug in the application code.
3. **Case-sensitive codes.** The column uses the `utf8mb4_bin` collation, because `Ab` and `ab` are different base62 codes.
4. **Custom aliases** are inserted directly. A duplicate triggers the unique index and the API returns `409 Conflict`.
5. **Collision between an alias and a generated code** is handled by deleting the new row and retrying with the next id.
6. **No duplicate rows for the same URL.** The long URL is hashed (SHA-256) and looked up before a new code is created.

## Project structure

```
url-shortener/
├── backend/
│   ├── server.js        Express app and routes
│   ├── db.js            MySQL connection pool
│   ├── base62.js        id to short code encoder
│   ├── schema.sql       database and table
│   ├── package.json
│   └── .env.example
├── src/
│   ├── App.jsx          main UI
│   ├── App.css
│   ├── api.js           backend calls
│   └── main.jsx
├── index.html
├── vite.config.js       dev proxy for /api
└── package.json         frontend dependencies
```
## API
| Method | Route | Description |
|---|---|---|
| `POST` | `/api/shorten` | Body: `{ "url": "...", "alias": "optional" }`. Returns `{ shortUrl, code }` |
| `GET` | `/api/stats/:code` | Returns the long URL, click count and creation time |
| `GET` | `/:code` | Redirects (302) to the original URL and counts the click |
Status codes: `201` created, `200` existing link returned, `400` invalid input, `404` not found, `409` alias already taken.
A `302` redirect is used instead of `301` so that browsers do not cache the redirect and every click reaches the server to be counted.
## Getting started
**Requirements:** Node.js (LTS) and MySQL.
### 1. Clone the repository
```bash
git clone https://github.com/YOUR-USERNAME/url-shortener.git
cd url-shortener
```
### 2. Set up the database
Run `backend/schema.sql` in MySQL Workbench (or the MySQL command line). It creates the `url_shortener` database and the `urls` table.
### 3. Start the backend
```bash
cd backend
npm install
```
Copy `.env.example` to `.env` and fill in your MySQL password:
```
PORT=3000
BASE_URL=http://localhost:3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=url_shortener
```
```bash
npm run dev
```
### 4. Start the frontend
Open a second terminal in the project root:
```bash
npm install
npm run dev
```
Open `http://localhost:5173`.
## What I learned
- Designing a unique ID scheme and backing it with a database constraint
- Handling race conditions and collisions instead of assuming they never happen
- Choosing between 301 and 302 redirects based on what the product needs
- Connecting a React frontend to an Express and MySQL backend through a dev proxy
## Future improvements
- User accounts (JWT) so each person sees their own links
- Link expiry dates and a delete option
- Rate limiting and a Redis cache for faster redirects
- Non-sequential codes, so short links cannot be guessed by counting
- Load testing with autocannon and published results
