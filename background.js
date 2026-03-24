/**
 * Thunderbird LLM Mail Sorter - Background Script
 * 
 * This script handles the core email sorting functionality using local LLMs.
 * It communicates with the LLM API, processes emails, and moves them to appropriate folders.
 */

// Default LM Studio endpoint (can be configured by user)
const DEFAULT_ENDPOINT = "http://localhost:1234/v1";

const CONFIG = {
  lmStudioEndpoint: DEFAULT_ENDPOINT,
  delayBetweenRequests: 500, // Delay between API calls to avoid rate limiting
  llmModel: null
};

/**
 * Simple sleep function to add delays between API requests
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after the delay
 */
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetches available models from the LM Studio API
 * @returns {Array} Array of available model objects
 */
async function getAvailableModels() {
  try {
    const response = await fetch(`${CONFIG.lmStudioEndpoint}/models`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("Error fetching models:", error);
    return [];
  }
}

/**
 * Selects the LLM model to use for categorization
 * Uses the configured model or auto-selects the first available one
 * @returns {string|null} The selected model ID or null if none available
 */
async function selectModel() {
  if (CONFIG.llmModel) return CONFIG.llmModel;
  
  const models = await getAvailableModels();
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

    let prompt = customPrompt || `Categorize this email into one of these categories: WORK, PERSONAL, SPAM, NEWSLETTER, OTHER.
    
Subject: ${subject}
Body: ${bodyText || "(no body)"}

Respond in JSON format ONLY, like: {"category": "WORK", "confidence": 0.95}`;

    // Replace placeholders
    prompt = prompt.replace("{subject}", subject);
    prompt = prompt.replace("{body}", bodyText || "(no body)");
    prompt = prompt.replace("{folders}", folders.join(", "));

    const response = await fetch(`${CONFIG.lmStudioEndpoint}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3
      })
    });

    if (!response.ok) {
      console.error("LLM API error:", response.status);
      return null;
    }

    const data = await response.json();
    const responseText = data.choices?.[0]?.message?.content || "";
    
    console.log("LLM raw response:", responseText); // Add this log
    
    // Defensief JSON parsing
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn("No JSON found in response:", responseText);
      return null;
    }

    const result = JSON.parse(jsonMatch[0]);
    console.log("Parsed categorization:", result); // Add this log
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
        const url = endpoint.endsWith("/v1") ? endpoint : endpoint + "/v1";
        const modelsUrl = `${url}/models`;
        console.log("Fetching models from:", modelsUrl);
        
        const response = await fetch(modelsUrl, { mode: "cors" });
        console.log("Fetch response status:", response.status);
        
        if (!response.ok) {
          sendResponse({ success: false, error: "API error: " + response.status });
          return;
        }
        
        const data = await response.json();
        console.log("Models fetched successfully:", data);
        sendResponse({ success: true, models: data.data || [] });
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
          sendResponse({ success: false, error: "No folders found for this account" });
          return;
        }
        
        // Create prompt for LLM to generate sorting rules
        const generationPrompt = `Based on these email folder names: ${folders.join(", ")}

Create a concise email sorting prompt that includes:

1. For each folder, a brief rule: "Folder: {folder_name} -> {sorting_rule}"
2. Instructions for the LLM to analyze email subject and body
3. Choose the most appropriate folder based on the rules
4. Use placeholders {subject}, {body}, {folders}
5. Output only JSON with "category" and "confidence" fields

Generate ONLY the prompt text that another LLM can use directly to sort emails. Do not include code, documentation, or examples - just the prompt.`;

        // Send to LLM
        const url = endpoint.endsWith("/v1") ? endpoint : endpoint + "/v1";
        const response = await fetch(`${url}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: model,
            messages: [{ role: "user", content: generationPrompt }],
            temperature: 0.7,
            max_tokens: 1000
          })
        });

        if (!response.ok) {
          sendResponse({ success: false, error: "LLM API error: " + response.status });
          return;
        }

        const data = await response.json();
        const generatedPrompt = data.choices?.[0]?.message?.content || "";
        
        if (!generatedPrompt.trim()) {
          sendResponse({ success: false, error: "LLM returned empty response" });
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
              const stored = await browser.storage.local.get(`prompt_${accountId}`);
              if (stored[`prompt_${accountId}`]) {
                customPrompt = stored[`prompt_${accountId}`];
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
            await sleep(CONFIG.delayBetweenRequests);
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