//File: background_scripts/background.js
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({tabId: tab.id});
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setOptions({
    tabId: null,
    path: 'sidebar/sidebar.html',
    enabled: true
  });
});

function extractData(tabId, sendResponse, shouldRefresh = false) {
  if (shouldRefresh) {
    chrome.tabs.reload(tabId, {}, function() {
      chrome.tabs.onUpdated.addListener(function listener(updatedTabId, info) {
        if (updatedTabId === tabId && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          chrome.tabs.sendMessage(tabId, {action: "extract"}, sendResponse);
        }
      });
    });
  } else {
    chrome.tabs.sendMessage(tabId, {action: "extract"}, function(response) {
      if (response && response.error === "Fields not found") {
        console.log("Fields not found, trying with refresh");
        extractData(tabId, sendResponse, true);
      } else {
        sendResponse(response);
      }
    });
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extract") {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      let activeTab = tabs[0];
      extractData(activeTab.id, sendResponse);
    });
    return true;  // Indicates that we will send a response asynchronously
  }
});