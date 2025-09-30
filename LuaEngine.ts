import { App, TFile, getFrontMatterInfo, parseYaml } from 'obsidian';
import { LuaFactory, LuaEngine as WasmoonEngine } from 'wasmoon';

const appVersion = "1.0.0-dev";

export class LuaEngine {
    private factory: LuaFactory | null = null;
    lua: WasmoonEngine | null = null;
    private app: App;

    constructor(app: App) {
        this.app = app;
    }

    async initialize(): Promise<void> {
        if (this.lua) {
            return;
        }

        try {
            this.factory = new LuaFactory();
            this.lua = await this.factory.createEngine();

            await this.exposeObsidianAPI();
            await this.setupPrintCapture();
            await this.setupCustomGlobals();
            await this.exposeNoteAPI();
        } catch (error) {
            console.error('Failed to initialize Lua engine:', error);
            throw new Error(`Lua initialization failed: ${error.message}`);
        }
    }

    private async exposeNoteAPI(): Promise<void> {
        if (!this.lua) return;

        // Expose async Note creation function
        const createNote = async (nameOrPath: string) => {
            const files: TFile[] = this.app.vault.getMarkdownFiles();
            const file: TFile | undefined = files.find(f => 
                f.basename === nameOrPath || 
                f.basename === nameOrPath.replace(/\.md$/, '') ||
                f.path === nameOrPath
            );
            
            if (!file) {
                throw new Error(`File not found: ${nameOrPath}`);
            }
            
            const content = await this.app.vault.read(file);
            
            return {
                name: file.basename,
                path: file.path,
                content: content,
                extension: file.extension
            };
        };

        // Expose the function to Lua
        this.lua.global.set('Note', createNote);

        // Also expose a simple getNoteContent for backward compatibility
        const getNoteContent = async (nameOrPath: string): Promise<string> => {
            const note = await createNote(nameOrPath);
            return note.content;
        };

        this.lua.global.set('getNoteContent', getNoteContent);
    }

    private async exposeObsidianAPI(): Promise<void> {
        if (!this.lua) return;

        const appProxy = {
            //getName: () => this.app.vault.getName(),
            getFrontmatter: (content: string) => getFrontMatterInfo(content),
            parseYaml: (content: string) => parseYaml(content),

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
            _raw: this.app
        };

        this.lua.global.set('app', appProxy);

        this.lua.global.set('log', (message: string) => {
            console.log('[Lua]', message);
            return message;
        });
    }

    private async setupPrintCapture(): Promise<void> {
        if (!this.lua) return;

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

    private async setupCustomGlobals(): Promise<void> {
        if (!this.lua) return;

        await this.lua.doString("_lua_console = {}");
        await this.lua.doString(`_lua_console.version = "Lua Console ${appVersion}"`);
        await this.lua.doString('_lua_console.about = "A Lua interpreter inside Obsidian"');
        await this.lua.doString('_lua_console.header = _lua_console.version.." -- ".._lua_console.about.."\\n".._VERSION');
    }

    async execute(code: string): Promise<any> {
        if (!this.lua) {
            throw new Error('Lua engine not initialized');
        }

        // Clear previous print output
        await this.lua.doString('_print_output = ""');

        try {
            // Execute the code - promises will be handled by wasmoon-async-fix
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