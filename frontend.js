// content.js
(() => {
  setTimeout(() => {
    // 1. Inject Clippy and jQuery into the page context
    const injectScript = (file) => {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL(file);
      document.head.appendChild(script);
      return new Promise(resolve => script.onload = resolve);
    };
  
    // 2. Load dependencies in sequence
    (async () => {
      await injectScript('jquery.js');
      await injectScript('clippy.js');
  
      // 3. Get GrokDrawer position and initialize Clippy
      const initScript = document.createElement('script');
      initScript.textContent = `
        $(document).ready(() => {
          $('html').addClass('grok-hidden');
          
          try {
            // Find the target element
            const grok = document.querySelector('[data-testid="GrokDrawer"]');
            if (!grok) {
              throw new Error('GrokDrawer not found!');
            }
  
            // Calculate element position
            const rect = grok.getBoundingClientRect();
            if (!rect) {
              throw new Error('GrokDrawer rect unavailable!');
            }
  
            // Initialize Clippy
            clippy.load('Clippy', agent => {
              agent.show();
              agent.moveTo(rect.x, rect.y);

              // Add click event to Clippy
              $(agent._el).on('click', () => {
                $('html').toggleClass('grok-hidden');
                const grokButton = document.querySelector('[data-testid="GrokDrawer"] button');
                if (grokButton) {
                  grokButton.click();
                }
              });
            }, undefined, '${chrome.runtime.getURL('assets/agents/')}');
          } catch (error) {
            console.error('Failed to find GrokDrawer:', error);
          }
        });
      `;
      document.head.appendChild(initScript);
    })();
  }, 2000)
})();
