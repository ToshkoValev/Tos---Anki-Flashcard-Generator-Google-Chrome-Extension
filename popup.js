document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generate-btn');
    const exportBtn = document.getElementById('export-btn');
    const flashcardList = document.getElementById('flashcard-list');
  
    // Generate button click handler
    generateBtn.addEventListener('click', async () => {
        console.log('Generate button clicked');
        try {
            // Get selected card count
            const cardCount = parseInt(document.getElementById('card-count').value);
            console.log('Selected card count:', cardCount);

            // Check for API key
            const result = await chrome.storage.sync.get(['openaiApiKey']);
            if (!result.openaiApiKey) {
                alert('Please set your OpenAI API key in the extension settings');
                await chrome.runtime.openOptionsPage();
                return;
            }

            // Get current tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab?.id) {
                throw new Error('No active tab found');
            }

            generateBtn.textContent = 'Generating...';
            generateBtn.disabled = true;

            console.log('Sending message with card count:', cardCount);
            const response = await new Promise((resolve, reject) => {
                chrome.tabs.sendMessage(tab.id, {
                    action: 'extractContent',
                    deckName: tab.title || 'Web Articles',
                    cardCount: cardCount
                }, response => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            });

            if (response?.flashcards) {
                console.log(`Generated ${response.flashcards.length} flashcards`);
                displayFlashcards(response.flashcards);
                saveFlashcards(response.flashcards);
            } else {
                throw new Error('No flashcards generated');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to generate flashcards. Please refresh the page and try again.');
        } finally {
            generateBtn.textContent = 'Generate Knowledge';
            generateBtn.disabled = false;
        }
    });
  
    // Export flashcards to Anki
    exportBtn.addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const currentUrl = tab.url;
        const storedData = await chrome.storage.local.get('urlFlashcards');
        const urlFlashcards = storedData.urlFlashcards || {};
        
        if (urlFlashcards[currentUrl] && urlFlashcards[currentUrl].length > 0) {
            exportToAnki(urlFlashcards[currentUrl]);
        }
    });
  
    // Display flashcards in popup
    function displayFlashcards(flashcards) {
        const flashcardList = document.getElementById('flashcard-list');
        const contentWrapper = document.querySelector('.content-wrapper');
        const header = document.querySelector('header');
        const container = document.querySelector('.container');
        
        if (!flashcards || flashcards.length === 0) {
            flashcardList.innerHTML = '';
            contentWrapper.classList.add('empty');
            header.classList.add('empty');
            container.style.height = 'auto';
            document.body.style.height = 'auto';
        } else {
            contentWrapper.classList.remove('empty');
            header.classList.remove('empty');
            container.style.height = '600px';
            document.body.style.height = '600px';
            flashcardList.innerHTML = '';
            
            flashcards.forEach((card, index) => {
                const flashcardElement = document.createElement('div');
                flashcardElement.className = 'flashcard';
                
                // Create action buttons container
                const actionsElement = document.createElement('div');
                actionsElement.className = 'card-actions';
                
                // Create delete button
                const deleteButton = document.createElement('button');
                deleteButton.className = 'card-action-btn delete';
                deleteButton.innerHTML = 'Delete';
                deleteButton.onclick = (e) => {
                    e.stopPropagation();
                    deleteFlashcard(index);
                };
                
                // Create regenerate button
                const regenerateButton = document.createElement('button');
                regenerateButton.className = 'card-action-btn regenerate';
                regenerateButton.innerHTML = 'Regenerate';
                regenerateButton.onclick = (e) => {
                    e.stopPropagation();
                    regenerateFlashcard(index);
                };
                
                actionsElement.appendChild(deleteButton);
                actionsElement.appendChild(regenerateButton);
                
                const frontElement = document.createElement('div');
                frontElement.className = 'card-front';
                frontElement.textContent = card.front;
                frontElement.title = card.front;
                
                const backElement = document.createElement('div');
                backElement.className = 'card-back';
                backElement.textContent = card.back;
                backElement.title = card.back;
                
                flashcardElement.appendChild(actionsElement);
                flashcardElement.appendChild(frontElement);
                flashcardElement.appendChild(backElement);
                flashcardList.appendChild(flashcardElement);
            });
        }
    }
  
    // Save flashcards to local storage
    function saveFlashcards(flashcards) {
        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
            const currentUrl = tabs[0].url;
            const storedData = await chrome.storage.local.get('urlFlashcards');
            const urlFlashcards = storedData.urlFlashcards || {};
            
            urlFlashcards[currentUrl] = flashcards;
            
            chrome.storage.local.set({ urlFlashcards }, () => {
                console.log('Flashcards saved for URL:', currentUrl);
            });
        });
    }
  
    // Delete a specific flashcard
    async function deleteFlashcard(index) {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const currentUrl = tab.url;
            const storedData = await chrome.storage.local.get('urlFlashcards');
            const urlFlashcards = storedData.urlFlashcards || {};
            const currentFlashcards = urlFlashcards[currentUrl] || [];
            
            currentFlashcards.splice(index, 1);
            urlFlashcards[currentUrl] = currentFlashcards;
            
            await chrome.storage.local.set({ urlFlashcards });
            displayFlashcards(currentFlashcards);
        } catch (error) {
            console.error('Error deleting flashcard:', error);
            alert('Failed to delete flashcard. Please try again.');
        }
    }
  
    // Export to Anki (placeholder)
    async function exportToAnki(flashcards) {
        try {
            // Test AnkiConnect connection first
            const testResponse = await fetch('http://localhost:8765', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'version',
                    version: 6
                })
            });
            
            if (!testResponse.ok) {
                throw new Error('Cannot connect to Anki');
            }

            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const deckName = tab?.title?.substring(0, 50) || 'Web Articles';
            
            // Create deck
            await fetch('http://localhost:8765', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'createDeck',
                    version: 6,
                    params: {
                        deck: deckName
                    }
                })
            });

            // Add notes
            const response = await fetch('http://localhost:8765', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'addNotes',
                    version: 6,
                    params: {
                        notes: flashcards.map(card => ({
                            deckName: deckName,
                            modelName: 'Basic',
                            fields: {
                                Front: card.front,
                                Back: card.back
                            },
                            tags: ['web-clipper']
                        }))
                    }
                })
            });

            const result = await response.json();
            console.log('Anki response:', result);
            
            if (result.error) {
                throw new Error(result.error);
            }
            alert('Successfully exported to Anki!');
        } catch (error) {
            console.error('Detailed export error:', error);
            alert(`Failed to export to Anki: ${error.message}\nPlease make sure:\n1. Anki is running\n2. AnkiConnect add-on is installed`);
        }
    }
  
    // Load existing flashcards on popup open
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        const currentUrl = tabs[0].url;
        const storedData = await chrome.storage.local.get('urlFlashcards');
        const urlFlashcards = storedData.urlFlashcards || {};
        
        if (urlFlashcards[currentUrl]) {
            displayFlashcards(urlFlashcards[currentUrl]);
        } else {
            // Clear the flashcard list if no cards exist for this URL
            const flashcardList = document.getElementById('flashcard-list');
            flashcardList.innerHTML = '';
        }
    });
  
    // Add regenerateFlashcard function
    async function regenerateFlashcard(index) {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const currentUrl = tab.url;
            const storedData = await chrome.storage.local.get('urlFlashcards');
            const urlFlashcards = storedData.urlFlashcards || {};
            const currentFlashcards = urlFlashcards[currentUrl] || [];
            
            if (!currentFlashcards[index]) return;
            
            const response = await new Promise((resolve, reject) => {
                chrome.tabs.sendMessage(tab.id, {
                    action: 'extractContent',
                    deckName: tab.title || 'Web Articles',
                    cardCount: 1
                }, response => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            });
            
            if (response?.flashcards?.[0]) {
                currentFlashcards[index] = response.flashcards[0];
                urlFlashcards[currentUrl] = currentFlashcards;
                await chrome.storage.local.set({ urlFlashcards });
                displayFlashcards(currentFlashcards);
            }
        } catch (error) {
            console.error('Error regenerating flashcard:', error);
            alert('Failed to regenerate flashcard. Please try again.');
        }
    }
  });