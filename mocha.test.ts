import './app/init';
import Mocha from 'mocha';
import fs from 'fs';
import path from 'path';

const __dirname = globalThis.mainFileDirectory;
const mocha = new Mocha();

// Read the tests directory
const testDir = path.join(__dirname, '../tests');

fs.readdirSync(testDir).filter(file => {
    // Only keep the .ts files
    return file.endsWith('.ts');
}).forEach(file => {
    // Use the method "addFile" to add the file to mocha
    mocha.addFile(
        path.join(testDir, file)
    );
});

// Run tests
mocha.run(failures => {
  process.exitCode = failures ? 1 : 0;  // exit with non-zero status if there were failures
});
