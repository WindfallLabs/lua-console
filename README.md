# Lua Console
This plugin for Obsidian adds a Lua interpreter (via [wasmoon](https://github.com/ceifa/wasmoon)).  

The possibilities are endless.  

## Installation

Not currently available through Community Plugins; only available here for now.  


## Planned Features

- Print more info when Lua starts (e.g. `_VERSION`)
- Scroll though previously submitted code using up/down arrows
- Syntax highlighting on the input code (if possible)
- Autocomplete / Object inspection
- Parsing notes for Lua codeblocks and executing them
- Consider using the Lucide "moon" icon instead of "code"
- Possible short-cut wrappers for vault manipulation and metadata extraction/change
- Add examples to this README

## Helper Code
```lua
function inspect_table(t)
    for k, v in pairs(t) do
        print(string.format("[%s] = %s (type: %s)", 
            tostring(k), tostring(v), type(v)))
    end
end
```
