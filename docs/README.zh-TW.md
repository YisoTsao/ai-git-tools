# AI Git Tools

AI-powered Git automation tools for commit messages and PR generation

## Quick Start

\`\`\`bash
# Initialize config
npx ai-git-tools init

# Smart commit
npx gitai commit

# Batch commits
npx gitai commit-all

# Create PR
npx gitai pr

# Full workflow
npx gitai workflow
\`\`\`

## Installation

\`\`\`bash
npm install -g ai-git-tools
\`\`\`

## Usage

- \`gitai init\` - Initialize configuration file
- \`gitai commit\` - Generate commit for staged changes
- \`gitai commit-all\` - Analyze and batch commit all changes
- \`gitai pr\` - Generate and create Pull Request
- \`gitai workflow\` - Complete workflow (commit-all + pr)

For more details, see [README.md](./README.md)

## Requirements

- Node.js >= 18.0.0
- Git
- GitHub CLI (for PR features)

## License

MIT
