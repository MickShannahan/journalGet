const { isMainThread, parentPort, threadId } = require('worker_threads')
const puppeteer = require('puppeteer')
const Cat = require('catid')

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
function url(name, type, week, day) {
  return `https://${name}.github.io/fs-journal/${type}/week${week}` + (day ? `/${day}` : '')
}

// WEB worker identification stuff
const id = threadId
const workerName = Cat.getName(false)
const worker = Cat.getCat()

// start worker
if (!isMainThread) {
  init()
  console.log(`${worker} - ${workerName} Started on thread ${id}`)
  parentPort.postMessage({ status: 'ready', id })
} else {
  console.log('this is the main thread???')
}

// Open Browser Context
let browser = null

async function init() {
  // Create Browser for worker
  browser = await puppeteer.launch(chromeOptions)

  // Direct messages/jobs from parent to worker
  parentPort.on('message', async(action) => {
    console.log(`${worker} - ${workerName} got job ${JSON.stringify(action)}`)
    switch (action.do) {
      case 'reflections':
        await getReflection(action.job)
        break
      case 'quizzes':
        await getQuiz(action.job)
        break
      default:
        await browser.close()
        parentPort.postMessage({ status: 'Exiting', workerName })
        parentPort.close()
    }
  })

  // SECTION get Reflection

  async function getReflection({ name, type, week, day }) {
    try {
      const reflection = {
        type: 'reflection',
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
        },
        reportedBy: worker + ' ' + workerName
      }
      // open page
      const page = await browser.newPage()
      await page.setRequestInterception(true)
      // intercept non essential requests and abort
      page.on('request', request => {
        const url = request.url()
        // found a use for .some
        if (blockedDomains.some(domain => url.includes(domain))) {
          request.abort()
        } else {
          request.continue()
        }
      })
      // create url based on job data
      const reflectionLink = url(name, type, week, day)
      reflection.questions.url = reflectionLink
      await page.goto(reflectionLink, { waitUntil: 'domcontentloaded' })
      await page.evaluate(() => { // page Scroll
        return Promise.resolve(window.scrollTo(0, document.body.scrollHeight))
      })
      // SECTION getting reflections pic
      await page.waitForTimeout(200)
      await page.screenshot(
        { path: './screenshots/' + name + 'W' + week + 'D' + (day || type) + '.jpg', type: 'jpeg', fullPage: true, quality: 50 }
      )

      // SECTION getting repo pic
      const linkElm = await page.$('h2+p strong a')
      // check if repo link is even there
      if (linkElm !== null) {
        const link = await (await linkElm.getProperty('href')).jsonValue()
        reflection.repo.url = link
        let linkResponse = {}
        // register listener for repo page response
        await page.on('response', async response => {
          if (response.url() === link) {
            linkResponse = response
          }
        })
        // nav to repo link
        await page.goto(link, { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(500)
        // check if repo link was good or not
        if (linkResponse.status() === 200) {
          reflection.repo.valid = true
        }
      }
      // close page and message parent that job is done
      await page.close()
      parentPort.postMessage({ status: 'job done', data: reflection, workerName, id })
    } catch (error) {
      console.error(error)
      parentPort.postMessage({ status: 'job Failed', error, workerName, id })
    }
  }

  async function getQuiz({ name, type, week }) {
    try {
      const quiz = {
        type: 'quiz',
        name,
        week,
        questions: {},
        createdAt: new Date(Date.now()).toISOString(),
        reportedBy: worker + ' ' + workerName
      }
      // open page
      const page = await browser.newPage()
      // intercept non essential requests and abort
      await page.setRequestInterception(true)
      page.on('request', request => {
        const url = request.url()
        if (blockedDomains.some(domain => url.includes(domain))) {
          request.abort()
        } else {
          request.continue()
        }
      })
      // create quiz url from job data
      const quizLink = url(name, type, week)
      quiz.url = quizLink
      await page.goto(quizLink, { waitUntil: 'domcontentloaded' })
      // grabs question text
      const questions = await page.$$eval('article p', (elms) => elms.map(e => e.textContent.trim()))
      // grabs answers
      const answers = await page.$$eval('pre > code.language-plaintext', (elms) => elms.map(e => e.textContent.trim()))
      // combines questions and answers into one object
      questions.forEach((q, i) => {
        quiz.questions[q] = answers[i]
      })
      // close page and message parent job done
      await page.close()
      parentPort.postMessage({ status: 'job done', data: quiz, id })
    } catch (error) {
      console.error(workerName, error)
      parentPort.postMessage({ status: 'job Failed', error, workerName, id })
    }
  }
}
