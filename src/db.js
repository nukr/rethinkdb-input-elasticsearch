import elasticsearch from 'elasticsearch'
import r from './r'

/**
 * TODO: create db create elasticsearch at the same time
 * TODO: backfill
 */

export default class DB {
  use (dbName) {
    console.log(`use(${dbName})`)
    this[dbName] = this[dbName] || {}
    this._currentDatabase = dbName
    return this
  }

  table (tableName) {
    console.log(`table(${tableName})`)
    if (!this._currentDatabase) throw new Error('DB.use(dbName) before .table()')
    this[this._currentDatabase][tableName] =
      this[this._currentDatabase][tableName] ||
      new Table(this._currentDatabase, tableName)
    return this[this._currentDatabase][tableName]
  }

  async init () {
    // 取得不包含"rethinkdb"的db列表
    const dbList = await r.dbList().filter(r.row.ne('rethinkdb'))
    let ctx = this

    // initialize table changefeeds register
    for (let i = 0; i < dbList.length; i += 1) {
      let db = dbList[i]
      console.log('@@@@@@@@@', db)
      let tableList = await r.db(db).tableList()
      for (let j = 0; j < tableList.length; j += 1) {
        let tableName = tableList[j]
        await ctx.use(db).table(tableName).createCursor()
      }
    }

    // initialize table_config -> table create changefeeds
    this._newDBFeeds = await r
      .db('rethinkdb')
      .table('db_config')
      .changes()
      .filter({old_val: null})

    this._newDBFeeds.each(async (err, data) => {
      if (err) throw Error(err)
      console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@', data)
      let { name: dbName } = data.new_val
      let client = new elasticsearch.Client({host: 'elasticsearch:9200'})
      await client.indices.create({index: dbName})
    })

    this._newTableFeeds = await r
      .db('rethinkdb')
      .table('table_config')
      .changes()
      .filter({old_val: null})
    this._newTableFeeds.each(async (err, data) => {
      if (err) throw new Error(err)
      let { db, name: table } = data.new_val
      console.log(`table create db ${db} table ${table}`)
      ctx.use(db)
      await ctx.table(table).createCursor()
    }, console.log)

    // initialize table_config -> table drop changefeeds
    this._dropTableFeeds = await r.db('rethinkdb').table('table_config').changes().filter({new_val: null})
    this._dropTableFeeds.each(async (err, data) => {
      if (err) return console.error(err)
      let { db, name: table } = data.old_val
      console.log(`table dropped db:${db} table:${table}`)
      ctx.use(db)
      await ctx.table(table).close()
      delete ctx[db][table]
    })

    return this
  }
}

class Table {
  constructor (db, table) {
    this.db = db
    this.table = table
  }
  async createCursor () {
    console.log('createCursor()')
    await r.db(this.db).table(this.table).wait({waitFor: 'ready_for_writes'})
    this.cursor = await r.db(this.db).table(this.table).changes()
    let { db, table } = this
    this.cursor.each((err, data) => {
      if (err) console.log(`disconnect from database ${db} table ${table}`)
      processData(db, table, data)
    }, doneProcessing)
  }

  close () {
    this.cursor.close()
  }
}

async function processData (db, table, data) {
  let client = new elasticsearch.Client({host: 'elasticsearch:9200'})

  if (data.new_val && data.old_val) {
    // update

    let result = await client.index({
      index: db,
      type: table,
      id: data.new_val.id,
      body: data.new_val
    })
    console.log(result)
  } else if (data.new_val) {
    // create data
    console.log(`database ${db} table ${table} on data create`)
    let result = await client.create({
      index: db,
      type: table,
      id: data.new_val.id,
      body: data.new_val,
      parent: data.new_val.__parent
    })
    console.log(result)
  } else if (data.old_val) {
    // delete data
    console.log(`database ${db} table ${table} on data delete`)
    let result = await client.delete({
      index: db,
      type: table,
      id: data.old_val.id
    })
    console.log(result)
  }
}

function doneProcessing () {
  console.log('done processing')
}
