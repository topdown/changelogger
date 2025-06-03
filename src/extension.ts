import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { simpleGit, SimpleGit } from 'simple-git';

export function activate(context: vscode.ExtensionContext) {
    console.log('Change Logger extension is now active!');

    // Register the create changelog command
    let createCommand = vscode.commands.registerCommand('changelogger.createChangelog', async (uri: vscode.Uri) => {
        await createChangelog(uri);
    });

    // Register the update changelog command
    let updateCommand = vscode.commands.registerCommand('changelogger.updateChangelog', async (uri: vscode.Uri) => {
        await updateChangelog(uri);
    });

    context.subscriptions.push(createCommand, updateCommand);
}

async function createChangelog(uri?: vscode.Uri): Promise<void> {
    try {
        const workspaceFolder = getWorkspaceFolder(uri);
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found');
            return;
        }

        // Check for .git directory starting from the workspace folder and walking up
        const gitRepoPath = findGitDirectory(workspaceFolder);
        if (!gitRepoPath) {
            vscode.window.showErrorMessage(`No .git directory found in ${workspaceFolder} or its parent directories. This command requires a git repository.`);
            return;
        }
        console.log('Found git repository at:', gitRepoPath);

        const changelogPath = path.join(workspaceFolder, 'CHANGELOG.md');
        if (fs.existsSync(changelogPath)) {
            const overwrite = await vscode.window.showWarningMessage(
                'CHANGELOG.md already exists. Do you want to overwrite it?',
                'Yes', 'No'
            );
            if (overwrite !== 'Yes') {
                return;
            }
        }

        await generateChangelog(gitRepoPath, changelogPath, false);
        vscode.window.showInformationMessage('CHANGELOG.md created successfully!');

    } catch (error) {
        vscode.window.showErrorMessage(`Error creating changelog: ${error}`);
    }
}

async function updateChangelog(uri?: vscode.Uri): Promise<void> {
    try {
        const workspaceFolder = getWorkspaceFolder(uri);
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found');
            return;
        }

        // Check for .git directory starting from the workspace folder and walking up
        const gitRepoPath = findGitDirectory(workspaceFolder);
        if (!gitRepoPath) {
            vscode.window.showErrorMessage(`No .git directory found in ${workspaceFolder} or its parent directories. This command requires a git repository.`);
            return;
        }
        console.log('Found git repository at:', gitRepoPath);

        const changelogPath = path.join(workspaceFolder, 'CHANGELOG.md');
        const isUpdate = fs.existsSync(changelogPath);

        await generateChangelog(gitRepoPath, changelogPath, isUpdate);
        
        const message = isUpdate ? 'CHANGELOG.md updated successfully!' : 'CHANGELOG.md created successfully!';
        vscode.window.showInformationMessage(message);

    } catch (error) {
        vscode.window.showErrorMessage(`Error updating changelog: ${error}`);
    }
}

async function generateChangelog(gitRepoPath: string, changelogPath: string, isUpdate: boolean): Promise<void> {
    const git: SimpleGit = simpleGit(gitRepoPath);
    
    // Get git log
    const log = await git.log();
    
    // Get the last commit date from existing changelog if updating
    let lastDate: Date | undefined;
    if (isUpdate && fs.existsSync(changelogPath)) {
        lastDate = getLastChangelogDate(changelogPath);
    }
    
    // Filter commits based on last changelog date
    const commits = lastDate 
        ? log.all.filter(commit => new Date(commit.date) > lastDate!)
        : log.all;
    
    if (commits.length === 0 && isUpdate) {
        vscode.window.showInformationMessage('No new commits found since last changelog update.');
        return;
    }
    
    // Determine version for this changelog entry
    const version = await determineVersion(gitRepoPath, commits, isUpdate);
    
    // Generate changelog content
    const changelogContent = generateChangelogContent(commits, isUpdate, version);
    
    if (isUpdate && fs.existsSync(changelogPath)) {
        // Prepend new content to existing changelog
        const existingContent = fs.readFileSync(changelogPath, 'utf8');
        const updatedContent = changelogContent + '\n' + existingContent;
        fs.writeFileSync(changelogPath, updatedContent);
    } else {
        // Create new changelog
        const fullContent = '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n' + changelogContent;
        fs.writeFileSync(changelogPath, fullContent);
    }
}

function generateChangelogContent(commits: readonly any[], isUpdate: boolean, version: string): string {
    if (commits.length === 0) {
        return '';
    }
    
    const today = new Date().toISOString().split('T')[0];
    let content = `## [${version}] - ${today}\n\n`;
    
    // Categorize commits
    const features: string[] = [];
    const fixes: string[] = [];
    const other: string[] = [];
    
    commits.forEach(commit => {
        const message = commit.message.split('\n')[0]; // Get first line only
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('feat') || lowerMessage.includes('feature') || lowerMessage.includes('add')) {
            features.push(`- ${message}`);
        } else if (lowerMessage.includes('fix') || lowerMessage.includes('bug')) {
            fixes.push(`- ${message}`);
        } else {
            other.push(`- ${message}`);
        }
    });
    
    // Add categorized sections
    if (features.length > 0) {
        content += '### Added\n' + features.join('\n') + '\n\n';
    }
    
    if (fixes.length > 0) {
        content += '### Fixed\n' + fixes.join('\n') + '\n\n';
    }
    
    if (other.length > 0) {
        content += '### Changed\n' + other.join('\n') + '\n\n';
    }
    
    return content;
}

