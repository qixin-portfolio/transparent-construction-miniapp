const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const { runProductionCheck, outDir } = require('./prod-check')

const rootDir = path.resolve(__dirname, '..')
const zipPath = path.join(rootDir, 'shengjingjc-geo-prod-ready.zip')

const result = runProductionCheck({ writeReport: true })
if (!result.deployable) {
  process.exit(1)
}

if (fs.existsSync(zipPath)) fs.rmSync(zipPath, { force: true })
execFileSync('zip', ['-qr', zipPath, '.'], {
  cwd: outDir,
  stdio: 'inherit'
})

console.log(`Generated production package at ${zipPath}`)
