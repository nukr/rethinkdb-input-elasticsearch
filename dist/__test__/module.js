'use strict';

var _ava = require('ava');

var _ava2 = _interopRequireDefault(_ava);

require('babel-core/register');

var _module2 = require('../module');

var _module3 = _interopRequireDefault(_module2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _ava2.default)('hello world', t => {
  t.same('hello world', (0, _module3.default)());
});

(0, _ava2.default)('foo', t => {
  t.fail();
});