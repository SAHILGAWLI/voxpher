const { app, BrowserWindow, ipcMain, Tray, Menu, globalShortcut, screen } = require('electron');
const path = require('path');
const Store = require('electron-store');

// Initialize store for saving app settings
const store = new Store();

// Keep a global reference of the window and tray objects
let mainWindow = null;
let tray = null;
let isQuitting = false;

// Window size constants
const MINIMAL_WIDTH = 100;
const MINIMAL_HEIGHT = 100;
const EXPANDED_WIDTH = 350; // Width for settings panel
const EXPANDED_HEIGHT = 500; // Height for settings panel

// Default window settings
const defaultSettings = {
  position: { x: null, y: null },
  isVisible: true,
  alwaysOnTop: true,
  settingsPanelOpen: false
};

// Load saved settings or use defaults
const loadSettings = () => {
  return {
    position: store.get('position', defaultSettings.position),
    isVisible: store.get('isVisible', defaultSettings.isVisible),
    alwaysOnTop: store.get('alwaysOnTop', defaultSettings.alwaysOnTop),
    settingsPanelOpen: store.get('settingsPanelOpen', defaultSettings.settingsPanelOpen)
  };
};

// Save settings
const saveSettings = (settings) => {
  for (const key in settings) {
    store.set(key, settings[key]);
  }
};

// Create the main application window
function createWindow() {
  const settings = loadSettings();
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  // Determine window size based on settings panel state
  const windowWidth = settings.settingsPanelOpen ? EXPANDED_WIDTH : MINIMAL_WIDTH;
  const windowHeight = settings.settingsPanelOpen ? EXPANDED_HEIGHT : MINIMAL_HEIGHT;
  
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: settings.position.x !== null ? settings.position.x : width - 100,
    y: settings.position.y !== null ? settings.position.y : height - 100,
    show: settings.isVisible,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: settings.alwaysOnTop,
    skipTaskbar: true,
    useContentSize: true,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Skip circular shape - it's problematic on some platforms
  // Load the index.html file
  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  // Save window position when moved
  mainWindow.on('moved', () => {
    const position = mainWindow.getPosition();
    saveSettings({ position: { x: position[0], y: position[1] } });
  });

  // Handle window close event
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      saveSettings({ isVisible: false });
      return false;
    }
  });
  
  // Ensure window stays within screen bounds when dragged
  mainWindow.on('will-move', (event, newBounds) => {
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
    
    // Calculate bounds
    let { x, y } = newBounds;
    
    // Keep window within horizontal bounds
    if (x < 0) x = 0;
    if (x + newBounds.width > screenWidth) {
      x = screenWidth - newBounds.width;
    }
    
    // Keep window within vertical bounds
    if (y < 0) y = 0;
    if (y + newBounds.height > screenHeight) {
      y = screenHeight - newBounds.height;
    }
    
    // If position needs adjustment, set it
    if (x !== newBounds.x || y !== newBounds.y) {
      event.preventDefault();
      mainWindow.setPosition(x, y);
    }
  });
}

// Create the system tray icon
function createTray() {
  tray = new Tray(path.join(__dirname, 'src', 'assets', 'icon.png'));
  
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Show/Hide Whispher Pro', 
      click: () => {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
          saveSettings({ isVisible: false });
        } else {
          mainWindow.show();
          saveSettings({ isVisible: true });
        }
      } 
    },
    { 
      label: 'Always on Top', 
      type: 'checkbox',
      checked: store.get('alwaysOnTop', defaultSettings.alwaysOnTop),
      click: (menuItem) => {
        mainWindow.setAlwaysOnTop(menuItem.checked);
        saveSettings({ alwaysOnTop: menuItem.checked });
      } 
    },
    { type: 'separator' },
    { 
      label: 'Quit', 
      click: () => {
        isQuitting = true;
        app.quit();
      } 
    }
  ]);
  
  tray.setToolTip('Whispher Pro');
  tray.setContextMenu(contextMenu);
  
  // Show/hide on tray icon click
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
      saveSettings({ isVisible: false });
    } else {
      mainWindow.show();
      saveSettings({ isVisible: true });
    }
  });
}

