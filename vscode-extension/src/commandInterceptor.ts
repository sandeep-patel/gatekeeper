import * as vscode from 'vscode';
import { ApprovalClient } from './approvalClient';

/**
 * CommandInterceptor provides hooks for intercepting terminal commands
 * and routing them through Telegram approval.
 * 
 * Note: VS Code doesn't provide a direct API to intercept all terminal commands.
 * This class provides utilities that can be used by:
 * 1. Custom task providers
 * 2. Extensions that want to run commands with approval
 * 3. Future integration points
 */
export class CommandInterceptor {
    private approvalClient: ApprovalClient;
    private pendingCommands: Map<string, {
        command: string;
        resolve: (approved: boolean) => void;
    }> = new Map();

    constructor(approvalClient: ApprovalClient) {
        this.approvalClient = approvalClient;
    }

    /**
     * Execute a command with Telegram approval
     */
    async executeWithApproval(
        command: string,
        options?: {
            explanation?: string;
            goal?: string;
            cwd?: string;
        }
    ): Promise<vscode.Terminal | undefined> {
        const approved = await this.approvalClient.requestApproval(command, {
            explanation: options?.explanation,
            goal: options?.goal,
        });

        if (!approved) {
            return undefined;
        }

        // Create terminal and run command
        const terminal = vscode.window.createTerminal({
            name: 'Approved Command',
            cwd: options?.cwd,
        });

        terminal.show();
        terminal.sendText(command);

        return terminal;
    }

    /**
     * Create a task that requires approval before execution
     */
    createApprovedTask(
        name: string,
        command: string,
        options?: {
            explanation?: string;
            goal?: string;
        }
    ): vscode.Task {
        const task = new vscode.Task(
            { type: 'telegram-approved', command },
            vscode.TaskScope.Workspace,
            name,
            'telegram-approval',
            new vscode.CustomExecution(async () => {
                // Request approval
                const approved = await this.approvalClient.requestApproval(command, {
                    explanation: options?.explanation,
                    goal: options?.goal,
                });

                if (!approved) {
                    throw new Error('Command rejected via Telegram');
                }

                // Return a pseudoterminal that runs the command
                return new ApprovedTerminal(command);
            })
        );

        return task;
    }
}

/**
 * A pseudoterminal that runs an approved command
 */
class ApprovedTerminal implements vscode.Pseudoterminal {
    private writeEmitter = new vscode.EventEmitter<string>();
    private closeEmitter = new vscode.EventEmitter<number>();
    
    onDidWrite: vscode.Event<string> = this.writeEmitter.event;
    onDidClose: vscode.Event<number> = this.closeEmitter.event;

    constructor(private command: string) {}

    open(): void {
        this.writeEmitter.fire(`Running approved command: ${this.command}\r\n\r\n`);
        
        // Execute the command
        const { exec } = require('child_process');
        const proc = exec(this.command, {
            shell: process.env.SHELL || '/bin/zsh',
            cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
        });

        proc.stdout?.on('data', (data: Buffer) => {
            this.writeEmitter.fire(data.toString().replace(/\n/g, '\r\n'));
        });

        proc.stderr?.on('data', (data: Buffer) => {
            this.writeEmitter.fire(data.toString().replace(/\n/g, '\r\n'));
        });

        proc.on('close', (code: number) => {
            this.writeEmitter.fire(`\r\nProcess exited with code ${code}\r\n`);
            this.closeEmitter.fire(code || 0);
        });
    }

    close(): void {
        // Cleanup if needed
    }
}
