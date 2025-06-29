chrome.runtime.onInstalled.addListener(() => {
  console.log('OpenAPI 3 Client Extension installed')
})

chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage()
})