import intercept from 'azure-function-log-intercept'
import { workerGetClassWeek } from '../SharedCode/CloudController.mjs'

export default async function(context, req) {
  intercept(context)
  // TODO get errors back
  context.log('Cat-worker started ----------------', req.body)
  try {
    const data = await workerGetClassWeek(req, context)
    console.warn('jobs done', data)
    // context.res = { status: 200, body: response }
    const response = {}
    data.forEach(d => {
      if(response[d.name]){
        response[d.name].push(d)
      } else {
        response[d.name] = [d]
      }
    })
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
}
