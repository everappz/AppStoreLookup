# App Store Lookup

A single-page web app that fetches and displays detailed information about any app on the Apple App Store using the iTunes Lookup API.

## Features

- **Flexible URL input** — paste any App Store link, including Google redirect URLs with double-encoded characters
- **Developer pages** — detects developer/artist URLs and lists all their apps
- **Full app details** — name, icon, rating, version, bundle ID, price, size, genres, languages, release dates, and more
- **Downloadable assets** — app icons in all sizes (60px to 1024px) and all screenshots (iPhone, iPad, Apple TV) with one-click download
- **Country-aware** — extracts the country code from the URL for region-specific lookups
- **CORS-safe** — uses fetch with automatic JSONP fallback, works from `file://` and any web server
- **Raw JSON** — view the complete API response

## Supported URL Formats

| Format | Example |
|--------|---------|
| Direct App Store link | `https://apps.apple.com/us/app/telegram/id686449807` |
| Short App Store link | `https://apps.apple.com/app/id686449807` |
| Google redirect | `https://www.google.com/url?...&url=https://apps.apple.com/us/app/telegram/id686449807&...` |
| Double-encoded URLs | URLs with `%25xx` encoded characters (e.g. Cyrillic app names) |
| With query params | URLs containing `?mt=12` or similar parameters |
| Developer pages | `https://apps.apple.com/us/developer/apple/id284417353` |

## Usage

Open `App Store Lookup.html` in any browser. No build step, no dependencies, no server required.

1. Paste an App Store URL into the input field
2. Press **Enter** or click **Lookup**
3. Browse the app details, download icons and screenshots

## How It Works

1. Parses the input URL, handling Google redirects and multi-layer percent-encoding
2. Extracts the numeric App ID (`/id123456789`) and optional country code
3. Calls `https://itunes.apple.com/lookup?id=<ID>&country=<CC>`
4. Renders the response with all available metadata and media

## License

[MIT](LICENSE)
