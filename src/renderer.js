// DOM Elements
const micButton = document.getElementById('micButton');
const statusIndicator = document.getElementById('statusIndicator');
const settingsPanel = document.getElementById('settingsPanel');
const closeSettingsButton = document.getElementById('closeSettingsButton');
const apiKeyInput = document.getElementById('apiKeyInput');
const modelSelect = document.getElementById('modelSelect');
const languageSelect = document.getElementById('languageSelect');
const autoCopyToggle = document.getElementById('autoCopyToggle');
const interfaceModeToggle = document.getElementById('interfaceModeToggle');
const saveSettingsButton = document.getElementById('saveSettingsButton');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');
const micContainer = document.querySelector('.mic-container');

// Text Preview Panel Elements
const textPreviewPanel = document.getElementById('textPreviewPanel');
const previewStatus = document.getElementById('previewStatus');
const textDisplay = document.getElementById('textDisplay');
const recordButton = document.getElementById('recordButton');
const copyButton = document.getElementById('copyButton');
const clearButton = document.getElementById('clearButton');
const settingsButton = document.getElementById('settingsButton');
const minimizeButton = document.getElementById('minimizeButton');

// Get direct access to ipcRenderer
const { ipcRenderer } = require('electron');

// State variables
let recorder = null;
let stream = null;
let isRecording = false;
let doubleClickTimeout = null;
let isSettingsVisible = false;
let isTextPreviewVisible = false;
let isDragging = false;
let currentTranscription = '';
let interfaceMode = 'mic'; // 'mic' or 'text'

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
  // Load saved settings
  await loadSettings();
  
  // Set up event listeners
  setupEventListeners();
  
  // Add resize handler
  window.addEventListener('resize', () => {
    adjustLayout();
    showDebugInfo();
  });
  
  // Initialize layout
  adjustLayout();
  
  // Show initial debug info
  showDebugInfo();
  
  // Check if this is one of the first few uses of the app
  const usageCount = await ipcRenderer.invoke('electron-store-get', 'usageCount', 0);
  
  // Increment usage count
  ipcRenderer.send('electron-store-set', 'usageCount', usageCount + 1);
  
  // Show drag tooltip for the first 5 uses
  const tooltip = document.querySelector('.tooltip');
  if (usageCount < 5) {
    // Show tooltip immediately on startup
    tooltip.style.opacity = '1';
    
    // After 3 seconds, add a class to make tooltip pulse to draw attention
    setTimeout(() => {
      tooltip.classList.add('pulse');
    }, 3000);
    
    // Remove the pulse and let it return to hover-only state after 6 seconds
    setTimeout(() => {
      tooltip.classList.remove('pulse');
      tooltip.style.opacity = '';  // Reset to CSS default (hover-only)
    }, 6000);
  } else {
    // Hide tooltip for experienced users
    tooltip.style.display = 'none';
  }
});

