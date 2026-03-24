const sortBtn = document.getElementById("sortBtn");
const statusDiv = document.getElementById("status");
const modelSelect = document.getElementById("modelSelect");
const settingsBtn = document.getElementById("settingsBtn");
const settingsModal = document.getElementById("settingsModal");
const promptInput = document.getElementById("promptInput");
const endpointInput = document.getElementById("endpointInput");
const accountSelect = document.getElementById("accountSelect");
const autoGenerateBtn = document.getElementById("autoGenerateBtn");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const cancelSettingsBtn = document.getElementById("cancelSettingsBtn");
const currentEndpointDisplay = document.getElementById("currentEndpoint");

let currentEndpoint = "http://localhost:1234/v1";
let customPrompt = "";

function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = type;
}

function showModalStatus(message, type) {
  const modalStatusDiv = document.getElementById("modalStatus");
  modalStatusDiv.textContent = message;
  modalStatusDiv.className = type;
}

function displayResults(results) {
  const resultsDiv = document.getElementById("results");
  const resultsContent = document.getElementById("resultsContent");
  
  if (!results || results.length === 0) {
    resultsDiv.style.display = "none";
    return;
  }
  
  let html = "";
  results.forEach(result => {
    const cat = result.categorization;
    const category = cat ? cat.category : "ERROR";
    const confidence = cat ? (cat.confidence * 100).toFixed(1) + "%" : "N/A";
    const model = cat ? cat.model : "N/A";
    const moved = result.moved ? "✓ Moved" : "✗ Not moved";
    const target = result.targetFolder ? ` to ${result.targetFolder}` : "";
    
    html += `<div style="margin-bottom: 8px; padding: 6px; background: white; border-radius: 3px; border-left: 3px solid ${getCategoryColor(category)};">
      <strong>${result.subject}</strong><br>
      <small>From: ${result.from}</small><br>
      <small>Category: <strong>${category}</strong> | Confidence: ${confidence} | Model: ${model}</small><br>
      <small><strong>${moved}${target}</strong></small>
    </div>`;
  });
  
  resultsContent.innerHTML = html;
  resultsDiv.style.display = "block";
}

function getCategoryColor(category) {
  const colors = {
    "WORK": "#2196F3",
    "PERSONAL": "#4CAF50", 
    "SPAM": "#F44336",
    "NEWSLETTER": "#FF9800",
    "OTHER": "#9E9E9E",
    "ERROR": "#607D8B"
  };
  return colors[category] || "#607D8B";
}

function updateEndpointDisplay() {
  currentEndpointDisplay.textContent = currentEndpoint.replace("/v1", "");
}

let currentAccountId = null; // Track which account's prompt we're editing

async function loadSettings() {
  const stored = await browser.storage.local.get(["lmEndpoint", "customPrompt"]);
  if (stored.lmEndpoint) {
    currentEndpoint = stored.lmEndpoint;
    updateEndpointDisplay();
  }
  if (stored.customPrompt) {
    customPrompt = stored.customPrompt;
    promptInput.value = customPrompt;
  } else {
    // Set default prompt
    customPrompt = `Categorize this email into one of these categories: WORK, PERSONAL, SPAM, NEWSLETTER, OTHER.

Subject: {subject}
Body: {body}
Available folders: {folders}

Respond in JSON format ONLY, like: {"category": "WORK", "confidence": 0.95}`;
    promptInput.value = customPrompt;
  }
  
  // Set endpoint input
  endpointInput.value = currentEndpoint.replace("/v1", "");
}

async function loadPromptForAccount(accountId) {
  const stored = await browser.storage.local.get(`prompt_${accountId}`);
  if (stored[`prompt_${accountId}`]) {
    promptInput.value = stored[`prompt_${accountId}`];
    currentAccountId = accountId;
  } else {
    // Load default or current prompt
    promptInput.value = customPrompt;
    currentAccountId = null;
  }
}

async function loadAccounts() {
  try {
    const response = await messenger.runtime.sendMessage({
      action: "getAccounts"
    });
    
    if (response.success) {
      accountSelect.innerHTML = '<option value="">Select an account...</option>';
      response.accounts.forEach(account => {
        const option = document.createElement("option");
        option.value = account.id;
        option.textContent = `${account.name} (${account.type})`;
        accountSelect.appendChild(option);
      });
    } else {
      accountSelect.innerHTML = '<option>Error loading accounts</option>';
    }
  } catch (error) {
    console.error("Error loading accounts:", error);
    accountSelect.innerHTML = '<option>Error loading accounts</option>';
  }
}

async function getModels() {
  try {
    console.log("Requesting models from background script");
    const response = await messenger.runtime.sendMessage({
      action: "getModels",
      endpoint: currentEndpoint
    });
    
    console.log("Models response:", response);
    if (response.success) {
      return response.models || [];
    } else {
      console.error("Error from background:", response.error);
      return [];
    }
  } catch (error) {
    console.error("Error fetching models:", error);
    return [];
  }
}

async function initModels() {
  const models = await getModels();
  console.log("Models returned:", models);
  
  modelSelect.innerHTML = "";
  
  if (models.length === 0) {
    const debugMsg = `No models found. Endpoint: ${currentEndpoint}`;
    console.error(debugMsg);
    showStatus(debugMsg, "error");
    sortBtn.disabled = true;
    modelSelect.innerHTML = '<option>No models available</option>';
  }
  
  models.forEach(model => {
    const option = document.createElement("option");
    option.value = model.id;
    option.textContent = model.id;
    modelSelect.appendChild(option);
  });
  
  showStatus(`${models.length} model(s) available`, "info");
}

