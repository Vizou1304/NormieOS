const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path  = require('path');
const { spawn } = require('child_process');

let mainWindow;

let _cachedPiperPath = null;
function getPiperPath() {
  if (_cachedPiperPath) return _cachedPiperPath;
  const { execSync } = require('child_process');
  try {
    _cachedPiperPath = execSync('which piper').toString().trim();
  } catch {
    _cachedPiperPath = process.platform === 'linux' ? '/usr/local/bin/piper' : 'piper';
  }
  return _cachedPiperPath;
}

function createBrowserWindow(url) {
  const win = new BrowserWindow({
    width: 900, height: 650,
    title: 'NormiesOS Browser',
    backgroundColor: '#48494b',
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  });
  win.loadURL(url);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    backgroundColor: '#e3e5e4',
    fullscreen: true,
    kiosk: true,
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      // nodeIntegration DOIT rester true tant que le renderer utilise
      // require('fs') et require('electron') directement (Terminal, App Dir).
      // Migration prévue Phase 4 : tout passe par preload via ipcMain/ipcRenderer.
      nodeIntegration: true,
      contextIsolation: false,          // cohérent avec nodeIntegration: true
      preload: path.join(__dirname, 'preload.js'),  // ← branché
      webviewTag: true,
    }
  });

  mainWindow.setMenuBarVisibility(false);

  // DEV : ouvrir DevTools en commentant/décommentant
  // mainWindow.webContents.openDevTools();

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    createBrowserWindow(url);
    return { action: 'deny' };
  });
}


ipcMain.on('wallet-disconnect', () => {
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'lock-screen.html'));
});

// ── Piper TTS IPC ────────────────────────────────────────────────────────

ipcMain.handle('check-piper', () => new Promise(resolve => {
  const proc = spawn('which', ['piper']);
  proc.on('close', code  => resolve(code === 0 ? 'found' : 'not-found'));
  proc.on('error', ()    => resolve('not-found'));
}));

let _piperProc = null;
let _aplayProc = null;

ipcMain.handle('speak-normie', (_, { text, gender }) => {
  const VOICE_MAP = {
    'male':       'en_US-ryan-medium',
    'female':     'en_US-lessac-medium',
    'non-binary': 'en_US-ryan-medium',
  };
  const safeGender = String(gender || 'male').toLowerCase();
  const modelName = VOICE_MAP[safeGender] || 'en_US-ryan-medium';
  const modelPath = path.join(require('os').homedir(), '.local', 'share', 'piper', 'voices', modelName + '.onnx');

  console.log('[PIPER] using model:', modelPath, '| gender received:', gender);
  // Kill any in-progress piper + aplay to avoid zombie processes
  if (_aplayProc) { try { _aplayProc.kill(); } catch {} _aplayProc = null; }
  if (_piperProc) { try { _piperProc.kill(); } catch {} _piperProc = null; }

  const piper = spawn(getPiperPath(), ['--model', modelPath, '--output_raw']);
  const aplay = spawn('aplay', ['-r', '22050', '-f', 'S16_LE', '-t', 'raw', '-']);
  piper.stdin.write(text + '\n');
  piper.stdin.end();
  piper.stdout.pipe(aplay.stdin);

  _piperProc = piper;
  _aplayProc = aplay;
  piper.on('close', () => { _piperProc = null; });
  piper.on('error', () => { _piperProc = null; });
  aplay.on('close', () => { _aplayProc = null; mainWindow.webContents.send('tts-finished'); });
  aplay.on('error', () => { _aplayProc = null; });

  piper.stderr.on('data', d => console.error('[PIPER]', d.toString()));
  aplay.stderr.on('data', d => console.error('[APLAY]', d.toString()));
  piper.on('error', e => console.error('[PIPER ERROR]', e));
  aplay.on('error', e => console.error('[APLAY ERROR]', e));

  return 'speaking';
});

// ── RetroArch IPC ─────────────────────────────────────────────────────────

ipcMain.handle('check-retroarch', () => new Promise(resolve => {
  const cmd  = process.platform === 'win32' ? 'where' : 'which';
  const proc = spawn(cmd, ['retroarch']);
  proc.on('close', code  => resolve(code === 0 ? 'found' : 'not-found'));
  proc.on('error', ()    => resolve('not-found'));
}));

ipcMain.handle('install-retroarch', (event) => new Promise((resolve, reject) => {
  const [cmd, args] = process.platform === 'win32'
    ? ['winget', ['install', '--id', 'Libretro.RetroArch', '-e', '--silent']]
    : ['sudo', ['apt-get', 'install', '-y', 'retroarch']];
  const proc = spawn(cmd, args, { shell: true });
  proc.stdout.on('data', d => event.sender.send('install-progress', d.toString()));
  proc.stderr.on('data', d => event.sender.send('install-progress', d.toString()));
  proc.on('close', code  => code === 0 ? resolve('done') : reject(new Error('install failed — code ' + code)));
  proc.on('error', err   => reject(err));
}));

ipcMain.handle('select-rom', async () => {
  const result = await dialog.showOpenDialog({
    title: 'SELECT ROM',
    properties: ['openFile'],
    filters: [{ name: 'ROMs', extensions: ['gb','gbc','nes','sfc','smc','gba','md','bin','sms','cue','iso'] }],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('launch-retroarch', (_, { romPath, core }) => {
  const CORE_MAP = {
    nes:  'fceumm_libretro',
    snes: 'snes9x_libretro',
    gb:   'gambatte_libretro',
    gba:  'mgba_libretro',
    sega: 'genesis_plus_gx_libretro',
    psx:  'pcsx_rearmed_libretro',
  };
  const ext      = process.platform === 'win32' ? '.dll' : '.so';
  const coreFile = (CORE_MAP[core] || core) + ext;
  spawn('retroarch', ['-L', coreFile, romPath], { detached: true, stdio: 'ignore' }).unref();
  return 'launched';
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
