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
              window.agent = window.agent || {}
              window.agent.clippy = agent
              agent.show();
              agent.moveTo(rect.x + rect.width/2, rect.y);

              // Drag tracking variables
              let isDragging = false;
              let dragStart = { x: 0, y: 0 };
              const CLICK_THRESHOLD = 5; // pixels

              // Handle mouse down
              agent._el[0].addEventListener('mousedown', e => {
                isDragging = false;
                dragStart = { x: e.clientX, y: e.clientY };
              });

              // Handle mouse move during drag
              agent._el[0].addEventListener('mousemove', e => {
                if (!dragStart) return;
                
                const dx = Math.abs(e.clientX - dragStart.x);
                const dy = Math.abs(e.clientY - dragStart.y);
                
                if (dx > CLICK_THRESHOLD || dy > CLICK_THRESHOLD) {
                  isDragging = true;
                }
              });

              // Handle mouse up
              agent._el[0].addEventListener('mouseup', e => {
                if (!isDragging) {
                  // Only trigger toggle if not dragged
                  $('html').toggleClass('grok-hidden');
                  const grokButton = document.querySelector('[data-testid="GrokDrawer"] button');
                  if (grokButton) grokButton.click();
                }
                
                // Reset drag state
                isDragging = false;
                dragStart = null;
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
