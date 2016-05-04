'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _elasticsearch = require('elasticsearch');

var _elasticsearch2 = _interopRequireDefault(_elasticsearch);

var _config = require('./config');

var _config2 = _interopRequireDefault(_config);

var _r = require('./r');

var _r2 = _interopRequireDefault(_r);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

/**
 * TODO: create db create elasticsearch at the same time
 * TODO: backfill
 */

class DB {
  use(dbName) {
    console.log(`use(${ dbName })`);
    this[dbName] = this[dbName] || {};
    this._currentDatabase = dbName;
    return this;
  }

  table(tableName) {
    console.log(`table(${ tableName })`);
    if (!this._currentDatabase) throw new Error('DB.use(dbName) before .table()');
    this[this._currentDatabase][tableName] = this[this._currentDatabase][tableName] || new Table(this._currentDatabase, tableName);
    return this[this._currentDatabase][tableName];
  }

  init() {
    var _this = this;

    return _asyncToGenerator(function* () {
      // 取得不包含"rethinkdb"的db列表
      const dbList = yield _r2.default.dbList().filter(_r2.default.row.ne('rethinkdb'));
      let ctx = _this;

      // initialize table changefeeds register
      for (let i = 0; i < dbList.length; i += 1) {
        let db = dbList[i];
        console.log('@@@@@@@@@', db);
        let tableList = yield _r2.default.db(db).tableList();
        for (let j = 0; j < tableList.length; j += 1) {
          let tableName = tableList[j];
          yield ctx.use(db).table(tableName).createCursor();
        }
      }

      // initialize table_config -> table create changefeeds
      _this._newDBFeeds = yield _r2.default.db('rethinkdb').table('db_config').changes().filter({ old_val: null });

      _this._newDBFeeds.each(function () {
        var ref = _asyncToGenerator(function* (err, data) {
          if (err) throw Error(err);
          console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@', data);
          let dbName = data.new_val.name;

          let client = new _elasticsearch2.default.Client({ host: `${ _config2.default.elasticsearch.host }:${ _config2.default.elasticsearch.port }` });
          yield client.indices.create({ index: dbName });
        });

        return function (_x, _x2) {
          return ref.apply(this, arguments);
        };
      }());

      _this._newTableFeeds = yield _r2.default.db('rethinkdb').table('table_config').changes().filter({ old_val: null });
      _this._newTableFeeds.each(function () {
        var ref = _asyncToGenerator(function* (err, data) {
          if (err) throw new Error(err);
          var _data$new_val = data.new_val;
          let db = _data$new_val.db;
          let table = _data$new_val.name;

          console.log(`table create db ${ db } table ${ table }`);
          ctx.use(db);
          yield ctx.table(table).createCursor();
        });

        return function (_x3, _x4) {
          return ref.apply(this, arguments);
        };
      }(), console.log);

      // initialize table_config -> table drop changefeeds
      _this._dropTableFeeds = yield _r2.default.db('rethinkdb').table('table_config').changes().filter({ new_val: null });
      _this._dropTableFeeds.each(function () {
        var ref = _asyncToGenerator(function* (err, data) {
          if (err) return console.error(err);
          var _data$old_val = data.old_val;
          let db = _data$old_val.db;
          let table = _data$old_val.name;

          console.log(`table dropped db:${ db } table:${ table }`);
          ctx.use(db);
          yield ctx.table(table).close();
          delete ctx[db][table];
        });

        return function (_x5, _x6) {
          return ref.apply(this, arguments);
        };
      }());

      return _this;
    })();
  }
}

exports.default = DB;
class Table {
  constructor(db, table) {
    this.db = db;
    this.table = table;
  }
  createCursor() {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      console.log('createCursor()');
      yield _r2.default.db(_this2.db).table(_this2.table).wait({ waitFor: 'ready_for_writes' });
      _this2.cursor = yield _r2.default.db(_this2.db).table(_this2.table).changes();
      let db = _this2.db;
      let table = _this2.table;

      _this2.cursor.each((err, data) => {
        if (err) console.log(`disconnect from database ${ db } table ${ table }`);
        processData(db, table, data);
      }, doneProcessing);
    })();
  }

  close() {
    this.cursor.close();
  }
}

let processData = function () {
  var ref = _asyncToGenerator(function* (db, table, data) {
    let client = new _elasticsearch2.default.Client({ host: `${ _config2.default.elasticsearch.host }:${ _config2.default.elasticsearch.port }` });

    if (data.new_val && data.old_val) {
      // update

      let result = yield client.index({
        index: db,
        type: table,
        id: data.new_val.id,
        body: data.new_val,
        parent: data.new_val.__parent
      });
      console.log(result);
    } else if (data.new_val) {
      // create data
      console.log(`database ${ db } table ${ table } on data create`);
      let result = yield client.create({
        index: db,
        type: table,
        id: data.new_val.id,
        body: data.new_val,
        parent: data.new_val.__parent
      });
      console.log(result);
    } else if (data.old_val) {
      // delete data
      console.log(`database ${ db } table ${ table } on data delete`);
      let result = yield client.delete({
        index: db,
        type: table,
        id: data.old_val.id,
        parent: data.old_val.__parent
      });
      console.log(result);
    }
  });

  return function processData(_x7, _x8, _x9) {
    return ref.apply(this, arguments);
  };
}();

function doneProcessing() {
  console.log('done processing');
}