// Load settings from electron-store
async function loadSettings() {
  try {
    // Load API key
    const apiKey = await ipcRenderer.invoke('electron-store-get', 'groq_api_key', '');
    if (apiKey) {
      apiKeyInput.value = apiKey;
    }
    
    // Load model preference
    const savedModel = await ipcRenderer.invoke('electron-store-get', 'preferred_model', '');
    if (savedModel) {
      modelSelect.value = savedModel;
    }
    
    // Load language preference
    const savedLanguage = await ipcRenderer.invoke('electron-store-get', 'preferred_language', '');
    if (savedLanguage) {
      languageSelect.value = savedLanguage;
    }
    
    // Load auto-copy preference
    const autoCopy = await ipcRenderer.invoke('electron-store-get', 'auto_copy', 'true');
    autoCopyToggle.value = autoCopy;
    
    // Load interface mode preference
    interfaceMode = await ipcRenderer.invoke('electron-store-get', 'interface_mode', 'mic');
    interfaceModeToggle.value = interfaceMode;
    
    // Check if settings panel was open
    const settingsPanelOpen = await ipcRenderer.invoke('electron-store-get', 'settingsPanelOpen', false);
    
    // Check if text preview panel was open
    const textPreviewPanelOpen = await ipcRenderer.invoke('electron-store-get', 'textPreviewPanelOpen', false);
    
    // Reset panel states
    isSettingsVisible = settingsPanelOpen;
    isTextPreviewVisible = textPreviewPanelOpen;
    
    if (settingsPanelOpen) {
      // Show settings panel
      document.querySelector('.mic-container').style.display = 'none';
      textPreviewPanel.classList.remove('visible');
      setTimeout(() => {
        settingsPanel.classList.add('visible');
        showDebugInfo();
      }, 100);
    } else if (textPreviewPanelOpen || (interfaceMode === 'text' && !settingsPanelOpen)) {
      // Show text preview panel
      document.querySelector('.mic-container').style.display = 'none';
      settingsPanel.classList.remove('visible');
      setTimeout(() => {
        textPreviewPanel.classList.add('visible');
        isTextPreviewVisible = true;
        showDebugInfo();
      }, 100);
      
      // Ensure window is expanded
      ipcRenderer.send('toggle-settings-panel', true);
    } else {
      // Show mic container
      document.querySelector('.mic-container').style.display = 'flex';
      settingsPanel.classList.remove('visible');
      textPreviewPanel.classList.remove('visible');
      
      // Ensure window is at minimal size
      ipcRenderer.send('toggle-settings-panel', false);
    }
  } catch (err) {
    console.error('Error loading settings:', err);
  }
}

// Set up event listeners
function setupEventListeners() {
  // Mic button - handle single click vs double click
  micButton.addEventListener('click', handleMicClick);
  micButton.addEventListener('dblclick', showSettings);
  
  // Add drag behavior tracking for cursor visual feedback
  micContainer.addEventListener('mousedown', () => {
    isDragging = true;
    micContainer.classList.add('dragging');
  });
  
  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      micContainer.classList.remove('dragging');
    }
  });
  
  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      // This ensures the cursor stays as 'grabbing' during the drag operation
      e.preventDefault();
    }
  });
  
  // Settings panel controls
  closeSettingsButton.addEventListener('click', hideSettings);
  
  // Save settings
  saveSettingsButton.addEventListener('click', saveSettings);
  
  // Text Preview Panel controls
  recordButton.addEventListener('click', toggleRecordingFromPreview);
  copyButton.addEventListener('click', copyTranscription);
  clearButton.addEventListener('click', clearTranscription);
  settingsButton.addEventListener('click', showSettings);
  minimizeButton.addEventListener('click', showMicInterface);
  
  // Keyboard controls
  document.addEventListener('keydown', (e) => {
    // Close window on Escape key
    if (e.key === 'Escape') {
      if (isSettingsVisible) {
        hideSettings();
      } else if (isTextPreviewVisible && interfaceMode === 'mic') {
        showMicInterface();
      } else {
        ipcRenderer.send('close-window');
      }
    }
    
    // Reset window with Ctrl+R (emergency reset)
    if (e.key === 'r' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      forceReset();
    }
  });
}

// Toggle recording from preview panel
function toggleRecordingFromPreview() {
  if (isRecording) {
    recordButton.textContent = 'Record';
    previewStatus.textContent = 'Processing...';
    previewStatus.classList.remove('recording');
    previewStatus.classList.add('processing');
    stopRecording();
  } else {
    recordButton.textContent = 'Stop';
    previewStatus.textContent = 'Recording...';
    previewStatus.classList.add('recording');
    startRecording();
  }
}

// Copy transcription to clipboard
function copyTranscription() {
  if (currentTranscription) {
    navigator.clipboard.writeText(currentTranscription)
      .then(() => {
        copyButton.textContent = 'Copied!';
        
        // Update the status indicator for consistency with auto-copy
        if (isTextPreviewVisible) {
          previewStatus.textContent = 'Copied to clipboard';
          previewStatus.className = 'preview-status copied';
          
          // Reset everything after 2 seconds
          setTimeout(() => {
            copyButton.textContent = 'Copy';
            previewStatus.textContent = 'Ready';
            previewStatus.className = 'preview-status';
          }, 2000);
        } else {
          setTimeout(() => {
            copyButton.textContent = 'Copy';
          }, 2000);
        }
      });
  }
}

