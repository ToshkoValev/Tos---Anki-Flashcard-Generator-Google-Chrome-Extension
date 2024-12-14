// Create context menu for saving highlighted text
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'save-highlight',
      title: 'Save as Anki Flashcard',
      contexts: ['selection']
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error creating context menu:', chrome.runtime.lastError);
      }
    });
  });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'save-highlight' && tab?.id) {
    try {
      chrome.tabs.sendMessage(tab.id, {
        action: 'saveHighlight',
        text: info.selectionText
      });
    } catch (error) {
      console.error('Error handling context menu click:', error);
    }
  }
});

// Store flashcards locally
class FlashcardManager {
  static async saveFlashcard(flashcard) {
    try {
      const { flashcards = [] } = await chrome.storage.local.get('flashcards');
      flashcards.push(flashcard);
      await chrome.storage.local.set({ flashcards });
    } catch (error) {
      console.error('Error saving flashcard:', error);
    }
  }

  static async getFlashcards() {
    try {
      const { flashcards = [] } = await chrome.storage.local.get('flashcards');
      return flashcards;
    } catch (error) {
      console.error('Error getting flashcards:', error);
      return [];
    }
  }

  static async clearFlashcards() {
    try {
      await chrome.storage.local.remove('flashcards');
    } catch (error) {
      console.error('Error clearing flashcards:', error);
    }
  }
}

// Add listener for opening options page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openOptionsPage') {
      chrome.runtime.openOptionsPage();
  }
});
