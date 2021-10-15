import puppeteer from 'puppeteer'
import { Worker } from 'worker_threads'
import { journalsService } from '../services/JournalsService'
import BaseController from '../utils/BaseController'
import { logger } from '../utils/Logger'

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
  'bcw.blob',
  '.jpeg',
  '.png'
]

function url(name, subject = 'reflections', week, day) {
  return `https://${name}.github.io/fs-journal/${subject}/week${week}/${day}`
}

export class JournalsController extends BaseController {
  constructor() {
    super('api/journals')
    this.router
      .get('/worker/student/:name/week/:week', this.workerGetStudentWeek)
      .post('/worker/class/week/:week', this.workerGetClassWeek)
      .get('/student/:name/week/:week/day/:day', this.getStudentDay)
      .get('/student/:name/week/:week', this.getStudentWeek)
      .post('/class/week/:week', this.getClassWeek)
  }

  async getStudentDay(req, res, next) {
    try {
      const browser = await puppeteer.launch(chromeOptions)

      const reflection = await journalsService.getReflection(browser, req.params)
      res.send(reflection)
      await browser.close()
    } catch (error) {
      next(error)
    }
  }

  async getStudentWeek(req, res, next) {
    try {
      const browser = await puppeteer.launch(chromeOptions)

      const reflections = []
      for (let i = 1; i <= 5; i++) {
        reflections.push(await journalsService.getReflection(browser, { ...req.params, day: '0' + i }))
      }

      res.send(reflections)
      await browser.close()
    } catch (error) {
      logger.error(error)
      next(error)
    }
  }

  async getClassWeek(req, res, next) {
    try {
      const browser = await puppeteer.launch(chromeOptions)

      const nameList = req.body.list
      const reflections = []
      for (let i = 0; i < nameList.length; i++) {
        const studentName = nameList[i]
        const studentReflection = { name: studentName, reflections: [] }
        for (let j = 1; j <= 5; j++) {
          studentReflection.reflections.push(await journalsService.getReflection(browser, { name: studentName, week: req.params.week, day: '0' + j }))
        }
        logger.log(studentReflection)
        reflections.push(studentReflection)
      }
      res.send(reflections)
      // await browser.close()
    } catch (error) {
      logger.error(error)
      next(error)
    }
  }

  async workerGetStudentWeek(req, res, next) {
    try {
      // Create jobs and push to que
      for (let i = 1; i <= 5; i++) {
        jobQ.push({
          type: 'reflections',
          name: req.params.name,
          week: req.params.week,
          day: '0' + i
        })
      }
      jobQ.push({ ...req.params, type: 'quizzes' })

      const data = await startJobs(jobQ)

      return res.send(data)
      // await browser.close()
    } catch (error) {
      logger.error(error)
      next(error)
    }
  }

  async workerGetClassWeek(req, res, next) {
    try {
      const nameList = req.body.list
      nameList.forEach(n => {
        for (let i = 1; i <= 5; i++) {
          jobQ.push({
            type: 'reflections',
            name: n,
            week: req.params.week,
            day: '0' + i
          })
        }
        jobQ.push({ name: n, week: req.params.week, type: 'quizzes' })
      })
      const data = await startJobs(jobQ)
      return res.send(data)
    } catch (error) {
      logger.log(error)
    }
  }
}

function workerMessaged(message) {
  switch (message.status) {
    case 'job done':
      continueWork(message.id)
      break
    default:
      logger.error(`${message.workerName} - ${message.status}`)
  }
}
function workerError(error) {
  logger.error('[WORKER_ERROR]', error)
}

const jobQ = []
const workers = []
const workerLimit = 4

// Starts workers for job Q
function startJobs(jobs) {
  const collection = []
  let working = true
  return new Promise(async(resolve, reject) => {
    while (working) {
      if (workers.length < workerLimit && jobs.length) {
        const worker = new Worker('./server/services/PuppetWorker.js')
        workers.push(worker)
        worker.on('message', (message) => {
          switch (message.status) {
            case 'job done':
              collection.push(message.data)
            // eslint-disable-next-line no-fallthrough
            case 'ready':
              continueWork(message.id)
              break
            default:
              logger.error(`${message.workerName} - ${message.status}`)
          }
        })
        worker.on('error', workerError)
        worker.on('exit', () => {
          workers.splice(workers.findIndex(w => w.threadId === worker.threadId), 1)
          logger.warn('[Worker Exited] remaining work force ', workers.length)
        })
      }
      if (workers.length === 0) {
        working = false
      }
      await doWork()
    }
    resolve(collection)
  })
}

function continueWork(workerId) {
  const worker = workers.find(w => w.threadId === workerId)
  logger.log('[JOBS LEFT]', jobQ.length)
  if (jobQ.length > 0) {
    const nextJob = jobQ.shift()
    worker.postMessage({ do: nextJob.type, job: nextJob })
  } else {
    worker.postMessage({ do: 'All in a hard days work', job: 'all done' })
  }
}

function doWork() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve()
    }, 1000)
  })
}
