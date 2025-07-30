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

    // Migration: set default name for groups missing the 'name' property
    let updated = false;
    savedGroups.forEach((group, idx) => {
      if (!group.name) {
        group.name = `Group ${idx + 1}`;
        updated = true;
      }
    });
    if (updated) {
      await browser.storage.local.set({ savedGroups });
    }

    container.innerHTML = "";

    if (savedGroups.length === 0) {
      container.textContent = "No saved tabs yet.";
      return;
    }

    // Iterate in reverse order so newest group on top
    savedGroups.slice().reverse().forEach((group, index) => {
      const timestampDiv = document.createElement("div");
      timestampDiv.className = "save-timestamp";

      // Group name input (always on its own line)
      const nameInput = document.createElement("textarea");
      nameInput.value = group.name || `Group`;
      nameInput.className = "group-name-input";
      nameInput.rows = 1; // Start with 1 row
      nameInput.spellcheck = false;  // Disable spell check
      nameInput.autocomplete = "off"; // Also disable autocomplete if desired

      // Auto-resize function for textarea
      function autoResizeTextarea(textarea) {
        // Reset height to measure content
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
        
        // Dynamically adjust width based on content
        const tempSpan = document.createElement('span');
        tempSpan.style.visibility = 'hidden';
        tempSpan.style.position = 'absolute';
        tempSpan.style.fontSize = window.getComputedStyle(textarea).fontSize;
        tempSpan.style.fontFamily = window.getComputedStyle(textarea).fontFamily;
        tempSpan.style.fontWeight = window.getComputedStyle(textarea).fontWeight;
        tempSpan.style.whiteSpace = 'pre';
        tempSpan.textContent = textarea.value || 'Group';
        document.body.appendChild(tempSpan);
        
        const textWidth = tempSpan.offsetWidth;
        document.body.removeChild(tempSpan);
        
        // Calculate container width and available space
        const container = textarea.closest('.save-timestamp');
        const containerWidth = container.offsetWidth;
        const maxWidth = Math.floor(containerWidth * 0.6); // 60% max
        const minSpaceForMeta = 200; // Space needed for timestamp + actions
        
        // Set width: content-based but limited
        const idealWidth = Math.max(40, textWidth + 20);
        const availableWidth = containerWidth - minSpaceForMeta - 24; // 24px for gaps
        const newWidth = Math.min(idealWidth, Math.min(maxWidth, availableWidth));
        
        textarea.style.width = newWidth + 'px';
      }

      nameInput.addEventListener('input', function() {
        autoResizeTextarea(this);
      });

      nameInput.addEventListener('blur', async function() {
        const originalIndex = savedGroups.length - 1 - index;
        savedGroups[originalIndex].name = this.value;
        await browser.storage.local.set({ savedGroups });
      });

      // Prevent Enter key from creating new lines (optional)
      nameInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.blur(); // Save and lose focus
        }
      });

      // Initial resize
      setTimeout(() => autoResizeTextarea(nameInput), 0);

      // Make sure to call autoResizeInput after the timestampDiv is added to DOM:
      timestampDiv.appendChild(nameInput);
      container.appendChild(timestampDiv); // Add this before autoResizeInput

      // Meta container (timestamp + actions on second line)
      const metaContainer = document.createElement("div");
      metaContainer.className = "group-meta";

      // Timestamp
      const date = new Date(group.timestamp);
      const timeText = document.createElement("span");
      timeText.textContent = `Saved on ${date.toLocaleString()}`;
      timeText.className = "group-time";
      metaContainer.appendChild(timeText);

      // Actions container
      const actionsContainer = document.createElement("div");
      actionsContainer.className = "group-actions";

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
      actionsContainer.appendChild(deleteGroupLink);

      // Restore All link
      const restoreAllLink = document.createElement("a");
      restoreAllLink.className = "action-link";
      restoreAllLink.href = "#";
      restoreAllLink.textContent = "Restore All";
      restoreAllLink.onclick = (e) => {
        e.preventDefault();
        restoreGroup(group.tabs);
      };
      actionsContainer.appendChild(restoreAllLink);

      metaContainer.appendChild(actionsContainer);
      timestampDiv.appendChild(metaContainer);

      container.appendChild(timestampDiv);
      
      // Continue with your tabs rendering...
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
