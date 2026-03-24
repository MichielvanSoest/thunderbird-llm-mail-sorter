# LLM Mail Sorter for Thunderbird

An intelligent email sorting extension for Thunderbird that uses Large Language Models (LLMs) to automatically categorize and move emails to appropriate folders.

## Features

- **AI-Powered Sorting**: Uses local LLMs (via LM Studio or compatible APIs) to analyze email content
- **Per-Account Prompts**: Customize sorting rules for each email account
- **Auto-Generated Prompts**: Automatically create sorting prompts based on your folder structure
- **Batch Processing**: Sort multiple selected emails at once
- **Visual Feedback**: See categorization results and move status in real-time

## Installation

1. Download the extension files
2. In Thunderbird: Tools → Add-ons → Extensions → Install Add-on From File
3. Select the downloaded `.xpi` file (or load temporarily for development)

## Setup

1. **Install LM Studio** (or compatible LLM server)
2. Start your LLM server (default: http://localhost:1234)
3. Load a model in your LLM server
4. In Thunderbird, click the extension icon
5. Configure the endpoint URL in Settings
6. Select emails and click "Sort selected emails"

## Configuration

- **Endpoint**: URL of your LLM API server (e.g., http://localhost:1234/v1)
- **Model**: Select from available models in your LLM server
- **Custom Prompts**: Create account-specific sorting rules
- **Auto-Generate**: Let the AI create prompts based on your folder structure

## Permissions Required

- `messagesRead`: Read email content
- `messagesMove`: Move emails to folders
- `accountsRead`: Access account information
- `storage`: Save settings
- `http://*/*`, `https://*/*`: Communicate with LLM server

## Development

### Prerequisites

- Thunderbird 78+
- Node.js (for building, if needed)
- LM Studio or compatible LLM server

### Building

1. Clone this repository
2. Make changes to the source files
3. Zip the files (manifest.json, background.js, popup.html, popup.js) into a .xpi file
4. Install in Thunderbird for testing

### File Structure

```
├── manifest.json      # Extension manifest
├── background.js      # Background script (API calls, email processing)
├── popup.html         # Extension popup UI
├── popup.js           # Popup logic
└── modules/           # Legacy files (can be removed)
```

## License

MIT License - feel free to use and modify

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Troubleshooting

- **No models found**: Check that your LLM server is running and accessible
- **Emails not moving**: Verify folder permissions and that folders exist
- **Connection errors**: Ensure the endpoint URL is correct and server is running

## Privacy

- All processing happens locally with your LLM server
- No emails or personal data are sent to external servers
- Settings are stored locally in Thunderbird