'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = {
  rethinkdb: {
    host: process.env.RETHINKDB_HOST || 'localhost',
    port: process.env.RETHINKDB_PORT || 28015
  },
  elasticsearch: {
    host: process.env.ELASTICSEARCH_HOST || 'localhost',
    port: process.env.ELASTICSEARCH_PORT || 9200
  }
};