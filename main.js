const { app, BrowserWindow, ipcMain, net } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
    let platformIcon = 'icon.png';
    if (process.platform === 'win32') platformIcon = 'icon.ico';
    if (process.platform === 'darwin') platformIcon = 'icon.icns';

    mainWindow = new BrowserWindow({
        width: 800,
        height: 500,
        frame: false,
        transparent: true,
        icon: path.join(__dirname, 'assets', platformIcon),
        show: false, // Prevents the invisible window glitch
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'renderer.js')
        }
    });

    mainWindow.loadFile('index.html');

    // Force-reveal the neon container once HTML/CSS is parsed completely
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.focus();
    });

    // Force the Mac dock to manually render the target asset 
    if (process.platform === 'darwin') {
        app.dock.setIcon(path.join(__dirname, 'assets', 'icon.icns'));
    }
}

app.whenReady().then(createWindow);

// Keep your background downloader script connection running cleanly
ipcMain.on('trigger-real-download', (event, targetUrl) => {
    try {
        const urlObj = new URL(targetUrl);
        const filename = path.basename(urlObj.pathname) || 'downloaded_file.bin';
        const savePath = path.join(app.getPath('downloads'), filename);

        event.reply('terminal-log', `Initiating stream connection to ${urlObj.hostname}...`);

        const request = net.request(targetUrl);
        
        request.on('response', (response) => {
            if (response.statusCode !== 200) {
                event.reply('terminal-log', `Error: Server responded with status ${response.statusCode}`);
                return;
            }

            const fileStream = fs.createWriteStream(savePath);
            let downloadedBytes = 0;
            const totalBytes = parseInt(response.headers['content-length'], 10) || 0;

            response.on('data', (chunk) => {
                fileStream.write(chunk);
                downloadedBytes += chunk.length;
                if (totalBytes > 0) {
                    const percent = Math.round((downloadedBytes / totalBytes) * 100);
                    event.reply('terminal-progress', percent);
                }
            });

            response.on('end', () => {
                fileStream.end();
                event.reply('terminal-log', `Success! File saved locally to:\n ${savePath}`);
            });
        });

        request.on('error', (err) => {
            event.reply('terminal-log', `Network Error: ${err.message}`);
        });

        request.end();

    } catch (err) {
        event.reply('terminal-log', `Invalid URL format. Include http:// or https://`);
    }
});
// Listen for the exit command from the user interface
ipcMain.on('close-application', () => {
    if (mainWindow) {
        mainWindow.close(); // Gracefully closes the borderless browser frame
    }
});

