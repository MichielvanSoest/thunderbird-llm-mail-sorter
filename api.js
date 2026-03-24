/**
 * API functions for LLM communication
 */

/**
 * Fetches available models from the LM Studio API
 * @param {string} endpoint - The API endpoint URL
 * @returns {Promise<Array>} Array of available model objects
 */
async function fetchAvailableModels(endpoint) {
  try {
    const url = endpoint.endsWith("/v1") ? endpoint : endpoint + "/v1";
    const response = await fetch(`${url}/models`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("Error fetching models:", error);
    return [];
  }
}

/**
 * Send a chat completion request to the LLM
 * @param {string} endpoint - The API endpoint URL
 * @param {string} model - The model to use
 * @param {string} prompt - The prompt to send
 * @param {number} temperature - Temperature for response randomness
 * @param {number} maxTokens - Maximum tokens in response
 * @returns {Promise<Object|null>} The API response or null on error
 */
async function sendChatCompletion(endpoint, model, prompt, temperature = 0.3, maxTokens = 1000) {
  try {
    const url = endpoint.endsWith("/v1") ? endpoint : endpoint + "/v1";
    const response = await fetch(`${url}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: prompt }],
        temperature: temperature,
        max_tokens: maxTokens
      })
    });

    if (!response.ok) {
      console.error("LLM API error:", response.status);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error in chat completion:", error);
    return null;
  }
}

/**
 * Categorize an email using the LLM
 * @param {string} endpoint - The API endpoint URL
 * @param {string} model - The model to use
 * @param {string} subject - Email subject
 * @param {string} bodyText - Email body text
 * @param {Array} folders - Array of folder names
 * @param {string} customPrompt - Custom prompt template (optional)
 * @returns {Promise<Object|null>} Categorization result
 */
async function categorizeEmail(endpoint, model, subject, bodyText, folders, customPrompt) {
  const prompt = customPrompt || window.DEFAULT_PROMPTS.CATEGORIZATION;

  // Replace placeholders
  const finalPrompt = prompt
    .replace("{subject}", subject)
    .replace("{body}", bodyText || "(no body)")
    .replace("{folders}", folders.join(", "));

  const response = await sendChatCompletion(
    endpoint,
    model,
    finalPrompt,
    window.API_CONFIG.LLM_TEMPERATURE
  );

  if (!response) return null;

  const responseText = response.choices?.[0]?.message?.content || "";
  const result = window.Utils.extractJsonFromText(responseText);

  if (!result) return null;

  return {
    category: result.category || "OTHER",
    confidence: result.confidence || 0.0,
    model: model
  };
}

/**
 * Generate a custom sorting prompt using the LLM
 * @param {string} endpoint - The API endpoint URL
 * @param {string} model - The model to use
 * @param {Array} folders - Array of folder objects
 * @returns {Promise<string|null>} Generated prompt or null on error
 */
async function generateSortingPrompt(endpoint, model, folders) {
  const folderNames = window.Utils.formatFolderList(folders);
  const generationPrompt = window.DEFAULT_PROMPTS.GENERATION.replace("{folders}", folderNames);

  const response = await sendChatCompletion(
    endpoint,
    model,
    generationPrompt,
    window.API_CONFIG.GENERATION_TEMPERATURE,
    window.API_CONFIG.MAX_TOKENS
  );

  if (!response) return null;

  const generatedPrompt = response.choices?.[0]?.message?.content || "";
  return generatedPrompt.trim() || null;
}

// Make API functions available globally
window.API = {
  fetchAvailableModels,
  sendChatCompletion,
  categorizeEmail,
  generateSortingPrompt
};