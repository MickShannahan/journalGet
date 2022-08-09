import { Worker } from 'worker_threads'

const debugging = true
const jobQ = []
const workers = []
const workerLimit = 1

export async function workerGetClassWeek(req, context) {
  try {
    const nameList = req.body.list
    nameList.forEach(n => {
      for (let i = 1; i <= 5; i++) {
        jobQ.push({
          type: 'reflections',
          name: n,
          week: req.query.week,
          day: '0' + i
        })
      }
      jobQ.push({ name: n, week: req.query.week, type: 'quizzes' })
    })
    const data = await startJobs(jobQ, context)
    return data
  } catch (error) {
    throw new Error(error)
  }
}

function startJobs(jobs, context) {
  context.log.error('[Starting Jobs]', jobs.length)
  const collection = []
  let working = true
  return new Promise(async(resolve, reject) => {
    try {
      while (working) {
        if (workers.length < workerLimit && jobs.length) {
          const worker = new Worker('./SharedCode/PuppetWorker.js')
          workers.push(worker)
          worker.on('message', (message) => {
            switch (message.status) {
              case 'job done':
                collection.push(message.data)
                // eslint-disable-next-line no-fallthrough
              case 'ready':
                continueWork(message.id)
                break
              case 'job failed':
                console.error(`${message.workerName} - failed`)
                if (message.job) console.error('[Failed Job]', message.job)
                if (message.error) console.error(message.error)
                worker.postMessage({ do: 'nothing', job: 'quitting time' })
                break
              default:
                console.error(`${message.workerName} - ${message.status}`)
                if (message.error) console.error(message.error)
            }
          })
          // FIXME end worker on error
          worker.on('error', err => {
            workerError(err)
            worker.postMessage({ do: 'nothing', job: 'quitting time' })
          })
          worker.on('exit', () => {
            workers.splice(workers.findIndex(w => w.threadId === worker.threadId), 1)
            console.warn('[Worker Exited] remaining work force ', workers.length)
          })
        }
        if (workers.length === 0) {
          if (!collection.length) { reject(new Error('did work but no collection')) }
          working = false
        }
        await doWork()
      }
      if (!collection.length) { reject(new Error('no collection')) }
      resolve(collection)
    } catch (error) {
      reject(error)
    }
  })
}

function continueWork(workerId) {
  const worker = workers.find(w => w.threadId === workerId)
  console.log('[JOBS LEFT]', jobQ.length)
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

function workerError(error) {
  console.error('[WORKER_ERROR]', error)
}
