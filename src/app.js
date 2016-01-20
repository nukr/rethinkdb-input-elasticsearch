import dbs from './dbs'
// import elasticsearch from 'elasticsearch'
// let client = new elasticsearch.Client({host: 'elasticsearch:9200'})

;(async () => {
  await dbs.init()
  // let result = await client.indices.delete({index: 'test'})
})().catch((err) => {
  console.log('*********************************')
  console.log(err)
  console.log('*********************************')
})
