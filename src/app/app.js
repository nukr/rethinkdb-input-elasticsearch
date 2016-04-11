import DB from './db'

const db = new DB()

;(async () => {
  await db.init()
})().catch((err) => {
  console.log('*********************************')
  console.log(err)
  console.log('*********************************')
})
