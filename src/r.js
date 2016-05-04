import rethinkdbdash from 'rethinkdbdash'
import config from './config'

export default rethinkdbdash({host: config.rethinkdb.host})
