document.addEventListener('DOMContentLoaded', () => {
    const settingsForm = document.getElementById('settings-form');
    const openaiKeyInput = document.getElementById('openai-api-key');
  
    // Load saved API key
    chrome.storage.sync.get(['openaiApiKey'], (settings) => {
        openaiKeyInput.value = settings.openaiApiKey || '';
    });
  
    // Save API key
    settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
  
        chrome.storage.sync.set({
            openaiApiKey: openaiKeyInput.value
        }, () => {
            const saveButton = document.getElementById('save-settings');
            saveButton.textContent = 'Saved!';
            saveButton.disabled = true;
  
            setTimeout(() => {
                saveButton.textContent = 'Save Settings';
                saveButton.disabled = false;
                window.close(); // Close the popup after saving
            }, 1000);
        });
    });
});