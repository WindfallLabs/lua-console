import { Plugin } from 'obsidian';
import { LuaConsoleView, LUA_CONSOLE_VIEW_TYPE } from './LuaConsoleView';

export default class LuaConsolePlugin extends Plugin {
    async onload() {
        // Register the console view
        this.registerView(
            LUA_CONSOLE_VIEW_TYPE,
            (leaf) => new LuaConsoleView(leaf, this.app)
        );

        // Add ribbon icon to open console
        this.addRibbonIcon('moon', 'Open Lua Console', () => {
            this.activateView();
        });

        // Add command to open console
        this.addCommand({
            id: 'open-lua-console',
            name: 'Open Lua Console',
            callback: () => {
                this.activateView();
            }
        });
    }

    async onunload() {
        // Detach all console views
        this.app.workspace.detachLeavesOfType(LUA_CONSOLE_VIEW_TYPE);
    }

    async activateView() {
        const { workspace } = this.app;

        let leaf = workspace.getLeavesOfType(LUA_CONSOLE_VIEW_TYPE)[0];

        if (!leaf) {
            // Create new leaf in right sidebar
            // @ts-ignore
            leaf = workspace.getRightLeaf(false);
            await leaf.setViewState({
                type: LUA_CONSOLE_VIEW_TYPE,
                active: true,
            });
        }

        workspace.revealLeaf(leaf);
    }
}