// Clear transcription
function clearTranscription() {
  currentTranscription = '';
  textDisplay.textContent = '';
  clearButton.disabled = true;
  copyButton.disabled = true;
  setTimeout(() => {
    clearButton.disabled = false;
    copyButton.disabled = false;
  }, 500);
}

// Show mic interface
function showMicInterface() {
  // Hide text preview panel
  textPreviewPanel.classList.remove('visible');
  
  // Tell main process to resize window back to minimal size
  ipcRenderer.send('toggle-settings-panel', false);
  
  // Wait for the transition and window resize to complete
  setTimeout(() => {
    // Update state
    isTextPreviewVisible = false;
    
    // Show mic container
    document.querySelector('.mic-container').style.display = 'flex';
    
    // Update stored state
    ipcRenderer.send('electron-store-set', 'textPreviewPanelOpen', false);
    
    // Update debug info
    showDebugInfo();
  }, 300);
}

// Show text preview interface
function showTextPreview() {
  // Update state
  isTextPreviewVisible = true;
  
  // Update stored state and tell the main process to resize the window
  ipcRenderer.send('toggle-settings-panel', true);
  ipcRenderer.send('electron-store-set', 'textPreviewPanelOpen', true);
  
  // Hide mic container immediately
  document.querySelector('.mic-container').style.display = 'none';
  
  // Small delay to allow window resize before showing panel
  setTimeout(() => {
    // Show text preview panel
    textPreviewPanel.classList.add('visible');
    
    // Update status
    previewStatus.textContent = isRecording ? 'Recording...' : 'Ready';
    previewStatus.className = 'preview-status';
    if (isRecording) {
      previewStatus.classList.add('recording');
      recordButton.textContent = 'Stop';
    }
    
    // Update debug info
    showDebugInfo();
  }, 100);
}

// Handle mic button click (single vs double click detection)
function handleMicClick(e) {
  // Prevent double-click from triggering both click and dblclick
  if (doubleClickTimeout !== null) {
    clearTimeout(doubleClickTimeout);
    doubleClickTimeout = null;
    return;
  }
  
  doubleClickTimeout = setTimeout(() => {
    doubleClickTimeout = null;
    if (interfaceMode === 'text' && !isTextPreviewVisible) {
      showTextPreview();
    } else {
      toggleRecording();
    }
  }, 200);
}

// Show settings panel
function showSettings() {
  // Update state first
  isSettingsVisible = true;
  
  // Update stored state and tell the main process to resize the window
  ipcRenderer.send('toggle-settings-panel', true);
  ipcRenderer.send('electron-store-set', 'settingsPanelOpen', true);
  ipcRenderer.send('electron-store-set', 'textPreviewPanelOpen', false);
  
  // Hide other interfaces immediately
  document.querySelector('.mic-container').style.display = 'none';
  textPreviewPanel.classList.remove('visible');
  isTextPreviewVisible = false;
  
  // Small delay to allow window resize before showing panel
  setTimeout(() => {
    // Show settings panel
    settingsPanel.classList.add('visible');
    
    // Update debug info
    showDebugInfo();
  }, 100);
}

// Hide settings panel
function hideSettings() {
  // First hide the settings panel
  settingsPanel.classList.remove('visible');
  
  // Tell main process to resize window if needed
  if (interfaceMode === 'text') {
    // Show text preview panel
    showTextPreview();
  } else {
    // Resize to minimal size for mic mode
    ipcRenderer.send('toggle-settings-panel', false);
    
    // Wait for the transition and window resize to complete
    setTimeout(() => {
      // Only update state after panel is fully hidden
      isSettingsVisible = false;
      
      // Show mic container
      document.querySelector('.mic-container').style.display = 'flex';
      
      // Update stored state
      ipcRenderer.send('electron-store-set', 'settingsPanelOpen', false);
      
      // Update debug info
      showDebugInfo();
    }, 300);
  }
}

