const { app, Tray, BrowserWindow } = require('electron');
const path = require('path');

const appUI = {
  /** @type {Tray} */ tray: null,
  /** @type {BrowserWindow} */ window: null,
};

app.on('window-all-closed', e => e.preventDefault());

app.whenReady().then(() => {
  appUI.window = createWindow();
  appUI.tray = createTray(appUI.window);
  setWindowPosition(appUI.window, appUI.tray);
});

/**
 * @param {BrowserWindow} window 
 */
function createTray(window) {
  const tray = new Tray(path.join(app.getAppPath(), 'assets/icon.jpg'));
  tray.setToolTip('Discord Radio my Friend!');

  tray.on('click', () => {
    window.loadFile('src/pages/index.html');
    window.show();
  });

  return tray;
}

function createWindow() {
  const window = new BrowserWindow({
    width: 350,
    height: 700,
    show: false,
    alwaysOnTop: true,
    resizable: false,
    maximizable: false,
    webPreferences: {
      nativeWindowOpen: true,
    }
  });

  window.on('minimize', hideWindow);
  window.on('maximize', e => e.preventDefault());
  window.on('close', hideWindow);
  return window;

  function hideWindow(e) {
    e.preventDefault();
    window.hide();
  }
}

/**
 * @param {BrowserWindow} window 
 * @param {Tray} tray 
 */
function setWindowPosition(window, tray) {
  const bounds = {
    x: tray.getBounds().x - window.getBounds().width / 2,
    y: tray.getBounds().y,
    width: window.getBounds().width,
    height: window.getBounds().height,
  };

  if (tray.getBounds().y > 100) bounds.y -= window.getBounds().height;
  else bounds.y += tray.getBounds().height;

  window.setBounds(bounds);
}
