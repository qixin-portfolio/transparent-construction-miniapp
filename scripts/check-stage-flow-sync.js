const fs = require('node:fs')
const path = require('node:path')
const { targets, generatedContent } = require('./sync-stage-flow')

const root = path.resolve(__dirname, '..')
const mismatches = []

targets.forEach(([source, destinationPaths]) => {
  const expected = generatedContent(source)
  destinationPaths.forEach((destination) => {
    const actual = fs.readFileSync(path.join(root, destination), 'utf8')
    if (actual !== expected) mismatches.push(`${destination} != ${source}`)
  })
})

if (mismatches.length) {
  console.error(`Generated runtime files are out of sync:\n${mismatches.join('\n')}`)
  process.exitCode = 1
} else {
  console.log(`Stage runtime files are synchronized (${targets.reduce((count, [, files]) => count + files.length, 0)} files)`)
}

module.exports = { mismatches }
