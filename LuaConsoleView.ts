import { ItemView, WorkspaceLeaf, App } from 'obsidian';
import { LuaEngine } from './LuaEngine';

export const LUA_CONSOLE_VIEW_TYPE = 'lua-console-view';

// Declare Prism for TypeScript
declare global {
    interface Window {
        Prism: any;
    }
}

export class LuaConsoleView extends ItemView {
    private luaEngine: LuaEngine;
    private inputEl: HTMLTextAreaElement;
    private outputEl: HTMLDivElement;
    private prismLoaded: boolean = false;

    constructor(leaf: WorkspaceLeaf, app: App) {
        super(leaf);
        this.luaEngine = new LuaEngine(app);
        this.loadPrism();
    }

    getViewType(): string {
        return LUA_CONSOLE_VIEW_TYPE;
    }

    getDisplayText(): string {
        return 'Lua Console';
    }

    getIcon(): string {
        return 'moon';
    }

    private loadPrism() {
        // Load Prism CSS
        if (!document.getElementById('prism-css')) {
            const link = document.createElement('link');
            link.id = 'prism-css';
            link.rel = 'stylesheet';
            link.href = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css';
            document.head.appendChild(link);
        }

        // Load Prism JS
        if (!window.Prism) {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js';
            script.onload = () => {
                // Load Lua language support
                const luaScript = document.createElement('script');
                luaScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-lua.min.js';
                luaScript.onload = () => {
                    this.prismLoaded = true;
                };
                document.head.appendChild(luaScript);
            };
            document.head.appendChild(script);
        } else {
            this.prismLoaded = true;
        }
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass('lua-console-container');

        // Set explicit styles to ensure layout works
        (container as HTMLElement).style.position = 'relative';
        (container as HTMLElement).style.height = '100%';
        (container as HTMLElement).style.width = '100%';
        (container as HTMLElement).style.overflow = 'hidden';
        (container as HTMLElement).style.display = 'flex';
        (container as HTMLElement).style.flexDirection = 'column';

        // Create output area first
        this.outputEl = container.createDiv({ cls: 'lua-console-output' });
        (this.outputEl as HTMLElement).style.flex = '1';
        (this.outputEl as HTMLElement).style.overflowY = 'auto';
        (this.outputEl as HTMLElement).style.overflowX = 'hidden';
        (this.outputEl as HTMLElement).style.margin = '10px';
        (this.outputEl as HTMLElement).style.padding = '12px';
        (this.outputEl as HTMLElement).style.border = '1px solid var(--background-modifier-border)';
        (this.outputEl as HTMLElement).style.borderRadius = '6px';
        (this.outputEl as HTMLElement).style.backgroundColor = 'var(--background-primary-alt)';
        (this.outputEl as HTMLElement).style.fontFamily = 'var(--font-monospace)';

        // -----------------------------------------
        // Initialize Lua engine with error handling
        try {
            await this.luaEngine.initialize();
            //this.addOutput('Lua Console ready. The Obsidian app is available as "app".', 'info');
            this.addOutput(await this.luaEngine.execute('print(_lua_console.header)'), 'info');
            //this.addOutput("Ready.", 'info');
        } catch (error) {
            this.addOutput(`Failed to initialize Lua: ${error.message}`, 'error');
            this.addOutput('Check the developer console for details.', 'error');
            console.error('Lua initialization error:', error);
            return; // Don't create input if initialization failed
        }

        // Create input area
        const inputContainer = container.createDiv({ cls: 'lua-console-input-container' });
        (inputContainer as HTMLElement).style.flexShrink = '0';
        (inputContainer as HTMLElement).style.padding = '10px';
        (inputContainer as HTMLElement).style.borderTop = '1px solid var(--background-modifier-border)';
        (inputContainer as HTMLElement).style.backgroundColor = 'var(--background-primary)';
        
        this.inputEl = inputContainer.createEl('textarea', {
            cls: 'lua-console-input',
            attr: {
                placeholder: 'Enter Lua code...',
                rows: '3'
            }
        });
        
        // Force monospace and full width
        this.inputEl.style.width = '100%';
        this.inputEl.style.fontFamily = 'var(--font-monospace)';
        this.inputEl.style.fontSize = '13px';
        this.inputEl.style.padding = '10px';
        this.inputEl.style.boxSizing = 'border-box';
        this.inputEl.style.resize = 'vertical';
        this.inputEl.style.minHeight = '80px';

        // Handle keyboard shortcuts
        this.inputEl.addEventListener('keydown', (e) => {
            // Shift + Ctrl/Cmd + Enter to execute
            if (e.shiftKey && (e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                this.executeCode();
            }
        });

        // Create button container
        const buttonContainer = inputContainer.createDiv({ cls: 'lua-console-buttons' });
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '8px';
        buttonContainer.style.marginTop = '8px';
        
        const executeBtn = buttonContainer.createEl('button', {
            text: 'Execute (Shift+Ctrl+Enter)',
            cls: 'mod-cta'
        });
        executeBtn.style.flex = '1';
        executeBtn.addEventListener('click', () => this.executeCode());

        const clearBtn = buttonContainer.createEl('button', {
            text: 'Clear Output'
        });
        clearBtn.style.flex = '1';
        clearBtn.addEventListener('click', () => this.clearOutput());

        const resetBtn = buttonContainer.createEl('button', {
            text: 'Reset Session',
            cls: 'mod-warning'
        });
        resetBtn.style.flex = '1';
        resetBtn.style.backgroundColor = 'var(--color-red)';
        resetBtn.style.color = 'var(--text-on-accent)';
        resetBtn.addEventListener('click', () => this.resetSession());
    }

    async onClose() {
        await this.luaEngine.cleanup();
    }

    private async executeCode() {
        const code = this.inputEl.value.trim();
        
        if (!code) return;

        // Display the input
        this.addOutput(`> ${code}`, 'input');

        try {
            const result = await this.luaEngine.execute(code);
            
            if (result !== undefined && result !== null) {
                this.addOutput(this.formatResult(result), 'success');
            }
        } catch (error) {
            this.addOutput(`Error: ${error.message}`, 'error');
        }

        // Clear input after execution
        this.inputEl.value = '';
    }

    private formatResult(result: any): string {
        if (typeof result === 'object') {
            try {
                return JSON.stringify(result, null, 2);
            } catch {
                return String(result);
            }
        }
        return String(result);
    }

    private addOutput(text: string, type: 'input' | 'success' | 'error' | 'info' = 'success') {
        const line = this.outputEl.createDiv({ cls: `lua-console-line lua-console-${type}` });
        
        // Create pre/code structure for Prism
        const codeBlock = line.createEl('pre');
        const code = codeBlock.createEl('code', { cls: 'language-lua' });
        code.textContent = text;
        
        // Apply syntax highlighting if Prism is loaded
        if (this.prismLoaded && window.Prism) {
            window.Prism.highlightElement(code);
        }
        
        // Style the code block directly
        codeBlock.style.margin = '0';
        codeBlock.style.padding = '8px 10px';
        codeBlock.style.borderRadius = '4px';
        codeBlock.style.fontFamily = 'var(--font-monospace)';
        codeBlock.style.fontSize = '13px';
        codeBlock.style.whiteSpace = 'pre-wrap';
        codeBlock.style.wordBreak = 'break-word';
        codeBlock.style.userSelect = 'text';
        codeBlock.style.cursor = 'text';
        codeBlock.style.overflowX = 'auto';
        
        // Add colored left border based on type
        if (type === 'input') {
            codeBlock.style.borderLeft = '3px solid var(--text-muted)';
            codeBlock.style.backgroundColor = 'var(--code-background)';
        } else if (type === 'success') {
            codeBlock.style.borderLeft = '3px solid var(--text-accent)';
            codeBlock.style.backgroundColor = 'var(--code-background)';
        } else if (type === 'error') {
            codeBlock.style.borderLeft = '3px solid var(--text-error)';
            codeBlock.style.backgroundColor = 'transparent';
            codeBlock.style.color = 'var(--text-error)';
            code.style.color = 'var(--text-error)';
        } else if (type === 'info') {
            codeBlock.style.borderLeft = '3px solid var(--text-muted)';
            codeBlock.style.backgroundColor = 'var(--background-secondary)';
            codeBlock.style.fontStyle = 'italic';
            codeBlock.style.color = 'var(--text-muted)';
        }
        
        // Reduce spacing between input and output
        if (type === 'success' || type === 'error') {
            line.style.marginTop = '4px';
            line.style.marginBottom = '12px';
        } else {
            line.style.marginBottom = '4px';
        }
        
        // Auto-scroll to bottom
        requestAnimationFrame(() => {
            this.outputEl.scrollTop = this.outputEl.scrollHeight;
        });
    }

    private clearOutput() {
        this.outputEl.empty();
        this.addOutput('Output cleared.', 'info');
    }

    private async resetSession() {
        await this.luaEngine.cleanup();
        await this.luaEngine.initialize();
        this.outputEl.empty();
        this.addOutput('Lua session reset. New VM initialized.', 'info');
    }
}