settingsBtn.addEventListener("click", async () => {
  settingsModal.style.display = "block";
  showModalStatus("", ""); // Clear status
  await loadAccounts();
});

accountSelect.addEventListener("change", async () => {
  const selectedAccountId = accountSelect.value;
  showModalStatus("", ""); // Clear status
  if (selectedAccountId) {
    await loadPromptForAccount(selectedAccountId);
  } else {
    promptInput.value = customPrompt;
    currentAccountId = null;
  }
});

cancelSettingsBtn.addEventListener("click", () => {
  settingsModal.style.display = "none";
  promptInput.value = customPrompt; // Reset to saved value
  endpointInput.value = currentEndpoint.replace("/v1", ""); // Reset to saved value
});

saveSettingsBtn.addEventListener("click", async () => {
  const endpointValue = endpointInput.value.trim();
  const promptValue = promptInput.value.trim();
  
  if (!endpointValue) {
    showStatus("Please enter an endpoint", "error");
    return;
  }
  
  const normalizedEndpoint = endpointValue.endsWith("/v1") ? endpointValue : endpointValue + "/v1";
  currentEndpoint = normalizedEndpoint;
  
  // Save endpoint
  await browser.storage.local.set({ lmEndpoint: normalizedEndpoint });
  
  // Save prompt - either per account or globally
  if (currentAccountId) {
    await browser.storage.local.set({ [`prompt_${currentAccountId}`]: promptValue });
    customPrompt = promptValue; // Also update global for consistency
  } else {
    customPrompt = promptValue;
    await browser.storage.local.set({ customPrompt: customPrompt });
  }
  
  updateEndpointDisplay();
  settingsModal.style.display = "none";
  showStatus("Settings saved", "success");
  
  setTimeout(() => {
    statusDiv.style.display = "none";
    initModels(); // Refresh models with new endpoint
  }, 1000);
});

// Close modal when clicking outside
settingsModal.addEventListener("click", (e) => {
  if (e.target === settingsModal) {
    settingsModal.style.display = "none";
    promptInput.value = customPrompt;
    endpointInput.value = currentEndpoint.replace("/v1", "");
  }
});

autoGenerateBtn.addEventListener("click", async () => {
  const selectedAccountId = accountSelect.value;
  const selectedModel = modelSelect.value;
  
  if (!selectedAccountId || !selectedModel) {
    alert("Please select an account and ensure a model is loaded.");
    return;
  }
  
  autoGenerateBtn.disabled = true;
  autoGenerateBtn.textContent = "Generating...";
  showModalStatus("", ""); // Clear previous status
  
  try {
    const response = await messenger.runtime.sendMessage({
      action: "generatePrompt",
      accountId: selectedAccountId,
      model: selectedModel,
      endpoint: currentEndpoint
    });
    
    if (response.success) {
      promptInput.value = response.generatedPrompt;
      showModalStatus("Prompt generated successfully! Review and save when ready.", "success");
    } else {
      showModalStatus("Error generating prompt: " + (response.error || "Unknown error"), "error");
    }
  } catch (error) {
    console.error("Error generating prompt:", error);
    showModalStatus("Error generating prompt: " + error.message, "error");
  } finally {
    autoGenerateBtn.disabled = false;
    autoGenerateBtn.textContent = "Auto create sorting rules prompt";
  }
});

sortBtn.addEventListener("click", async () => {
  try {
    sortBtn.disabled = true;
    showStatus("Sorting emails...", "info");
    document.getElementById("results").style.display = "none"; // Hide previous results
    
    const mailTab = await messenger.mailTabs.query({active: true, currentWindow: true});
    if (!mailTab || mailTab.length === 0) {
      showStatus("No mailbox open", "error");
      sortBtn.disabled = false;
      return;
    }
    
    const selectedMessages = await messenger.mailTabs.getSelectedMessages(mailTab[0].id);
    
    if (!selectedMessages || !selectedMessages.messages || selectedMessages.messages.length === 0) {
      showStatus("No emails selected", "error");
      sortBtn.disabled = false;
      return;
    }
    
    const messageIds = selectedMessages.messages.map(msg => msg.id);
    const selectedModel = modelSelect.value;
    
    console.log("Selected message IDs:", messageIds);
    console.log("Selected model:", selectedModel);
    
    const response = await messenger.runtime.sendMessage({
      action: "sortMails",
      messageIds: messageIds,
      model: selectedModel,
      endpoint: currentEndpoint,
      customPrompt: customPrompt
    });
    
    if (!response) {
      showStatus("Error: No response from background script", "error");
      return;
    }
    
    if (response.success) {
      const count = response.results.length;
      const movedCount = response.results.filter(r => r.moved).length;
      showStatus(`✓ ${count} email(s) processed, ${movedCount} moved`, "success");
      console.log("Sort results:", response.results);
      
      // Display detailed results
      displayResults(response.results);
    } else {
      showStatus("Error: " + (response.error || "Unknown error"), "error");
      document.getElementById("results").style.display = "none";
    }
  } catch (error) {
    console.error("Error:", error);
    showStatus("Error: " + error.message, "error");
  } finally {
    sortBtn.disabled = false;
  }
});

// Initialize on popup open
loadSettings().then(() => initModels());
