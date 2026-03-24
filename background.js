/**
 * Thunderbird LLM Mail Sorter - Background Script
 * 
 * This script handles the core email sorting functionality using local LLMs.
 * It communicates with the LLM API, processes emails, and moves them to appropriate folders.
 */

// Global configuration state
const CONFIG = {
  lmStudioEndpoint: window.API_CONFIG.DEFAULT_ENDPOINT,
  delayBetweenRequests: window.API_CONFIG.DELAY_BETWEEN_REQUESTS,
  llmModel: null
};

/**
 * Selects the LLM model to use for categorization
 * Uses the configured model or auto-selects the first available one
 * @returns {string|null} The selected model ID or null if none available
 */
async function selectModel() {
  if (CONFIG.llmModel) return CONFIG.llmModel;
  
  const models = await window.API.fetchAvailableModels(CONFIG.lmStudioEndpoint);
  if (models.length === 0) {
    console.error("No models available in LM Studio");
    return null;
  }
  
  CONFIG.llmModel = models[0].id;
  console.log("Auto-selected model:", CONFIG.llmModel);
  return CONFIG.llmModel;
}

/**
 * Extracts relevant content from an email message
 * @param {number} messageId - The Thunderbird message ID
 * @returns {Object|null} Object with subject, from, and bodyText, or null if failed
 */
async function extractMessageContent(messageId) {
  try {
    const full = await messenger.messages.getFull(messageId);
    const subject = full.headers.subject?.[0] || "(no subject)";
    const from = full.headers.from?.[0] || "(no sender)";
    
    let bodyText = "";
    if (full.plainTextBody) {
      // Limit body text to avoid token limits and improve performance
      bodyText = full.plainTextBody.substring(0, 500);
    }
    
    return { subject, from, bodyText };
  } catch (error) {
    console.error("Error extracting message content:", error);
    return null;
  }
}

/**
 * Recursively collects all folders from an account, including subfolders
 * @param {number} accountId - The Thunderbird account ID
 * @returns {Array} Array of folder objects
 */
async function getAccountFolders(accountId) {
  try {
    const accounts = await messenger.accounts.list();
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) {
      console.warn("Account not found:", accountId);
      return [];
    }
    
    const folders = [];
    
    /**
     * Recursive function to collect folders and subfolders
     * @param {Array} folderList - List of folders to process
     */
    function collectFolders(folderList) {
      for (const folder of folderList) {
        folders.push(folder);
        if (folder.subFolders && folder.subFolders.length > 0) {
          collectFolders(folder.subFolders);
        }
      }
    }
    
    if (account.folders) {
      collectFolders(account.folders);
    }
    
    return folders;
  } catch (error) {
    console.error("Error getting account folders:", error);
    return [];
  }
}

/**
 * Categorizes an email using the LLM API
 * @param {string} subject - Email subject
 * @param {string} bodyText - Email body text
 * @param {Array} folders - Array of folder names available
 * @param {string} customPrompt - Custom prompt template (optional)
 * @returns {Object|null} Categorization result with category, confidence, and model
 */
async function categorizeMail(subject, bodyText, folders, customPrompt) {
  try {
    const model = await selectModel();
    if (!model) {
      console.error("No LLM model available");
      return null;
    }

    // Use the API module for categorization
    const result = await window.API.categorizeEmail(CONFIG.lmStudioEndpoint, model, subject, bodyText, folders, customPrompt);
    if (!result) return null;
    
    return {
      category: result.category || "OTHER",
      confidence: result.confidence || 0.0,
      model: model
    };
  } catch (error) {
    console.error("Error categorizing mail:", error);
    return null;
  }
}

