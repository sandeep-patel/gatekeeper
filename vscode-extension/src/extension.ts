import * as vscode from 'vscode';
import { ApprovalClient } from './approvalClient';
import { CommandInterceptor } from './commandInterceptor';

let approvalClient: ApprovalClient;
let commandInterceptor: CommandInterceptor;
let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
    console.log('Telegram Command Approval extension activated');

    // Initialize the approval client
    approvalClient = new ApprovalClient();
    
    // Initialize command interceptor
    commandInterceptor = new CommandInterceptor(approvalClient);

    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    statusBarItem.command = 'telegramApproval.configure';
    updateStatusBar();
    statusBarItem.show();

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('telegramApproval.configure', configure),
        vscode.commands.registerCommand('telegramApproval.testConnection', testConnection),
        vscode.commands.registerCommand('telegramApproval.enable', enable),
        vscode.commands.registerCommand('telegramApproval.disable', disable),
        statusBarItem
    );

    // Watch for configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('telegramApproval')) {
                updateStatusBar();
                approvalClient.updateConfig();
            }
        })
    );

    // Register terminal profile for Telegram-approved commands
    context.subscriptions.push(
        vscode.window.registerTerminalProfileProvider('telegramApproval.terminal', {
            provideTerminalProfile(): vscode.ProviderResult<vscode.TerminalProfile> {
                return new vscode.TerminalProfile({
                    name: 'Telegram Approved Terminal',
                    shellPath: process.env.SHELL || '/bin/zsh',
                });
            }
        })
    );

    // Hook into task execution for approval
    context.subscriptions.push(
        vscode.tasks.onDidStartTask(async (e) => {
            const config = vscode.workspace.getConfiguration('telegramApproval');
            if (!config.get<boolean>('enabled')) {
                return;
            }
            
            // Log task starts - we can't block them but we can notify
            if (e.execution.task.execution instanceof vscode.ShellExecution) {
                const command = getCommandString(e.execution.task.execution);
                if (command) {
                    vscode.window.showInformationMessage(
                        `Task started: ${command.substring(0, 50)}...`
                    );
                }
            }
        })
    );

    console.log('Telegram Command Approval ready');
}

function getCommandString(execution: vscode.ShellExecution): string | undefined {
    if (typeof execution.commandLine === 'string') {
        return execution.commandLine;
    }
    if (execution.command) {
        const cmd = typeof execution.command === 'string' 
            ? execution.command 
            : execution.command.value;
        const args = execution.args?.map(a => 
            typeof a === 'string' ? a : a.value
        ).join(' ') || '';
        return `${cmd} ${args}`.trim();
    }
    return undefined;
}

function updateStatusBar() {
    const config = vscode.workspace.getConfiguration('telegramApproval');
    const enabled = config.get<boolean>('enabled');
    
    if (enabled) {
        statusBarItem.text = '$(bell) TG Approval';
        statusBarItem.tooltip = 'Telegram Command Approval: Enabled\nClick to configure';
        statusBarItem.backgroundColor = undefined;
    } else {
        statusBarItem.text = '$(bell-slash) TG Approval';
        statusBarItem.tooltip = 'Telegram Command Approval: Disabled\nClick to configure';
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    }
}

async function configure() {
    const config = vscode.workspace.getConfiguration('telegramApproval');
    
    const options = [
        {
            label: config.get<boolean>('enabled') ? '$(check) Disable' : '$(circle-outline) Enable',
            description: 'Toggle Telegram approval',
            action: 'toggle'
        },
        {
            label: '$(server) Configure Server URL',
            description: config.get<string>('serverUrl'),
            action: 'serverUrl'
        },
        {
            label: '$(clock) Configure Timeout',
            description: `${config.get<number>('timeoutSeconds')} seconds`,
            action: 'timeout'
        },
        {
            label: '$(beaker) Test Connection',
            description: 'Test connection to approval server',
            action: 'test'
        }
    ];

    const selected = await vscode.window.showQuickPick(options, {
        placeHolder: 'Telegram Command Approval Settings'
    });

    if (!selected) {
        return;
    }

    switch (selected.action) {
        case 'toggle':
            await config.update('enabled', !config.get<boolean>('enabled'), true);
            break;
        case 'serverUrl':
            const url = await vscode.window.showInputBox({
                prompt: 'Enter the Telegram approval bot server URL',
                value: config.get<string>('serverUrl'),
                placeHolder: 'http://localhost:8765'
            });
            if (url) {
                await config.update('serverUrl', url, true);
            }
            break;
        case 'timeout':
            const timeout = await vscode.window.showInputBox({
                prompt: 'Enter timeout in seconds',
                value: String(config.get<number>('timeoutSeconds')),
                validateInput: (v) => isNaN(Number(v)) ? 'Enter a number' : undefined
            });
            if (timeout) {
                await config.update('timeoutSeconds', Number(timeout), true);
            }
            break;
        case 'test':
            await testConnection();
            break;
    }
}

async function testConnection() {
    const result = await approvalClient.testConnection();
    
    if (result.success) {
        vscode.window.showInformationMessage(
            `✅ Connected! ${result.pendingApprovals} pending approval(s)`
        );
    } else {
        vscode.window.showErrorMessage(
            `❌ Connection failed: ${result.error}`
        );
    }
}

async function enable() {
    const config = vscode.workspace.getConfiguration('telegramApproval');
    await config.update('enabled', true, true);
    vscode.window.showInformationMessage('Telegram Command Approval enabled');
}

async function disable() {
    const config = vscode.workspace.getConfiguration('telegramApproval');
    await config.update('enabled', false, true);
    vscode.window.showInformationMessage('Telegram Command Approval disabled');
}

export function deactivate() {
    console.log('Telegram Command Approval extension deactivated');
}

// Export for use by other extensions or Copilot integration
export async function requestApproval(
    command: string,
    options?: {
        explanation?: string;
        goal?: string;
        timeout?: number;
    }
): Promise<boolean> {
    return approvalClient.requestApproval(command, options);
}
