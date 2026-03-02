
const path = require('path');
const fs = require('fs');

async function debug() {
    const logPath = 'c:/Projects/runni5/tmp/debug_log.txt';
    fs.writeFileSync(logPath, 'Starting debug...\n', 'utf8');

    try {
        const envPath = 'c:/Projects/runni5/backend/.env';
        if (!fs.existsSync(envPath)) {
            fs.appendFileSync(logPath, 'Env file not found\n');
            return;
        }
        const content = fs.readFileSync(envPath, 'utf8');
        fs.appendFileSync(logPath, 'Env file read successfully. Lines: ' + content.split('\n').length + '\n');

        // Try a simple network request
        try {
            const res = await fetch('https://google.com');
            fs.appendFileSync(logPath, 'Fetch test status: ' + res.status + '\n');
        } catch (e) {
            fs.appendFileSync(logPath, 'Fetch test failed: ' + e.message + '\n');
        }

    } catch (err) {
        fs.appendFileSync(logPath, 'Critical error: ' + err.message + '\n');
    }
}

debug();
