// Content extraction and text processing utility
class ContentExtractor {
    // Extract main article content
    static extractMainContent() {
        const article = document.querySelector('article') || document.querySelector('main') || document.body;
        console.log('Found main content element:', article);
        
        const paragraphs = Array.from(article.querySelectorAll('p'))
            .map(p => p.textContent.trim())
            .filter(text => text.length > 0);
        
        console.log('Extracted paragraphs:', paragraphs.length);
        const content = paragraphs.join(' ');
        console.log('Combined content length:', content.length);
        return content;
    }
  
    // Extract page metadata
    static extractMetadata() {
      return {
        title: document.title,
        url: window.location.href,
        date: new Date().toISOString()
      };
    }
  
    // Generate potential flashcards from extracted content
    static async generateFlashcards(text, cardCount = 10) {
        try {
            // Get API key using Promise-based approach
            const result = await chrome.storage.sync.get(['openaiApiKey']);
            const openaiApiKey = result.openaiApiKey;
            
            if (!openaiApiKey) {
                console.error('No API key found in storage');
                throw new Error('OpenAI API key not found. Please set it in the extension settings.');
            }

            console.log('Processing text of length:', text.length);
            
            const sentences = text.split(/[.!?]+/)
                .map(s => s.trim())
                .filter(sentence => sentence.length > 30)
                .slice(0, cardCount);
                
            if (sentences.length === 0) {
                throw new Error('No suitable sentences found in the content');
            }
            
            console.log(`Found ${sentences.length} suitable sentences`);
            
            const flashcards = [];
            
            for (const sentence of sentences) {
                try {
                    const response = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${openaiApiKey}`
                        },
                        body: JSON.stringify({
                            model: 'gpt-3.5-turbo',
                            messages: [{
                                role: 'system',
                                content: 'Generate a question and answer pair for a flashcard based on the given text. Return as JSON with "question" and "answer" fields.'
                            }, {
                                role: 'user',
                                content: sentence
                            }]
                        })
                    });

                    if (!response.ok) {
                        throw new Error(`OpenAI API error: ${response.status}`);
                    }

                    const data = await response.json();
                    
                    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                        throw new Error('Invalid response format from OpenAI API');
                    }
                    
                    const result = JSON.parse(data.choices[0].message.content);
                    
                    if (!result.question || !result.answer) {
                        throw new Error('Invalid flashcard format returned from API');
                    }

                    flashcards.push({
                        front: result.question,
                        back: result.answer
                    });
                    
                    console.log('Successfully generated flashcard:', flashcards.length);
                    
                } catch (error) {
                    console.error('Error generating flashcard:', error);
                    throw error;
                }
            }
            
            if (flashcards.length === 0) {
                throw new Error('No flashcards could be generated');
            }
            
            return flashcards;
        } catch (error) {
            console.error('Error in generateFlashcards:', error);
            throw error;
        }
    }
}
  
  // Listen for flashcard generation requests
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractContent') {
        (async () => {
            try {
                console.log('Content script received message with card count:', request.cardCount);
                const content = ContentExtractor.extractMainContent();
                
                // Add content validation
                if (!content || content.trim().length === 0) {
                    throw new Error('No content could be extracted from the page');
                }
                
                console.log('Extracted content length:', content.length);
                
                const flashcards = await ContentExtractor.generateFlashcards(content, request.cardCount);
                
                // Validate flashcards array
                if (!flashcards || flashcards.length === 0) {
                    throw new Error('No flashcards were generated');
                }
                
                const metadata = ContentExtractor.extractMetadata();
                
                console.log('Generated flashcards:', flashcards);
                sendResponse({
                    flashcards,
                    metadata
                });
            } catch (error) {
                console.error('Error in content script:', error);
                sendResponse({ error: error.message });
            }
        })();
        return true;
    }
    return false;
});

  chrome.storage.sync.get('openaiApiKey', function(result) {
    if (result.openaiApiKey) {
        console.log('API key is stored');
        // Key exists but for security we don't log the actual key
    } else {
        console.log('No API key found');
    }
  });