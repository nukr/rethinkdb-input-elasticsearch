import test from 'ava'
import 'babel-core/register'
import module from '../module'

test('hello world', t => {
  t.same('hello world', module())
})

test('foo', t => {
  t.fail()
})
