/**
 * Configuration constants for the Thunderbird LLM Mail Sorter
 */

// API Configuration
export const API_CONFIG = {
  DEFAULT_ENDPOINT: "http://localhost:1234/v1",
  DELAY_BETWEEN_REQUESTS: 500, // ms
  LLM_TEMPERATURE: 0.3,
  GENERATION_TEMPERATURE: 0.7,
  MAX_TOKENS: 1000
};

// Default prompts
export const DEFAULT_PROMPTS = {
  CATEGORIZATION: `Categorize this email into one of these categories: WORK, PERSONAL, SPAM, NEWSLETTER, OTHER.

Subject: {subject}
Body: {body}
Available folders: {folders}

Respond in JSON format ONLY, like: {"category": "WORK", "confidence": 0.95}`,

  GENERATION: `Based on these email folder names: {folders}

Create a concise email sorting prompt that includes:

1. For each folder, a brief rule: "Folder: {folder_name} -> {sorting_rule}"
2. Instructions for the LLM to analyze email subject and body
3. Choose the most appropriate folder based on the rules
4. Use placeholders {subject}, {body}, {folders}
5. Output only JSON with "category" and "confidence" fields

Generate ONLY the prompt text that another LLM can use directly to sort emails. Do not include code, documentation, or examples - just the prompt.`
};

// UI Messages
export const MESSAGES = {
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
  GENERATION_ERROR: "Error generating prompt",
  SORTING_ERROR: "Error in sorting process"
};

// Storage keys
export const STORAGE_KEYS = {
  ENDPOINT: "lmEndpoint",
  CUSTOM_PROMPT: "customPrompt",
  ACCOUNT_PROMPT: (accountId) => `prompt_${accountId}`
};

// Category colors for UI
export const CATEGORY_COLORS = {
  "WORK": "#2196F3",
  "PERSONAL": "#4CAF50",
  "SPAM": "#F44336",
  "NEWSLETTER": "#FF9800",
  "OTHER": "#9E9E9E",
  "ERROR": "#607D8B"
};