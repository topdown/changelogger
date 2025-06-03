# Change Logger

**Automatically generate and update CHANGELOG.md files from git commit history**

Change Logger is a VSCode/Cursor extension that eliminates the pain of manually maintaining changelogs. It scans your git history and intelligently creates professional changelog entries with proper categorization and version detection.

## Features

✅ **Two Core Commands**
- **Create Changelog Here** - Generate a new CHANGELOG.md file
- **Update Changelog** - Add new entries or create if doesn't exist

✅ **Smart Git Detection**
- Automatically finds `.git` directory in current folder or parent directories
- Works in monorepos and nested project structures

✅ **Intelligent Version Detection**
- 🏷️ **Git Tags** - Auto-increments from latest semantic version tag
- 📦 **package.json** - Fallback to package.json version  
- 💬 **User Input** - Interactive prompts when needed
- 🔄 **Smart Defaults** - Sensible fallbacks for any workflow

✅ **Automatic Commit Categorization**
- **Added** - Features, new functionality (`feat`, `feature`, `add`)
- **Fixed** - Bug fixes and corrections (`fix`, `bug`)
- **Changed** - Other modifications and improvements

✅ **Incremental Updates**
- Only includes new commits since last changelog entry
- Tracks dates to prevent duplicates
- Preserves existing changelog content

## Installation

### Development
1. Clone this repository
2. Open in VSCode
3. Run `npm install`
4. Press `F5` to launch Extension Development Host

### From Package
*(Coming soon to VSCode Marketplace)*

## Usage

### Basic Usage

1. **Right-click any folder** in your git repository
2. Select **"Create Changelog Here"** or **"Update Changelog"**
3. Extension will:
   - Find your git repository
   - Analyze commit history
   - Determine appropriate version
   - Generate categorized changelog entries

### Command Palette

Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac):
- Type "Change Logger: Create Changelog Here"
- Type "Change Logger: Update Changelog"

### Version Detection Logic

The extension follows this priority order:

#### 1. Git Tags (Recommended)
```bash
# If you have tags like v1.2.0, v1.1.0, etc.
git tag v1.2.0
```
- Finds latest semantic version tag
- Auto-increments based on commit types:
  - **Major bump**: `BREAKING CHANGE` or `breaking`
  - **Minor bump**: `feat`, `feature`  
  - **Patch bump**: `fix`, `bug`

#### 2. Package.json
```json
{
  "version": "1.2.0"
}
```
Uses version from package.json if no git tags found.

#### 3. User Input
Interactive prompt when no version source is available:
```
Enter version for this changelog entry
e.g., 1.2.0, v2.0.0, or leave empty for "Unreleased"
```

#### 4. Smart Defaults
- Updates: `"Unreleased"`
- New changelogs: `"1.0.0"`

## Example Output

```markdown
# Changelog

All notable changes to this project will be documented in this file.

## [1.3.0] - 2024-01-15

### Added
- feat: implement smart version detection
- add support for git tag parsing

### Fixed
- fix: resolve path detection issues
- bug: handle missing .git directories

### Changed
- update documentation
- refactor commit categorization logic
```

## Commit Message Conventions

For best results, use conventional commit messages:

```bash
# Features (minor version bump)
git commit -m "feat: add new authentication system"
git commit -m "feature: implement dark mode"

# Bug Fixes (patch version bump)  
git commit -m "fix: resolve login timeout issue"
git commit -m "bug: fix memory leak in parser"

# Breaking Changes (major version bump)
git commit -m "feat!: redesign API endpoints

BREAKING CHANGE: API endpoints now require authentication"
```

## Configuration

Currently no configuration options. The extension works out-of-the-box with sensible defaults.

Future versions may include:
- Custom commit categorization rules
- Changelog format templates
- Date range selection
- Exclude patterns

## Requirements

- Git repository (`.git` directory)
- VSCode 1.74.0 or higher

## Development

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch for changes
npm run watch

# Package extension
npm run package
```

## Troubleshooting

### "No .git directory found"
- Ensure you're in a git repository
- Check that `.git` folder exists in current or parent directories
- Initialize git: `git init`

### "No new commits found"
- All commits since last changelog update are already included
- Make new commits to generate changelog entries

### Version detection issues
- Create semantic version git tags: `git tag v1.0.0`
- Add version to package.json
- Use manual input when prompted

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'feat: add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## License

MIT License - feel free to use in your projects!

## Roadmap

- [ ] VSCode Marketplace publication
- [ ] Custom commit categorization rules
- [ ] Multiple changelog formats (Keep a Changelog, etc.)
- [ ] Configuration options
- [ ] Date range selection
- [ ] Integration with release workflows
- [ ] Support for monorepo changelogs

