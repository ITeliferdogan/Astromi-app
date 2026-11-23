const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Configuration
const SDK_PATH = process.env.ANDROID_HOME || path.join(os.homedir(), 'AppData', 'Local', 'Android', 'Sdk');
const EMULATOR_PATH = path.join(SDK_PATH, 'emulator', 'emulator.exe');
const ADB_PATH = path.join(SDK_PATH, 'platform-tools', 'adb.exe');
const AVD_NAME = 'Small_Phone_API_35';

function checkConnectedDevices() {
    try {
        const output = execSync(`"${ADB_PATH}" devices`).toString();
        const lines = output.split('\n');
        for (const line of lines) {
            if (line.trim().endsWith('device')) {
                return true;
            }
        }
        return false;
    } catch (error) {
        return false;
    }
}

async function startEmulator() {
    console.log(`Starting emulator: ${AVD_NAME}...`);

    // Start emulator in detached mode so it keeps running
    const emulator = spawn(EMULATOR_PATH, ['-avd', AVD_NAME, '-wipe-data'], {
        detached: true,
        stdio: 'ignore'
    });

    emulator.unref();

    console.log('Waiting for emulator to become ready...');

    let attempts = 0;
    while (attempts < 60) { // Wait up to 60 seconds
        if (checkConnectedDevices()) {
            console.log('Emulator connected!');
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        process.stdout.write('.');
        attempts++;
    }
    console.log('\nWarning: Emulator start timed out or is taking a long time.');
}

async function run() {
    if (!checkConnectedDevices()) {
        await startEmulator();
    } else {
        console.log('Android device already connected.');
    }

    process.env.ANDROID_HOME = SDK_PATH;
    console.log('Running: expo run:android');

    // Use 'npx' to ensure we use the project's expo
    const build = spawn('npx', ['expo', 'run:android'], {
        stdio: 'inherit',
        shell: true
    });

    build.on('close', (code) => {
        process.exit(code);
    });
}

run();
