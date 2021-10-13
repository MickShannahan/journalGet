const process = require('process')
const { isMainThread, parentPort } = require('worker_threads')
const puppeteer = require('puppeteer')
const Cat = require('../utils/Gennerate')

const chromeOptions = {
  headless: true,
  defaultViewport: null,
  args: [
    '--autoplay-policy=user-gesture-required',
    '--disable-background-networking',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-breakpad',
    '--disable-client-side-phishing-detection',
    '--disable-component-update',
    '--disable-default-apps',
    '--disable-dev-shm-usage',
    '--disable-domain-reliability',
    '--disable-extensions',
    '--disable-features=AudioServiceOutOfProcess',
    '--disable-hang-monitor',
    '--disable-ipc-flooding-protection',
    '--disable-notifications',
    '--disable-offer-store-unmasked-wallet-cards',
    '--disable-popup-blocking',
    '--disable-print-preview',
    '--disable-prompt-on-repost',
    '--disable-renderer-backgrounding',
    '--disable-setuid-sandbox',
    '--disable-speech-api',
    '--disable-sync',
    '--hide-scrollbars',
    '--ignore-gpu-blacklist',
    '--metrics-recording-only',
    '--mute-audio',
    '--no-default-browser-check',
    '--no-first-run',
    '--no-pings',
    '--no-sandbox',
    '--no-zygote',
    '--password-store=basic',
    '--use-gl=swiftshader',
    '--use-mock-keychain'
  ]
}
const blockedDomains = [
  'googlesyndication.com',
  'adservice.google.com',
  'simple-jekyll-search.min.js',
  'bcw.blob',
  'search',
  '.png'
]
function url(name, subject = 'reflections', week, day) {
  return `https://${name}.github.io/fs-journal/${subject}/week${week}/${day}`
}

// WEB worker stuff
const id = process.geteuid ? process.getuid() : Cat.getName()
const cat = Cat.getCat()

if (!isMainThread) {
  init()
  console.log(`${cat} - ${id} Started`)
} else {
  console.log('this is the main thread???')
}

// Open Browser Context
let browser = null

async function init() {
  browser = await puppeteer.launch(chromeOptions)

  parentPort.on('message', async(action) => {
    console.log(`${cat} - ${id} got job ${JSON.stringify(action.job)}`)
    switch (action.do) {
      case 'reflection':
        await getReflection(action.job)
        break
      case 'quiz':
        parentPort.postMessage({ doing: 'not yet implemented', id })
        break
      default:
        await browser.close()
        parentPort.postMessage({ doing: 'Exiting', id })
        process.exit()
    }
  })

  // SECTION get Reflection

  async function getReflection({ name, week, day }) {
    const reflection = {
      name,
      week,
      day,
      createdAt: new Date(Date.now()).toISOString(),
      questions: {
        url: null,
        imgUrl: null,
        valid: null
      },
      repo: {
        url: null,
        imgUrl: null,
        valid: false
      }

    }

    const page = await browser.newPage()
    await page.setRequestInterception(true)
    page.on('request', request => {
      const url = request.url()
      if (blockedDomains.some(domain => url.includes(domain))) {
        request.abort()
      } else {
        request.continue()
      }
    })
    const reflectionLink = url(name, 'reflections', week, day)
    reflection.questions.url = reflectionLink
    await page.goto(reflectionLink, { waitUntil: 'domcontentloaded' })
    await page.evaluate(() => { // page Scroll
      return Promise.resolve(window.scrollTo(0, document.body.scrollHeight))
    })
    // SECTION getting reflections pic
    await page.waitForTimeout(200)
    await page.screenshot(
    // { path: './screenshots/' + name + 'W' + week + 'D' + day + '.jpg', type: 'jpeg' }
    )

    // SECTION getting repo pic
    const linkElm = await page.$('h2+p strong a')
    if (linkElm == null) {
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
    if (linkResponse.status() === 200) {
      reflection.repo.valid = true
    }
    await page.close()
    parentPort.postMessage({ status: 'job done', data: reflection, cat, id })
  }
}
