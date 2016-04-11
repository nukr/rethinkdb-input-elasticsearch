import { spawn } from 'child_process'
import path from 'path'
import chokidar from 'chokidar'

function spawnServer () {
  return spawn('node', [path.join(__dirname, './app')], {stdio: 'inherit'})
}

function restartServer (server) {
  return function () {
    console.log('restart')
    if (server) server.kill('SIGKILL')
    server = spawnServer()
  }
}

const env = process.env.NODE_ENV || 'development'

if (env === 'development') {
  let server = spawnServer()

  chokidar.watch(path.join(__dirname, '../src'), {
    ignored: /[\/\\]\./,
    ignoreInitial: true,
    usePolling: true
  }).on('add', restartServer(server))
    .on('addDir', restartServer(server))
    .on('change', restartServer(server))
    .on('unlink', restartServer(server))
    .on('unlinkDir', restartServer(server))
} else {
  spawnServer()
}
