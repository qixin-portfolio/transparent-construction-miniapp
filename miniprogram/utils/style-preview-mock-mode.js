function mockModeEnabled(options = {}, optionName = 'mock') {
  if (String(options[optionName] || '') !== '1') return false
  // Unit tests do not provide system info; real clients must still be DevTools.
  if (typeof wx.getSystemInfoSync !== 'function') return true
  return wx.getSystemInfoSync().platform === 'devtools'
}

module.exports = { mockModeEnabled }
