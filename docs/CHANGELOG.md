# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-12

### Added
- 🎯 Smart commit generation for staged changes
- 🚀 Batch commit with intelligent grouping
- 📤 Automatic PR creation with AI-generated content
- 👥 Smart reviewer suggestions based on Git history
- 🏷️ Automatic label suggestions
- ⚙️ Configuration file support
- 🌐 Cross-project compatibility
- 📝 Comprehensive documentation

### Features
- \`gitai init\` - Initialize configuration
- \`gitai commit\` - Single commit generation
- \`gitai commit-all\` - Batch commit with grouping
- \`gitai pr\` - PR generation and creation
- \`gitai workflow\` - Complete workflow automation

### Technical Details
- Built with Commander.js for CLI
- GitHub Copilot SDK integration
- Chalk for colorful output
- Ora for spinners
- Inquirer for interactive prompts
- Supports multiple AI models (GPT-4.1, Claude, etc.)
