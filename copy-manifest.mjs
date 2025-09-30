import fs from 'fs';
import path from 'path';

const fromPath = path.resolve('manifest.json');
const toPath = path.resolve('build/lua-console/manifest.json');


fs.copyFileSync(
    fromPath,
    toPath
);
