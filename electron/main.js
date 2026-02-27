import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import isDev from 'electron-is-dev';
import { fork } from 'child_process';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let splashWindow;
let serverProcess;

function createSplashWindow() {
  const iconPath = isDev
    ? path.join(__dirname, '../public/icon.png')
    : path.join(__dirname, '../dist/client/icon.png');

  splashWindow = new BrowserWindow({
    width: 500,
    height: 300,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    show: false, // Don't show until ready to avoid flicker
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'splash-preload.js')
    }
  });

  if (isDev) {
    splashWindow.loadFile(path.join(__dirname, '../public/splash.html'));
  } else {
    splashWindow.loadFile(path.join(__dirname, '../dist/client/splash.html'));
  }

  splashWindow.once('ready-to-show', () => {
    splashWindow.show();
    splashWindow.center();
    splashWindow.webContents.send('version', app.getVersion());
  });

  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

function createWindow() {
  const iconPath = isDev
    ? path.join(__dirname, '../public/icon.png')
    : path.join(__dirname, '../dist/client/icon.png');

  // Create the browser window.
  mainWindow = new BrowserWindow({
    title: "xIT Video Studio",
    width: 1280,
    height: 800,
    show: false, // Don't show until ready
    icon: iconPath,
    autoHideMenuBar: true, // Hide default menu bar to use custom one
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // For easier IPC initially, consider security later
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built React app
    mainWindow.loadFile(path.join(__dirname, '../dist/client/index.html'));
  }

  // Wait for the window to be ready to show
  mainWindow.once('ready-to-show', () => {
    if (splashWindow) {
      splashWindow.webContents.send('status', 'Launching...');
      splashWindow.webContents.send('progress', 100);

      // Slight delay for better UX
      setTimeout(() => {
        if (splashWindow) splashWindow.close();
        mainWindow.show();
      }, 800);
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startServer() {
  let scriptPath;
  if (isDev) {
    scriptPath = path.join(__dirname, '../scripts/local-ffmpeg-server.js');
  } else {
    // In production, we use the bundled server in resources/dist/server/server.js
    scriptPath = path.join(process.resourcesPath, 'dist/server/server.js');
  }

  // In production, we might need to handle the script path differently
  // if it's bundled. But since we are forking, we expect the file to exist.
  // We'll ensure "scripts" folder is copied to resources in build config.

  // Set env vars for the server to know where ffmpeg binaries are
  // When packaged with electron-builder, ffmpeg-static binaries are unpacked
  // We need to point to the unpacked location
  let ffmpegPath = ffmpegStatic;
  let ffprobePath = ffprobeStatic.path;

  if (!isDev) {
      ffmpegPath = ffmpegPath.replace('app.asar', 'app.asar.unpacked');
      ffprobePath = ffprobePath.replace('app.asar', 'app.asar.unpacked');
  }

  const env = {
    ...process.env,
    FFMPEG_PATH: ffmpegPath,
    FFPROBE_PATH: ffprobePath,
    ELECTRON_RUN: 'true',
    // Pass user data path for writable access (DBs, logs, etc)
    USER_DATA_PATH: app.getPath('userData')
  };

  if (!isDev) {
     // In prod, resources are often in process.resourcesPath
     // We need to make sure the server script uses correct CWD
     env.CWD_OVERRIDE = process.resourcesPath;
  }

  console.log('Starting server from:', scriptPath);

  serverProcess = fork(scriptPath, [], {
    env,
    stdio: ['pipe', 'pipe', 'pipe', 'ipc']
  });

  serverProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(`[Server]: ${output}`);

    if (splashWindow) {
      if (output.includes('Restoring sessions from disk')) {
        splashWindow.webContents.send('status', 'Restoring sessions...');
        splashWindow.webContents.send('progress', 30);
      } else if (output.includes('Restored') && output.includes('sessions from disk')) {
        splashWindow.webContents.send('status', 'Server ready');
        splashWindow.webContents.send('progress', 60);
      } else if (output.includes('Local FFmpeg server running')) {
        splashWindow.webContents.send('status', 'Finalizing...');
        splashWindow.webContents.send('progress', 80);
      }
    }
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`[Server ERR]: ${data}`);
  });
}

app.on('ready', () => {
  createSplashWindow();
  startServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