// Save settings
async function saveSettings() {
  const apiKey = apiKeyInput.value.trim();
  
  // Save API key
  if (apiKey) {
    ipcRenderer.send('electron-store-set', 'groq_api_key', apiKey);
  }
  
  // Save model preference
  ipcRenderer.send('electron-store-set', 'preferred_model', modelSelect.value);
  
  // Save language preference
  ipcRenderer.send('electron-store-set', 'preferred_language', languageSelect.value);
  
  // Save auto-copy preference
  ipcRenderer.send('electron-store-set', 'auto_copy', autoCopyToggle.value);
  
  // Save interface mode preference
  const newInterfaceMode = interfaceModeToggle.value;
  ipcRenderer.send('electron-store-set', 'interface_mode', newInterfaceMode);
  
  // Check if interface mode has changed
  const modeChanged = interfaceMode !== newInterfaceMode;
  interfaceMode = newInterfaceMode;
  
  // Show success toast
  showToast('Settings saved!');
  
  // Hide settings panel and show appropriate interface
  if (modeChanged) {
    hideSettings();
  } else {
    hideSettings();
  }
}

// Toggle recording state
function toggleRecording() {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

// Start recording
async function startRecording() {
  try {
    // Update UI - only use visual cues
    micButton.classList.add('state-changing');
    micButton.classList.add('recording');
    
    // Ensure icon state is correct when starting recording
    document.querySelector('.mic-icon').style.display = 'block';
    document.querySelector('.copy-icon').style.display = 'none';
    document.querySelector('.success-icon').style.display = 'none';
    
    // Remove transition class after animation completes
    setTimeout(() => {
      micButton.classList.remove('state-changing');
    }, 300);
    
    // Import RecordRTC dynamically
    const RecordRTC = require('recordrtc');
    
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    recorder = new RecordRTC(stream, {
      type: 'audio',
      mimeType: 'audio/wav',
      recorderType: RecordRTC.StereoAudioRecorder,
      numberOfAudioChannels: 1,
      desiredSampRate: 16000, // Whisper expects 16kHz
      timeSlice: 1000, // Get data every second
    });
    
    recorder.startRecording();
    isRecording = true;
  } catch (err) {
    // For errors we still need to show something to help the user understand what went wrong
    console.error('Recording error:', err);
    resetRecordingUI();
    
    // Also reset preview UI if it's visible
    if (isTextPreviewVisible) {
      previewStatus.textContent = 'Error';
      previewStatus.className = 'preview-status';
      recordButton.textContent = 'Record';
    }
  }
}

// Reset recording UI
function resetRecordingUI() {
  // Add animation class for state transition
  micButton.classList.add('state-changing');
  
  // Remove all state classes
  micButton.classList.remove('recording');
  micButton.classList.remove('processing');
  micButton.classList.remove('transcribing');
  micButton.classList.remove('success');
  micButton.classList.remove('copied');
  
  // Reset icons
  document.querySelector('.mic-icon').style.display = 'block';
  document.querySelector('.copy-icon').style.display = 'none';
  document.querySelector('.success-icon').style.display = 'none';
  
  // Remove transition animation class after animation completes
  setTimeout(() => {
    micButton.classList.remove('state-changing');
  }, 300);
}

// Stop recording
function stopRecording() {
  if (!recorder) return;
  
  isRecording = false;
  resetRecordingUI();
  
  // Show processing state - visual cue only
  micButton.classList.add('state-changing');
  micButton.classList.add('processing');
  
  // Ensure mic icon is visible during processing
  document.querySelector('.mic-icon').style.display = 'block';
  document.querySelector('.copy-icon').style.display = 'none';
  document.querySelector('.success-icon').style.display = 'none';
  
  // Remove transition class after animation completes
  setTimeout(() => {
    micButton.classList.remove('state-changing');
  }, 300);
  
  try {
    recorder.stopRecording(() => {
      const blob = recorder.getBlob();
      transcribeAudio(blob);
      
      // Clean up
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
      }
      recorder = null;
    });
  } catch (err) {
    console.error('Stop recording error:', err);
    resetRecordingUI();
    
    // Also reset preview UI if it's visible
    if (isTextPreviewVisible) {
      previewStatus.textContent = 'Error';
      previewStatus.className = 'preview-status';
      recordButton.textContent = 'Record';
    }
  }
}

