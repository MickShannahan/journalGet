import intercept from 'azure-function-log-intercept'
import { workerGetClassWeek } from '../SharedCode/CloudController.mjs'

export default async function(context, req) {
  intercept(context)
  // TODO get errors back
  context.log('Cat-worker started ----------------', req.body)
  try {
    const response = await workerGetClassWeek(req, context)
    console.warn('jobs done', response)
    // context.res = { status: 200, body: response }
    return {
      status: 200,
      body: response,
      headers: {
        'content-type': 'application/json'
      }
    }
  } catch (error) {
    context.res = {
      status: 400,
      body: error.message
    }
  }
  // NOTE this worked
  // const url = req.query.url || 'https://google.com/'
  // const browser = await puppeteer.launch()
  // const page = await browser.newPage()
  // await page.goto(url)
  // const screenshotBuffer =
  //     await page.screenshot({ fullPage: true })
  // await browser.close()

  // return {
  //   body: screenshotBuffer,
  //   headers: {
  //     'content-type': 'image/png'
  //   }
  // }
}
