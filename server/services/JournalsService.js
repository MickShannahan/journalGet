import { logger } from '../utils/Logger'

const chromeOptions = {
  headless: true,
  defaultViewport: null,
  args: [
    '--no-sandbox'
  ]
}

function url(name, subject = 'reflections', week, day) {
  return `https://${name}.github.io/fs-journal/${subject}/week${week}/${day}`
}

class JournalsService {
  async getReflection(browser, { name, week, day }) {
    const reflection = {
      name,
      week,
      day,
      createdAt: new Date(Date.now()).toISOString,
      questions: {
        url: null,
        imgUrl: null,
        valid: null
      },
      repo: {
        url: null,
        imgUrl: null,
        valid: null
      }

    }
    const page = await browser.newPage()
    const reflectionLink = url(name, 'reflections', week, day)
    reflection.questions.url = reflectionLink
    await page.goto(reflectionLink, { waitUntil: 'domcontentloaded' })
    await page.evaluate(() => { // page Scroll
      return Promise.resolve(window.scrollTo(0, document.body.scrollHeight))
    })
    // SECTION getting reflections pic
    await page.waitForTimeout(200)
    await page.screenshot({ path: './screenshots/' + name + 'W' + week + 'D' + day + '.jpg', type: 'jpeg' })

    // SECTION getting repo pic
    const linkElm = await page.$('h2+p strong a')
    logger.log(linkElm)
    if (linkElm == null) {
      browser.close()
      return reflection
    }
    const link = await (await linkElm.getProperty('href')).jsonValue()
    reflection.repo.url = link
    let linkResponse = {}
    await page.on('response', async response => {
      if (response.url() === link) {
        linkResponse = response
      }
    })
    await page.goto(link, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    if (linkResponse.status() !== 200) {
      reflection.repo.valid = false
    }
    browser.close()
    return reflection
  }
}

export const journalsService = new JournalsService()
