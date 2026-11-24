/**
 * Bot and Crawler Detection
 * Identifies search engine crawlers, automated bots, and scraper tools
 * to prevent inflating view metrics.
 */

const KNOWN_BOT_PATTERNS = [
  /bot\b/i,
  /crawl/i,
  /spider/i,
  /slurp/i,
  /googlebot/i,
  /bingbot/i,
  /duckduckbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /sogou/i,
  /exabot/i,
  /facebot/i,
  /facebookexternalhit/i,
  /ia_archiver/i,
  /twitterbot/i,
  /linkedinbot/i,
  /slackbot/i,
  /telegrambot/i,
  /applebot/i,
  /pinterest/i,
  /semrushbot/i,
  /ahrefsbot/i,
  /mj12bot/i,
  /dotbot/i,
  /petalbot/i,
  /bytespider/i,
  /curl\//i,
  /wget\//i,
  /python-requests/i,
  /python-urllib/i,
  /postmanruntime/i,
  /axios\//i,
  /go-http-client/i,
  /apache-httpclient/i,
  /headlesschrome/i,
  /phantomjs/i,
  /selenium/i,
  /puppeteer/i,
  /playwright/i,
]

export function isBot(userAgent: string | null | undefined): boolean {
  if (!userAgent || userAgent.trim().length === 0) {
    // Empty user agents are usually automated probes
    return true
  }

  const ua = userAgent.toLowerCase()
  return KNOWN_BOT_PATTERNS.some((pattern) => pattern.test(ua))
}
