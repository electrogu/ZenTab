browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    let extensionName = "ZenTab"
  if (message.type === "save_tabs") {
    (async () => {
      try {
        const tabs = await browser.tabs.query({ currentWindow: true, pinned: false });

        // Filter out pinned tabs and collect tab info
        const tabData = tabs
            .filter(tab => tab.title != extensionName)
          .map(tab => ({
            title: tab.title,
            url: tab.url,
            favIconUrl: tab.favIconUrl || ""
          }));

        if(tabs.length == 0 || (tabs[0].title == extensionName && tabs[1] == undefined) || (tabs[0] == undefined)){
            sendResponse({ success: true });
            return true;  
        } 
        // Get existing saved groups
        const { savedGroups = [] } = await browser.storage.local.get("savedGroups");

        // Add new group with timestamp
        savedGroups.push({
          timestamp: Date.now(),
          tabs: tabData
        });

        // Save back to storage
        await browser.storage.local.set({ savedGroups });

        // Close all unpinned tabs
        const unpinnedTabIds = tabs.filter(tab => !tab.pinned).filter(tab => tab.title != extensionName).map(tab => tab.id);
        await browser.tabs.remove(unpinnedTabIds);

        sendResponse({ success: true });
      } catch (err) {
        console.error("Error saving tabs:", err);
        sendResponse({ success: false, error: err.message });
      }
    })();

    return true; // Keep the message channel open for async sendResponse
  }
});


browser.browserAction.onClicked.addListener(() => {
  browser.tabs.create({ url: browser.runtime.getURL("index.html") });
});

