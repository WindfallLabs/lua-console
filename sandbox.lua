Metadata = {}

function Metadata:new(content)
    fm_str = app.getFrontmatter(content).frontmatter
    fm = app.parseYaml(fm_str)
    o = {}
    setmetatable(o, self)
    self.__index = self
    self.as_string = fm_str
    return o
end

m = Metadata:new(c)

--[[
root = vault.getRoot()
]]

function inspect_table(t)
    for k, v in pairs(t) do
        print(string.format("[%s] = %s (type: %s)", 
            tostring(k), tostring(v), type(v)))
    end
end

n = "Test Vault!.md"
Note = {
    name = "",
    path = "",
    content = "",
}

function Note:new(name, content)
    o = {}
    setmetatable(o, self)
    self.__index = self
    self.name = name
    self.path = path
    self.content = content
    return o
end

note = Note:new(n)
print(note.content)

