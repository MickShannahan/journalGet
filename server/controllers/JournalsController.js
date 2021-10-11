import puppeteer from 'puppeteer'
import { journalsService } from '../services/JournalsService'
import BaseController from '../utils/BaseController'
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

export class JournalsController extends BaseController {
  constructor() {
    super('api/journals')
    this.router
      .get('/student/:name/week/:week/day/:day', this.getStudentDay)
      .get('/student/:name/week/:week', this.getStudentWeek)
      .post('/class/week/:week', this.getClassWeek)
  }

  async getStudentDay(req, res, next) {
    try {
      const browser = await puppeteer.launch(chromeOptions)

      const reflection = await journalsService.getReflection(browser, req.params)
      res.send(reflection)
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
    } catch (error) {
      logger.error(error)
      next(error)
    }
  }
}
