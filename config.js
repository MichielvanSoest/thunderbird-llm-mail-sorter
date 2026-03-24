/**
 * Configuration constants for the Thunderbird LLM Mail Sorter
 */

// API Configuration
const API_CONFIG = {
  DEFAULT_ENDPOINT: "http://localhost:1234/v1",
  DELAY_BETWEEN_REQUESTS: 500,
  LLM_TEMPERATURE: 0.3,
  GENERATION_TEMPERATURE: 0.7,
  MAX_TOKENS: 1000
};

// Default prompts
const DEFAULT_PROMPTS = {
  CATEGORIZATION: `Categorize this email into one of these categories: WORK, PERSONAL, SPAM, NEWSLETTER, OTHER.

Subject: {subject}
Body: {body}
Available folders: {folders}

Respond in JSON format ONLY, like: {"category": "WORK", "confidence": 0.95}`,

  GENERATION: `You are an AI assistant tasked with creating email sorting rules.

Here are the available email folders: {folders}

For EACH folder, create a specific rule explaining what types of emails should go there. Be very specific and detailed.

Format your response as:
Folder: FolderName -> Detailed rule explaining when to use this folder

Then, after all the rules, provide the final sorting prompt that another AI can use.

The final prompt should:
1. List all the folder rules you created
2. Instruct the AI to analyze email subject and body
3. Choose the best matching folder based on the rules
4. Output only JSON: {"category": "folder_name", "confidence": 0.95}

Generate the complete prompt with rules and instructions.`
};

// UI Messages
const MESSAGES = {
  LOADING_MODELS: "Loading models...",
  NO_MODELS: "No models available",
  SORTING_EMAILS: "Sorting emails...",
  GENERATING_PROMPT: "Generating...",
  SETTINGS_SAVED: "Settings saved",
  PROMPT_GENERATED: "Prompt generated successfully! Review and save when ready.",
  SELECT_ACCOUNT_MODEL: "Please select an account and ensure a model is loaded.",
  NO_ENDPOINT: "Please enter an endpoint",
  NO_ACCOUNTS: "Error loading accounts",
  NO_FOLDERS: "No folders found for this account",
  EMPTY_RESPONSE: "LLM returned empty response",
  API_ERROR: "API error",
  GENERATION_ERROR: "Error generating prompt"
};

// Storage keys
const STORAGE_KEYS = {
  ENDPOINT: "lmEndpoint",
  CUSTOM_PROMPT: "customPrompt",
  ACCOUNT_PROMPT: (accountId) => `prompt_${accountId}`
};

// Category colors for UI
const CATEGORY_COLORS = {
  "WORK": "#2196F3",
  "PERSONAL": "#4CAF50",
  "SPAM": "#F44336",
  "NEWSLETTER": "#FF9800",
  "OTHER": "#9E9E9E",
  "ERROR": "#607D8B"
};

// Make constants available globally
window.API_CONFIG = API_CONFIG;
window.DEFAULT_PROMPTS = DEFAULT_PROMPTS;
window.MESSAGES = MESSAGES;
window.STORAGE_KEYS = STORAGE_KEYS;
window.CATEGORY_COLORS = CATEGORY_COLORS;