// Register global shortcuts
function registerShortcuts() {
  // Toggle visibility with Alt+W
  globalShortcut.register('Alt+W', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
      saveSettings({ isVisible: false });
    } else {
      mainWindow.show();
      saveSettings({ isVisible: true });
    }
  });
}

// Initialize the app
app.whenReady().then(() => {
  createWindow();
  createTray();
  registerShortcuts();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Handle IPC messages from renderer process
ipcMain.on('toggle-visibility', () => {
  if (mainWindow.isVisible()) {
    mainWindow.hide();
    saveSettings({ isVisible: false });
  } else {
    mainWindow.show();
    saveSettings({ isVisible: true });
  }
});

// Handle minimize window request
ipcMain.on('minimize-window', () => {
  console.log('Received minimize-window message');
  if (mainWindow) {
    console.log('Minimizing window');
    mainWindow.minimize();
  }
});

// Handle close window request
ipcMain.on('close-window', () => {
  console.log('Received close-window message');
  if (mainWindow) {
    console.log('Hiding window');
    mainWindow.hide();
    saveSettings({ isVisible: false });
  }
});

// Reset window to correct size
function resetToMinimalSize() {
  if (!mainWindow) return;
  
  const position = mainWindow.getPosition();
  console.log('Resetting window to standard size');
  
  // Force window to correct size
  mainWindow.setOpacity(0.99);
  mainWindow.setContentSize(MINIMAL_WIDTH, MINIMAL_HEIGHT, true);
  mainWindow.setSize(MINIMAL_WIDTH, MINIMAL_HEIGHT, true);
  
  // Skip circular shape - it's problematic on some platforms
  
  // Confirm size
  const size = mainWindow.getSize();
  console.log(`After reset size: ${size[0]}x${size[1]}`);
  
  // Restore opacity
  setTimeout(() => {
    mainWindow.setOpacity(1.0);
  }, 50);
  
  // Save the position
  saveSettings({
    position: { x: position[0], y: position[1] },
    settingsPanelOpen: false 
  });
}

// Function to make window circular - disabled due to platform compatibility issues
function makeWindowCircular(size) {
  // This function is intentionally disabled
  console.log('Circular window shape is disabled to avoid platform compatibility issues');
  return;
}

// Handle settings panel open/close
ipcMain.on('toggle-settings-panel', (event, isOpen) => {
  if (!mainWindow) return;
  
  // Update tracked state
  store.set('settingsPanelOpen', isOpen);
  
  const { width } = screen.getPrimaryDisplay().workAreaSize;
  const position = mainWindow.getPosition();
  
  if (isOpen) {
    // Expanding for settings panel
    console.log('Expanding window for settings panel');
    
    // Resize window to fit settings panel
    mainWindow.setSize(EXPANDED_WIDTH, EXPANDED_HEIGHT);
    
    // Adjust position to keep window in view
    let newX = position[0];
    if (newX + EXPANDED_WIDTH > width) {
      newX = width - EXPANDED_WIDTH - 20;
    }
    
    mainWindow.setPosition(newX, position[1]);
    
    // Save the position and state
    saveSettings({ 
      position: { x: newX, y: position[1] },
      settingsPanelOpen: true
    });
  } else {
    // Reset to minimal size for mic mode
    resetToMinimalSize();
  }
});

// Handle electron-store IPC events
ipcMain.on('electron-store-set', (event, key, value) => {
  store.set(key, value);
});

ipcMain.handle('electron-store-get', (event, key, defaultValue) => {
  return store.get(key, defaultValue);
});

ipcMain.on('electron-store-delete', (event, key) => {
  store.delete(key);
});

// Handle explicit force reset request
ipcMain.on('force-reset-window', () => {
  resetToMinimalSize();
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Clean up before quitting
app.on('before-quit', () => {
  isQuitting = true;
  globalShortcut.unregisterAll();
});

// Handle macOS dock click
app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
}); 