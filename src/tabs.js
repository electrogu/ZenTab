document.addEventListener("DOMContentLoaded", () => {
  const saveBtn = document.getElementById("saveTabs");
  const container = document.getElementById("savedTabs");

  // Helper functions moved inside here so they can access renderSavedTabs directly
  async function deleteGroup(groupTimestamp) {
    let { savedGroups = [] } = await browser.storage.local.get("savedGroups");
    savedGroups = savedGroups.filter(group => group.timestamp !== groupTimestamp);
    await browser.storage.local.set({ savedGroups });
    renderSavedTabs();
  }

  function restoreGroup(tabs) {
    tabs.forEach(tab => {
      if (
        tab.url.startsWith("about:") ||
        tab.url.startsWith("moz-extension:") ||
        tab.url.startsWith("chrome:")
      ) {
        navigator.clipboard.writeText(tab.url).then(() => {
          alert("One or more URLs copied to clipboard (cannot open internal URLs).");
        });
      } else {
        browser.tabs.create({ url: tab.url });
      }
    });
  }

  saveBtn.addEventListener("click", () => {
    browser.runtime.sendMessage({ type: "save_tabs" }).then(response => {
      if (response?.success) {
        renderSavedTabs();
      } else {
        console.error("Failed to save tabs");
      }
    });
  });

  renderSavedTabs();

  async function renderSavedTabs() {
    const { savedGroups = [] } = await browser.storage.local.get("savedGroups");
    container.innerHTML = "";

    if (savedGroups.length === 0) {
      container.textContent = "No saved tabs yet.";
      return;
    }

    // Iterate in reverse order so newest group on top
    savedGroups.slice().reverse().forEach((group, index) => {
      // Container for timestamp + actions - flex with space-between
      const timestampDiv = document.createElement("div");
      timestampDiv.className = "save-timestamp";
      timestampDiv.style.display = "flex";
      timestampDiv.style.alignItems = "center";
      timestampDiv.style.justifyContent = "flex-start"; // align left so timestamp and actions are close

      const date = new Date(group.timestamp);

      // Left side: timestamp text
      const timeText = document.createElement("span");
      timeText.textContent = `Saved on ${date.toLocaleString()}`;
      timeText.style.marginRight = "12px";

      // Actions container: group links side by side
      const actionsContainer = document.createElement("span");

      // Delete Group link
      const deleteGroupLink = document.createElement("a");
      deleteGroupLink.className = "action-link";
      deleteGroupLink.href = "#";
      deleteGroupLink.textContent = "Delete Group";
      deleteGroupLink.onclick = (e) => {
        e.preventDefault();
        if (confirm("Are you sure you want to delete this entire group of tabs?")) {
          deleteGroup(group.timestamp);
        }
      };

      // Restore All links
      const restoreAllLink = document.createElement("a");
      restoreAllLink.className = "action-link";
      restoreAllLink.href = "#";
      restoreAllLink.textContent = "Restore All";
      restoreAllLink.onclick = (e) => {
        e.preventDefault();
        restoreGroup(group.tabs);
      };

      actionsContainer.appendChild(deleteGroupLink);
      actionsContainer.appendChild(restoreAllLink);

      timestampDiv.appendChild(timeText);
      timestampDiv.appendChild(actionsContainer);

      container.appendChild(timestampDiv);

      // Render each tab (same as before)...
      group.tabs.forEach(tab => {
        const tabDiv = document.createElement("div");
        tabDiv.className = "tab-item";

        const favicon = document.createElement("img");
        favicon.className = "tab-favicon";
        let faviconUrl = tab.favIconUrl || "icons/web.png";
        if (faviconUrl.startsWith("chrome://")) {
          faviconUrl = "icons/web.png";
        }
        favicon.src = faviconUrl;

        const link = document.createElement("a");
        link.className = "tab-title";
        link.href = "#";
        link.textContent = tab.title || tab.url;
        link.onclick = (e) => {
          e.preventDefault();
          if (
            tab.url.startsWith("about:") ||
            tab.url.startsWith("moz-extension:") ||
            tab.url.startsWith("chrome:")
          ) {
            navigator.clipboard.writeText(tab.url).then(() => {
              alert("URL copied to clipboard!");
            }).catch(err => {
              console.error("Failed to copy URL: ", err);
            });
          } else {
            browser.tabs.create({ url: tab.url });
          }
        };

        const deleteBtn = document.createElement("img");
        deleteBtn.className = "delete-btn";
        if (localStorage.getItem("darkTheme") === "enabled")
          deleteBtn.src = "icons/delete-dark.png";
        else
          deleteBtn.src = "icons/delete.png";
        deleteBtn.title = "Remove tab";
        deleteBtn.onclick = () => deleteTab(group.timestamp, tab.url);

        const copyBtn = document.createElement("img");
        copyBtn.className = "copy-btn";
        if (localStorage.getItem("darkTheme") === "enabled")
          copyBtn.src = "icons/copy-dark.png";
        else
          copyBtn.src = "icons/copy.png";
        copyBtn.title = "Copy URL to clipboard";
        copyBtn.onclick = () => {
          navigator.clipboard.writeText(tab.url).then(() => {
            alert("URL copied to clipboard!");
          }).catch(err => {
            console.error("Failed to copy: ", err);
          });
        };

        tabDiv.appendChild(copyBtn);
        tabDiv.appendChild(deleteBtn);
        tabDiv.appendChild(favicon);
        tabDiv.appendChild(link);

        container.appendChild(tabDiv);
      });

      if (index < savedGroups.length - 1) {
        const separator = document.createElement("div");
        separator.className = "group-separator";
        container.appendChild(separator);
      }
    });
  }

  async function deleteTab(groupTimestamp, tabUrl) {
    let { savedGroups = [] } = await browser.storage.local.get("savedGroups");

    savedGroups = savedGroups
      .map(group => {
        if (group.timestamp === groupTimestamp) {
          return {
            ...group,
            tabs: group.tabs.filter(tab => tab.url !== tabUrl)
          };
        }
        return group;
      })
      .filter(group => group.tabs.length > 0);

    await browser.storage.local.set({ savedGroups });
    renderSavedTabs();
  }

  const themeToggleBtn = document.getElementById("themeToggleBtn");

  // Load theme from localStorage or default to light
  if (localStorage.getItem("darkTheme") === "enabled") {
    document.body.classList.add("dark-theme");
  }

  themeToggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark-theme");
    const isDark = document.body.classList.contains("dark-theme");
    localStorage.setItem("darkTheme", isDark ? "enabled" : "disabled");
    themeToggleBtn.textContent = isDark ? "☀️" : "🌙";

    // Update all delete and copy icons
    document.querySelectorAll(".delete-btn").forEach(img => {
      img.src = isDark ? "icons/delete-dark.png" : "icons/delete.png";
    });
    document.querySelectorAll(".copy-btn").forEach(img => {
      img.src = isDark ? "icons/copy-dark.png" : "icons/copy.png";
    });
  });

  // Set initial button icon depending on theme
  if (document.body.classList.contains("dark-theme")) {
    themeToggleBtn.textContent = "☀️";
  } else {
    themeToggleBtn.textContent = "🌙";
  }
});

async function deleteGroup(groupTimestamp) {
  let { savedGroups = [] } = await browser.storage.local.get("savedGroups");
  savedGroups = savedGroups.filter(group => group.timestamp !== groupTimestamp);
  await browser.storage.local.set({ savedGroups });
  renderSavedTabs();
}

function restoreGroup(tabs) {
  tabs.forEach(tab => {
    if (
      tab.url.startsWith("about:") ||
      tab.url.startsWith("moz-extension:") ||
      tab.url.startsWith("chrome:")
    ) {
      // Can't open internal URLs, skip or copy to clipboard instead
      navigator.clipboard.writeText(tab.url).then(() => {
        alert("One or more URLs copied to clipboard (cannot open internal URLs).");
      });
    } else {
      browser.tabs.create({ url: tab.url });
    }
  });
}
