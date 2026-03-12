// ============================================================================
// Tests for extractAppInfo() — URL parsing logic from App Store Lookup
// Run with: node extractAppInfo.test.js
// ============================================================================

// ---------- Extract the function from the HTML context -----------------------
// The function lives inside an HTML file; we copy it here verbatim so the
// tests can run in plain Node.js without a browser or DOM.

function extractAppInfo(raw) {
  let url = raw.trim();

  // Decode repeatedly until stable (handles double/triple percent-encoding)
  let prev = '', decoded = url;
  while (decoded !== prev) {
    prev = decoded;
    try { decoded = decodeURIComponent(decoded); } catch (e) { break; }
  }
  url = decoded;

  // Handle Google redirect URLs — pull out the real Apple URL from ?url=...
  const gMatch = url.match(/[?&]url=(https?:\/\/apps\.apple\.com[^&]*)/i);
  if (gMatch) {
    let appleUrl = gMatch[1];
    let p = '';
    while (appleUrl !== p) {
      p = appleUrl;
      try { appleUrl = decodeURIComponent(appleUrl); } catch (e) { break; }
    }
    url = appleUrl;
  }

  // Strip query string and fragment for cleaner matching
  const cleanUrl = url.split('?')[0].split('#')[0];

  // Extract country code: apps.apple.com/<cc>/...
  let country = null;
  const cm = cleanUrl.match(/apps\.apple\.com\/([a-z]{2})\//i);
  if (cm) country = cm[1].toLowerCase();

  // Detect developer page
  const isDeveloper = /\/developer\//i.test(cleanUrl);

  // Match /id<digits> in the path
  const idMatch = cleanUrl.match(/\/id(\d+)/);
  if (idMatch) return { id: idMatch[1], country, isDeveloper };

  // Query param fallback
  const paramMatch = url.match(/[?&]id=(\d+)/);
  if (paramMatch) return { id: paramMatch[1], country, isDeveloper: false };

  // Raw input fallbacks (before any decoding)
  const rawMatch = raw.match(/\/id(\d+)/);
  if (rawMatch) return { id: rawMatch[1], country, isDeveloper: false };

  const encodedMatch = raw.match(/%2Fid(\d+)/i);
  if (encodedMatch) return { id: encodedMatch[1], country, isDeveloper: false };

  // Maybe it's just a bare numeric ID
  if (/^\d{6,}$/.test(raw.trim())) return { id: raw.trim(), country: null, isDeveloper: false };

  return null;
}

// ---------- Minimal test harness ---------------------------------------------

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(message);
    console.error(`  FAIL: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed++;
  } else {
    failed++;
    const detail = `${message}\n         expected: ${e}\n         actual:   ${a}`;
    failures.push(detail);
    console.error(`  FAIL: ${detail}`);
  }
}

function section(title) {
  console.log(`\n--- ${title} ---`);
}

// ---------- Tests ------------------------------------------------------------

section("Direct App Store links");

assertEqual(
  extractAppInfo("https://apps.apple.com/us/app/telegram/id686449807"),
  { id: "686449807", country: "us", isDeveloper: false },
  "Standard US App Store link"
);

assertEqual(
  extractAppInfo("https://apps.apple.com/gb/app/whatsapp-messenger/id310633997"),
  { id: "310633997", country: "gb", isDeveloper: false },
  "UK App Store link"
);

assertEqual(
  extractAppInfo("https://apps.apple.com/de/app/instagram/id389801252"),
  { id: "389801252", country: "de", isDeveloper: false },
  "German App Store link"
);

assertEqual(
  extractAppInfo("https://apps.apple.com/jp/app/line/id443904275"),
  { id: "443904275", country: "jp", isDeveloper: false },
  "Japanese App Store link"
);

section("Short App Store links (no country code)");

assertEqual(
  extractAppInfo("https://apps.apple.com/app/id686449807"),
  { id: "686449807", country: null, isDeveloper: false },
  "Short link without country code"
);

assertEqual(
  extractAppInfo("https://apps.apple.com/app/telegram/id686449807"),
  { id: "686449807", country: null, isDeveloper: false },
  "Short link with app name but no country"
);

section("Links with query parameters");

assertEqual(
  extractAppInfo("https://apps.apple.com/us/app/xcode/id497799835?mt=12"),
  { id: "497799835", country: "us", isDeveloper: false },
  "App Store link with ?mt=12 (Mac App Store)"
);

assertEqual(
  extractAppInfo("https://apps.apple.com/us/app/pages/id409201541?mt=12&ls=1"),
  { id: "409201541", country: "us", isDeveloper: false },
  "App Store link with multiple query params"
);

section("Links with fragment identifiers");

assertEqual(
  extractAppInfo("https://apps.apple.com/us/app/telegram/id686449807#reviews"),
  { id: "686449807", country: "us", isDeveloper: false },
  "App Store link with fragment"
);

section("Google redirect URLs");

assertEqual(
  extractAppInfo("https://www.google.com/url?sa=t&url=https://apps.apple.com/us/app/telegram/id686449807&ved=abc"),
  { id: "686449807", country: "us", isDeveloper: false },
  "Google redirect wrapping a direct App Store link"
);

assertEqual(
  extractAppInfo("https://www.google.com/url?sa=t&url=https%3A%2F%2Fapps.apple.com%2Fus%2Fapp%2Ftelegram%2Fid686449807&ved=abc"),
  { id: "686449807", country: "us", isDeveloper: false },
  "Google redirect with percent-encoded Apple URL"
);

section("Double-encoded URLs (Cyrillic / non-ASCII app names)");

assertEqual(
  extractAppInfo("https://apps.apple.com/ru/app/%25D0%25BF%25D1%2580%25D0%25B8%25D0%25BB%25D0%25BE%25D0%25B6%25D0%25B5%25D0%25BD%25D0%25B8%25D0%25B5/id123456789"),
  { id: "123456789", country: "ru", isDeveloper: false },
  "Double-encoded Cyrillic characters in app name"
);

assertEqual(
  extractAppInfo("https://www.google.com/url?url=https%253A%252F%252Fapps.apple.com%252Fru%252Fapp%252Ftest%252Fid999888777"),
  { id: "999888777", country: "ru", isDeveloper: false },
  "Google redirect with double-encoded Apple URL"
);

section("Developer / Artist pages");

assertEqual(
  extractAppInfo("https://apps.apple.com/us/developer/apple/id284417353"),
  { id: "284417353", country: "us", isDeveloper: true },
  "US developer page"
);

assertEqual(
  extractAppInfo("https://apps.apple.com/developer/google-llc/id281956209"),
  { id: "281956209", country: null, isDeveloper: true },
  "Developer page without country code"
);

assertEqual(
  extractAppInfo("https://apps.apple.com/de/developer/microsoft-corporation/id298856275"),
  { id: "298856275", country: "de", isDeveloper: true },
  "German developer page"
);

section("Bare numeric ID");

assertEqual(
  extractAppInfo("686449807"),
  { id: "686449807", country: null, isDeveloper: false },
  "Bare numeric ID (9 digits)"
);

assertEqual(
  extractAppInfo("  686449807  "),
  { id: "686449807", country: null, isDeveloper: false },
  "Bare numeric ID with whitespace"
);

assertEqual(
  extractAppInfo("1234567890"),
  { id: "1234567890", country: null, isDeveloper: false },
  "Bare numeric ID (10 digits)"
);

section("Query parameter ?id= fallback");

assertEqual(
  extractAppInfo("https://example.com/lookup?id=686449807"),
  { id: "686449807", country: null, isDeveloper: false },
  "Non-Apple URL with ?id= query param"
);

assertEqual(
  extractAppInfo("https://example.com/lookup?foo=bar&id=123456789"),
  { id: "123456789", country: null, isDeveloper: false },
  "Non-Apple URL with &id= query param"
);

section("Encoded /id path fallback");

assertEqual(
  extractAppInfo("https%3A%2F%2Fapps.apple.com%2Fus%2Fapp%2Ftelegram%2Fid686449807"),
  { id: "686449807", country: "us", isDeveloper: false },
  "Fully percent-encoded Apple URL"
);

section("Invalid / unsupported inputs");

assertEqual(
  extractAppInfo("https://apps.apple.com/us/app/telegram"),
  null,
  "App Store URL with no ID returns null"
);

assertEqual(
  extractAppInfo("not a url at all"),
  null,
  "Random text returns null"
);

assertEqual(
  extractAppInfo(""),
  null,
  "Empty string returns null"
);

assertEqual(
  extractAppInfo("12345"),
  null,
  "Number shorter than 6 digits returns null (not a valid app ID)"
);

assertEqual(
  extractAppInfo("https://www.apple.com/"),
  null,
  "Apple homepage returns null"
);

section("Edge cases");

assertEqual(
  extractAppInfo("https://apps.apple.com/US/app/telegram/id686449807"),
  { id: "686449807", country: "us", isDeveloper: false },
  "Uppercase country code is normalised to lowercase"
);

assertEqual(
  extractAppInfo("   https://apps.apple.com/us/app/telegram/id686449807   "),
  { id: "686449807", country: "us", isDeveloper: false },
  "Leading and trailing whitespace is trimmed"
);

assertEqual(
  extractAppInfo("https://apps.apple.com/us/app/some-app/id000000100"),
  { id: "000000100", country: "us", isDeveloper: false },
  "ID with leading zeros is preserved as-is"
);

// ---------- Summary ----------------------------------------------------------

console.log(`\n========================================`);
console.log(`  Total: ${passed + failed}   Passed: ${passed}   Failed: ${failed}`);
console.log(`========================================`);

if (failed > 0) {
  console.log(`\nFailed tests:`);
  failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  process.exit(1);
} else {
  console.log(`\nAll tests passed.`);
  process.exit(0);
}