// Message listener from popup
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getModels") {
    (async () => {
      try {
        const endpoint = request.endpoint || CONFIG.lmStudioEndpoint;
        const models = await window.API.fetchAvailableModels(endpoint);
        sendResponse({ success: true, models: models });
      } catch (error) {
        console.error("Error fetching models:", error.message, error.stack);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  } else if (request.action === "getAccounts") {
    (async () => {
      try {
        const accounts = await messenger.accounts.list();
        const accountList = accounts.map(account => ({
          id: account.id,
          name: account.name,
          type: account.type
        }));
        sendResponse({ success: true, accounts: accountList });
      } catch (error) {
        console.error("Error getting accounts:", error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  } else if (request.action === "generatePrompt") {
    (async () => {
      try {
        const { accountId, model, endpoint } = request;
        
        // Get folders for the account
        const folders = await getAccountFolders(accountId);
        if (folders.length === 0) {
          sendResponse({ success: false, error: window.MESSAGES.NO_FOLDERS });
          return;
        }
        
        // Generate the prompt using the API module
        const generatedPrompt = await window.API.generateSortingPrompt(endpoint, model, folders);
        
        if (!generatedPrompt) {
          sendResponse({ success: false, error: window.MESSAGES.EMPTY_RESPONSE });
          return;
        }

        sendResponse({ success: true, generatedPrompt: generatedPrompt.trim() });
      } catch (error) {
        console.error("Error generating prompt:", error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  } else if (request.action === "sortMails") {
    (async () => {
      try {
        const messageIds = request.messageIds || [];
        if (request.endpoint) {
          CONFIG.lmStudioEndpoint = request.endpoint;
        }
        if (request.model) {
          CONFIG.llmModel = request.model;
        }
        let customPrompt = request.customPrompt || "";
        console.log(`Processing ${messageIds.length} emails with model: ${CONFIG.llmModel}`);
        
        // Get account folders from first message
        let accountFolders = [];
        let accountId = null;
        if (messageIds.length > 0) {
          try {
            const firstMessage = await messenger.messages.get(messageIds[0]);
            console.log("First message:", firstMessage);
            console.log("Message folder:", firstMessage.folder);
            if (firstMessage && firstMessage.folder && firstMessage.folder.accountId) {
              accountId = firstMessage.folder.accountId;
              accountFolders = await getAccountFolders(accountId);
              console.log("Available folders:", accountFolders.map(f => f.name));
              
              // Try to load account-specific prompt
              const stored = await browser.storage.local.get(window.STORAGE_KEYS.ACCOUNT_PROMPT(accountId));
              if (stored[window.STORAGE_KEYS.ACCOUNT_PROMPT(accountId)]) {
                customPrompt = stored[window.STORAGE_KEYS.ACCOUNT_PROMPT(accountId)];
                console.log("Using account-specific prompt");
              }
            } else {
              console.warn("Could not get accountId from message");
            }
          } catch (error) {
            console.warn("Could not get account folders:", error);
          }
        }
        
        const folderNames = accountFolders.map(f => f.name);
        const results = [];
        
        for (let i = 0; i < messageIds.length; i++) {
          const msgId = messageIds[i];
          
          const content = await extractMessageContent(msgId);
          if (!content) {
            console.warn(`Skipped email ${msgId} (extraction failed)`);
            continue;
          }
          
          const categorization = await categorizeMail(content.subject, content.bodyText, folderNames, customPrompt);
          
          let moved = false;
          let targetFolder = null;
          if (categorization && categorization.category) {
            // Find the target folder
            console.log(`Available folders: ${accountFolders.map(f => `${f.name} (${f.path || 'no path'})`).join(', ')}`);
            console.log(`Looking for category: ${categorization.category}`);
            targetFolder = accountFolders.find(f => f.name === categorization.category);
            console.log(`Target folder found: ${targetFolder ? `${targetFolder.name} (${targetFolder.path || 'no path'})` : 'none'}`);
            if (targetFolder) {
              try {
                await messenger.messages.move([msgId], targetFolder);
                moved = true;
                console.log(`Moved email ${msgId} to folder: ${targetFolder.name}`);
              } catch (error) {
                console.error(`Failed to move email ${msgId} to ${categorization.category}:`, error);
              }
            } else {
              console.warn(`Target folder not found: ${categorization.category}`);
            }
          }
          
          const result = {
            messageId: msgId,
            subject: content.subject,
            from: content.from,
            categorization: categorization,
            moved: moved,
            targetFolder: targetFolder ? targetFolder.name : null
          };
          
          results.push(result);
          console.log("Categorized:", result);
          
          if (i < messageIds.length - 1) {
            await window.Utils.sleep(CONFIG.delayBetweenRequests);
          }
        }
        
        console.log("Sorting complete. Results:", results);
        sendResponse({ success: true, results: results });
      } catch (error) {
        console.error("Error in sortMails:", error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
});