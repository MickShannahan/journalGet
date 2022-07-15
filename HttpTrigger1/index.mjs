import intercept from 'azure-function-log-intercept'
import puppeteer from 'puppeteer'

export default async function(context, req) {
  intercept(context)
  // TODO get errors back
  context.log('Cat-worker started ----------------', req.body)
  // try {
  //   const response = await workerGetClassWeek(req, context)
  //   // context.res.body = response
  //   return {
  //     body: response
  //   }
  // } catch (error) {
  //   context.res = {
  //     status: 400,
  //     body: error.message
  //   }
  // }
  const url = req.query.url || 'https://google.com/'
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  await page.goto(url)
  const screenshotBuffer =
      await page.screenshot({ fullPage: true })
  await browser.close()

  return {
    body: screenshotBuffer,
    headers: {
      'content-type': 'image/png'
    }
  }
}
