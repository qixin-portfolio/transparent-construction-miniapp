const test = require('node:test')
const assert = require('node:assert/strict')
const { getPhotoDisplayUrls } = require('../miniprogram/utils/photo-display')

test('review photos prefer temporary URLs over raw file IDs', () => {
  assert.deepEqual(getPhotoDisplayUrls({
    photoFileIDs: ['cloud://raw-1'],
    photoUrls: ['https://temporary.example/photo-1']
  }), [
    'https://temporary.example/photo-1'
  ])
})

test('review photos support object-shaped photos returned by the cloud function', () => {
  assert.deepEqual(getPhotoDisplayUrls({
    photos: [
      { fileID: 'cloud://raw-1', url: 'https://temporary.example/photo-1' },
      { fileID: 'cloud://raw-2', tempFileURL: 'https://temporary.example/photo-2' }
    ]
  }), [
    'https://temporary.example/photo-1',
    'https://temporary.example/photo-2'
  ])
})

test('review photos prefer an object temporary URL when url still contains a cloud ID', () => {
  assert.deepEqual(getPhotoDisplayUrls({
    photos: [{ url: 'cloud://raw-1', tempFileURL: 'https://temporary.example/photo-1' }]
  }), ['https://temporary.example/photo-1'])
})

test('review photos keep legacy string arrays as a fallback', () => {
  assert.deepEqual(getPhotoDisplayUrls({ photos: ['https://legacy.example/photo-1'] }), [
    'https://legacy.example/photo-1'
  ])
})