// Transcribe audio
async function transcribeAudio(audioBlob) {
  try {
    // Switch from processing to transcribing state - visual cue only
    micButton.classList.remove('processing');
    micButton.classList.add('state-changing');
    micButton.classList.add('transcribing');
    
    // Ensure mic icon is visible during transcribing
    document.querySelector('.mic-icon').style.display = 'block';
    
    // Remove transition class after animation completes
    setTimeout(() => {
      micButton.classList.remove('state-changing');
    }, 300);
    
    // Update preview UI if visible
    if (isTextPreviewVisible) {
      previewStatus.textContent = 'Transcribing...';
      previewStatus.className = 'preview-status processing';
    }
    
    // Get the current API key from input or stored value
    const apiKey = apiKeyInput.value.trim() || await ipcRenderer.invoke('electron-store-get', 'groq_api_key', '');
    
    if (!apiKey) {
      throw new Error('API key is missing.');
    }
    
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.wav');
    formData.append('model', modelSelect.value);
    
    // Add language if specified
    const language = languageSelect.value;
    if (language) {
      formData.append('language', language);
    }
    
    // Using the correct Groq API endpoint
    const endpoint = 'https://api.groq.com/openai/v1/audio/transcriptions';
    
    console.log('Sending request to Groq API...');
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error response:', errorText);
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Transcription received:', data);
    
    // Save the transcription
    currentTranscription = data.text || '';
    
    // Check if auto-copy is enabled
    const autoCopy = await ipcRenderer.invoke('electron-store-get', 'auto_copy', 'true');
    
    // Update the text display if preview is visible
    if (isTextPreviewVisible) {
      textDisplay.textContent = currentTranscription;
      previewStatus.textContent = 'Ready';
      previewStatus.className = 'preview-status';
      recordButton.textContent = 'Record';
      copyButton.disabled = !currentTranscription;
      clearButton.disabled = !currentTranscription;
      
      // Provide feedback when auto-copy is enabled
      if (autoCopy === 'true' && currentTranscription) {
        // Copy to clipboard automatically
        await navigator.clipboard.writeText(currentTranscription);
        
        // Show visual feedback in the preview panel
        copyButton.textContent = 'Copied!';
        previewStatus.textContent = 'Copied to clipboard';
        previewStatus.className = 'preview-status copied';
        
        // Reset button text after 2 seconds
        setTimeout(() => {
          copyButton.textContent = 'Copy';
          previewStatus.textContent = 'Ready';
          previewStatus.className = 'preview-status';
        }, 2000);
      }
    }
    
    // Show success state - visual cue only for mic mode
    micButton.classList.remove('transcribing');
    micButton.classList.add('state-changing');
    micButton.classList.add('success');
    
    // Display success icon
    document.querySelector('.mic-icon').style.display = 'none';
    document.querySelector('.copy-icon').style.display = 'none';
    document.querySelector('.success-icon').style.display = 'block';
    
    // Remove transition class after animation completes
    setTimeout(() => {
      micButton.classList.remove('state-changing');
    }, 300);
    
    // Handle auto-copy for mic mode
    if (autoCopy === 'true' && data.text && !isTextPreviewVisible) {
      // Copy to clipboard automatically for mic mode
      await navigator.clipboard.writeText(data.text);
      
      // Show copied state - visual cue only
      setTimeout(() => {
        // Switch from success to copied
        micButton.classList.remove('success');
        micButton.classList.add('copied');
        document.querySelector('.success-icon').style.display = 'none';
        document.querySelector('.copy-icon').style.display = 'block';
        
        // Return to normal state after animation
        setTimeout(() => {
          resetRecordingUI();
        }, 1500);
      }, 1000);
    } else if (!isTextPreviewVisible) {
      // If not auto-copying in mic mode, return to normal state after a moment
      setTimeout(() => {
        resetRecordingUI();
      }, 1500);
    }
    
    // Fail-safe: Always reset to mic state after a maximum time
    // This ensures the UI doesn't get stuck in any state
    if (!isTextPreviewVisible) {
      const MAXIMUM_STATE_TIME = 5000; // 5 seconds max in any state
      setTimeout(() => {
        // Only reset if we're still in a non-default state
        if (micButton.classList.contains('success') || 
            micButton.classList.contains('copied') ||
            micButton.classList.contains('processing') || 
            micButton.classList.contains('transcribing')) {
          console.log('Fail-safe: Resetting mic UI to default state');
          resetRecordingUI();
        }
      }, MAXIMUM_STATE_TIME);
    }
  } catch (err) {
    console.error('Transcription error:', err);
    resetRecordingUI();
    
    // Update preview UI if visible
    if (isTextPreviewVisible) {
      previewStatus.textContent = 'Error';
      previewStatus.className = 'preview-status';
      recordButton.textContent = 'Record';
    }
  }
}

