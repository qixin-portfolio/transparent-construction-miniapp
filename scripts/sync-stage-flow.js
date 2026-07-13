const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const HEADER = '// GENERATED FILE - DO NOT EDIT. Source: shared/\n'

const targets = [
  ['shared/stage-flow.js', [
    'miniprogram/utils/stage-flow.js',
    'cloudfunctions/submitStageLog/stage-flow.js',
    'cloudfunctions/reviewStageLog/stage-flow.js'
  ]],
  ['shared/owner-notice.js', [
    'cloudfunctions/submitStageLog/owner-notice.js',
    'cloudfunctions/reviewStageLog/owner-notice.js'
  ]],
  ['cloudfunctions/submitStageLog/access.js', [
    'cloudfunctions/reviewStageLog/access.js'
  ]]
]

function generatedContent(sourcePath) {
  return HEADER + fs.readFileSync(path.join(root, sourcePath), 'utf8')
}

function sync() {
  targets.forEach(([source, destinationPaths]) => {
    const content = generatedContent(source)
    destinationPaths.forEach((destination) => {
      fs.writeFileSync(path.join(root, destination), content)
    })
  })
}

if (require.main === module) sync()

module.exports = { HEADER, targets, generatedContent, sync }
