import "server-only"

import type { Browser } from "puppeteer-core"

const BASE_ARGS = ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]

const SERVERLESS_EXTRA_ARGS = ["--disable-software-rasterizer", "--single-process"]

const CHROMIUM_PACK_URL =
  process.env.CHROMIUM_PACK_URL ??
  "https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.x64.tar"

function isServerlessRuntime(): boolean {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)
}

export { isServerlessRuntime }

export async function launchPuppeteerBrowser(): Promise<Browser> {
  if (isServerlessRuntime()) {
    const chromium = (await import("@sparticuz/chromium-min")).default
    const puppeteer = await import("puppeteer-core")

    return puppeteer.default.launch({
      args: [...chromium.args, ...BASE_ARGS, ...SERVERLESS_EXTRA_ARGS],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(CHROMIUM_PACK_URL),
      headless: chromium.headless ?? true,
    })
  }

  const puppeteer = await import("puppeteer")
  return puppeteer.default.launch({
    headless: true,
    args: BASE_ARGS,
  }) as Promise<Browser>
}