// Show status indicator - completely disabled to remove text popups
function showStatus(message) {
  // Function disabled to remove text indicators
  console.log('Status (hidden from UI):', message);
}

// Show toast notification - completely disabled to remove text popups
function showToast(message, isError = false) {
  // Function disabled to remove text indicators
  console.log('Toast (hidden from UI):', message, isError ? '(Error)' : '');
  
  // Still reset UI on error
  if (isError) {
    resetRecordingUI();
  }
}

// Force a complete reset of the UI and window state
function forceReset() {
  console.log('Forcing complete UI reset');
  
  // Hide all panels and reset state
  settingsPanel.classList.remove('visible');
  textPreviewPanel.classList.remove('visible');
  isSettingsVisible = false;
  isTextPreviewVisible = false;
  
  // Reset body dimensions
  document.body.style.minHeight = '0';
  document.body.style.minWidth = '0';
  document.body.style.maxHeight = '100px'; // Updated from 80px to 100px
  document.body.style.maxWidth = '100px';  // Updated from 80px to 100px
  
  // Reset overflow
  document.body.style.overflow = 'hidden';
  document.documentElement.style.overflow = 'hidden';
  
  // Update stored state
  ipcRenderer.send('electron-store-set', 'settingsPanelOpen', false);
  ipcRenderer.send('electron-store-set', 'textPreviewPanelOpen', false);
  
  // Force dedicated reset in main process
  ipcRenderer.send('force-reset-window');
  
  // Show mic container
  document.querySelector('.mic-container').style.display = 'flex';
  
  // Update UI
  showDebugInfo();
}

// Adjust layout based on window size
function adjustLayout() {
  const isWideEnough = window.innerWidth > 100; // Changed from 80 to 100
  
  // If we're in minimal mode but window is larger than it should be,
  // do a complete reset
  if (!isSettingsVisible && !isTextPreviewVisible && isWideEnough) {
    forceReset();
  }
}

// Display debug information
function showDebugInfo() {
  // Create debug info element if it doesn't exist
  let debugInfo = document.getElementById('debugInfo');
  if (!debugInfo) {
    debugInfo = document.createElement('div');
    debugInfo.id = 'debugInfo';
    debugInfo.style.position = 'fixed';
    debugInfo.style.top = '5px';
    debugInfo.style.right = '5px';
    debugInfo.style.padding = '5px';
    debugInfo.style.backgroundColor = 'rgba(0,0,0,0.7)';
    debugInfo.style.color = 'white';
    debugInfo.style.fontSize = '10px';
    debugInfo.style.zIndex = '9999';
    debugInfo.style.pointerEvents = 'none';
    debugInfo.style.borderRadius = '3px';
    
    // Set display: none to hide the debug info
    debugInfo.style.display = 'none';
    
    document.body.appendChild(debugInfo);
  }
  
  // Settings state color
  const stateColor = isSettingsVisible ? 'red' : (isTextPreviewVisible ? 'orange' : 'green');
  const stateText = isSettingsVisible ? 'SETTINGS' : (isTextPreviewVisible ? 'TEXT' : 'MIC');
  
  // Update debug information
  debugInfo.innerHTML = `
    <div>Window: ${window.innerWidth}x${window.innerHeight}</div>
    <div>Mode: <span style="color:${stateColor}">${stateText}</span></div>
    <div style="font-size:8px">(Ctrl+R to reset)</div>
  `;
} 