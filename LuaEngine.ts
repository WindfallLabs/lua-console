import { App } from 'obsidian';
import { LuaFactory, LuaEngine as WasmoonEngine } from 'wasmoon';

export class LuaEngine {
    private factory: LuaFactory | null = null;
    private lua: WasmoonEngine | null = null;
    private app: App;

    constructor(app: App) {
        this.app = app;
    }

    async initialize(): Promise<void> {
        if (this.lua) {
            return;
        }

        try {
            // Initialize factory here, not in constructor
            this.factory = new LuaFactory();
            this.lua = await this.factory.createEngine();

            // Expose Obsidian app to Lua
            await this.exposeObsidianAPI();

            // Set up print function to capture output
            await this.setupPrintCapture();
        } catch (error) {
            console.error('Failed to initialize Lua engine:', error);
            throw new Error(`Lua initialization failed: ${error.message}`);
        }
    }

    private async exposeObsidianAPI(): Promise<void> {
        if (!this.lua) return;

        // Create a JavaScript proxy that Lua can interact with
        const appProxy = {
            getName: () => this.app.vault.getName(),
            getActiveFile: () => {
                const file = this.app.workspace.getActiveFile();
                return file ? {
                    path: file.path,
                    name: file.name,
                    basename: file.basename,
                    extension: file.extension
                } : null;
            },
            getAllFiles: () => {
                return this.app.vault.getMarkdownFiles().map(f => ({
                    path: f.path,
                    name: f.name,
                    basename: f.basename
                }));
            },
            // Expose the full app object with caution
            _raw: this.app
        };

        // Set the app global in Lua
        this.lua.global.set('app', appProxy);

        // Add some helpful utility functions
        this.lua.global.set('log', (message: string) => {
            console.log('[Lua]', message);
            return message;
        });
    }

    private async setupPrintCapture(): Promise<void> {
        if (!this.lua) return;

        // Override Lua's print function to return values instead of printing to stdout
        await this.lua.doString(`
            _print_output = ""
            function print(...)
                local args = {...}
                local output = {}
                for i, v in ipairs(args) do
                    table.insert(output, tostring(v))
                end
                _print_output = _print_output .. table.concat(output, "\\t") .. "\\n"
            end
        `);
    }

    async execute(code: string): Promise<any> {
        if (!this.lua) {
            throw new Error('Lua engine not initialized');
        }

        // Clear previous print output
        await this.lua.doString('_print_output = ""');

        try {
            // Execute the code
            const result = await this.lua.doString(code);

            // Check if there was any print output
            const printOutput = await this.lua.doString('return _print_output');
            
            if (printOutput && printOutput.trim()) {
                return printOutput.trim();
            }

            return result;
        } catch (error) {
            throw new Error(this.formatLuaError(error));
        }
    }

    private formatLuaError(error: any): string {
        if (error.message) {
            return error.message;
        }
        return String(error);
    }

    async cleanup(): Promise<void> {
        if (this.lua) {
            this.lua.global.close();
        }
        this.factory = null;
        this.lua = null;
    }
}