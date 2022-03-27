const { app, Tray, BrowserWindow, Menu, nativeImage, ipcMain } = require('electron');
const path = require('path');

const gateway = require('./discord-gateway');

const WINDOW_HEIGHT = 500;
const WINDOW_WIDTH = 300;

const appUI = {
  ipcMain,
  /** @type {Tray} */ tray: null,
  /** @type {BrowserWindow} */ window: null,
};

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  // eslint-disable-line global-require
  app.quit();
}

const createWindow = () => {
  const windowImage = nativeImage.createFromPath(path.join(app.getAppPath(), 'assets/icon.png'));
  const window = new BrowserWindow({
    icon: windowImage,
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    show: false,
    alwaysOnTop: true,
    resizable: false,
    maximizable: false,
    webPreferences: {
      nativeWindowOpen: true,
      preload: path.join(app.getAppPath(), 'src/pages/index.js'),
    },
  });

  window.on('minimize', hideWindow);
  window.on('maximize', e => e.preventDefault());
  window.on('close', hideWindow);
  window.loadFile('src/pages/index.html');
  return window;

  function hideWindow(e) {
    e.preventDefault();
    window.hide();
  }
};

/**
 * @param {BrowserWindow} window 
 */
 function createTray(window) {
  const trayImage = nativeImage.createFromPath(path.join(app.getAppPath(), 'assets/icon16.png'));
  const tray = new Tray(trayImage);
  tray.setToolTip('Discord RPC Gateway');
  tray.on('click', $=> {
    window.show();
  });

  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show', click: $=> window.show() },
    { label: 'Quit', click: $=> app.exit() },
  ]));

  return tray;
}


/**
 * @param {BrowserWindow} window 
 * @param {Tray} tray 
 */
 function setWindowPosition(window, tray) {
  const bounds = {
    x: tray.getBounds().x - WINDOW_WIDTH / 2,
    y: tray.getBounds().y,
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
  };

  if (tray.getBounds().y > 100) bounds.y -= window.getBounds().height;
  else bounds.y += tray.getBounds().height;

  window.setBounds(bounds);
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  appUI.window = createWindow();
  appUI.tray = createTray(appUI.window);
  setWindowPosition(appUI.window, appUI.tray);
  console.log('All set up and ready to go!');
  gateway.start(appUI);
});

app.on('window-all-closed', e => e.preventDefault());

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