function getLastChangelogDate(changelogPath: string): Date | undefined {
    try {
        const content = fs.readFileSync(changelogPath, 'utf8');
        const dateMatch = content.match(/## \[.*?\] - (\d{4}-\d{2}-\d{2})/);
        if (dateMatch) {
            return new Date(dateMatch[1]);
        }
    } catch (error) {
        console.error('Error reading changelog date:', error);
    }
    return undefined;
}

async function determineVersion(gitRepoPath: string, commits: readonly any[], isUpdate: boolean): Promise<string> {
    const git: SimpleGit = simpleGit(gitRepoPath);
    
    try {
        // 1. Try to get version from git tags
        const gitVersion = await getVersionFromGitTags(git, commits);
        if (gitVersion) {
            console.log('Using git tag version:', gitVersion);
            return gitVersion;
        }
        
        // 2. Try to get version from package.json
        const packageVersion = getVersionFromPackageJson(gitRepoPath);
        if (packageVersion) {
            console.log('Using package.json version:', packageVersion);
            return packageVersion;
        }
        
        // 3. Prompt user for version
        const userVersion = await vscode.window.showInputBox({
            prompt: 'Enter version for this changelog entry',
            placeHolder: 'e.g., 1.2.0, v2.0.0, or leave empty for "Unreleased"',
            value: isUpdate ? 'Unreleased' : '1.0.0'
        });
        
        if (userVersion && userVersion.trim()) {
            return userVersion.trim();
        }
        
        // 4. Fallback
        return isUpdate ? 'Unreleased' : '1.0.0';
        
    } catch (error) {
        console.error('Error determining version:', error);
        return isUpdate ? 'Unreleased' : '1.0.0';
    }
}

async function getVersionFromGitTags(git: SimpleGit, commits: readonly any[]): Promise<string | null> {
    try {
        const tags = await git.tags();
        const versionTags = tags.all.filter(tag => 
            /^v?\d+\.\d+\.\d+/.test(tag)
        ).sort((a, b) => {
            // Sort by semantic version
            const aVersion = a.replace(/^v/, '').split('.').map(Number);
            const bVersion = b.replace(/^v/, '').split('.').map(Number);
            
            for (let i = 0; i < 3; i++) {
                if (aVersion[i] !== bVersion[i]) {
                    return bVersion[i] - aVersion[i]; // Descending order
                }
            }
            return 0;
        });
        
        if (versionTags.length === 0) {
            return null;
        }
        
        const latestTag = versionTags[0];
        console.log('Latest git tag:', latestTag);
        
        // Analyze commits to determine version bump
        const hasBreaking = commits.some(commit => 
            commit.message.toLowerCase().includes('breaking') || 
            commit.message.includes('BREAKING CHANGE')
        );
        const hasFeatures = commits.some(commit =>
            commit.message.toLowerCase().includes('feat') ||
            commit.message.toLowerCase().includes('feature')
        );
        const hasFixes = commits.some(commit =>
            commit.message.toLowerCase().includes('fix') ||
            commit.message.toLowerCase().includes('bug')
        );
        
        if (hasBreaking || hasFeatures || hasFixes) {
            return incrementVersion(latestTag, hasBreaking, hasFeatures);
        }
        
        return latestTag;
        
    } catch (error) {
        console.error('Error getting git tags:', error);
        return null;
    }
}

function incrementVersion(version: string, hasBreaking: boolean, hasFeatures: boolean): string {
    const cleanVersion = version.replace(/^v/, '');
    const parts = cleanVersion.split('.').map(Number);
    
    if (hasBreaking) {
        // Major version bump
        parts[0]++;
        parts[1] = 0;
        parts[2] = 0;
    } else if (hasFeatures) {
        // Minor version bump
        parts[1]++;
        parts[2] = 0;
    } else {
        // Patch version bump
        parts[2]++;
    }
    
    return parts.join('.');
}

function getVersionFromPackageJson(repoPath: string): string | null {
    try {
        const packageJsonPath = path.join(repoPath, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            if (packageJson.version) {
                return packageJson.version;
            }
        }
        return null;
    } catch (error) {
        console.error('Error reading package.json:', error);
        return null;
    }
}

function findGitDirectory(startPath: string): string | undefined {
    let currentPath = startPath;
    
    while (currentPath !== path.dirname(currentPath)) {
        const gitPath = path.join(currentPath, '.git');
        console.log('Checking for .git at:', gitPath);
        
        if (fs.existsSync(gitPath)) {
            return currentPath; // Return the directory containing .git
        }
        
        currentPath = path.dirname(currentPath);
    }
    
    return undefined;
}

function getWorkspaceFolder(uri?: vscode.Uri): string | undefined {
    console.log('getWorkspaceFolder called with URI:', uri?.fsPath);
    
    if (uri) {
        // Use the actual clicked folder path, not the workspace root
        console.log('Using clicked folder path:', uri.fsPath);
        return uri.fsPath;
    }
    
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        const folder = vscode.workspace.workspaceFolders[0].uri.fsPath;
        console.log('Using first workspace folder:', folder);
        console.log('All workspace folders:', vscode.workspace.workspaceFolders.map(f => f.uri.fsPath));
        return folder;
    }
    
    console.log('No workspace folder found');
    return undefined;
}

export function deactivate() {} 