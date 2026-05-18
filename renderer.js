const { contextBridge, ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('cmdInput');
    const output = document.getElementById('output');

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const rawInput = input.value.trim();
            const parts = rawInput.split(' ');
            const command = parts[0].toLowerCase();
            const argument = parts[1];

            output.innerHTML += `<div>$ ${rawInput}</div>`;

            if (command === 'download' && argument) {
                ipcRenderer.send('trigger-real-download', argument);
            } else if (command === 'clear') {
                output.innerHTML = '';
            } else if (command === 'exit') {
                ipcRenderer.send('close-application');
            } else {
                output.innerHTML += `<div>Command not recognized or missing target link.</div>`;
            }
            input.value = '';
        }
    });

    // Handle string notifications back from Node
    ipcRenderer.on('terminal-log', (event, message) => {
        output.innerHTML += `<div>${message}</div>`;
        output.scrollTop = output.scrollHeight;
    });

    // Handle real-time visual progress counter adjustments
    ipcRenderer.on('terminal-progress', (event, percent) => {
        const progressLines = output.getElementsByClassName('prog-line');
        if (progressLines.length > 0) {
            progressLines[progressLines.length - 1].innerText = `Downloading: [${percent}%]`;
        } else {
            output.innerHTML += `<div class="prog-line">Downloading: [${percent}%]</div>`;
        }
    });
});
