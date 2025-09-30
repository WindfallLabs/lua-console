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
A multiline
comment
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

function Note:new(name)
    o = {}
    setmetatable(o, self)
    self.__index = self
    self.name = name
    --self.path = path
    self.content = getNoteContent(name):await()
    self.metadata_str = app.getFrontmatter(self.content).frontmatter
    -- This sucks
    self.metadata = app.parseYaml(self.metadata_str)
    return o
end

function get_note(name)
    return Note:new(name)
end


--note = Note:new(n)
note = get_note(n)
print(note.content)

