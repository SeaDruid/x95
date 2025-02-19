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

          // Add this code after the Clippy initialization in your existing script
          const CODE_POLLER = () => {
            const CODE_TYPES = new Set(['html', 'css', 'javascript']);
            let seenMessages = new Set();
            let updateTimer = null;

            const extractCode = (element) => {
              const codeBlocks = [];
              
              $(element).find('[data-testid="markdown-code-block"]').each((i, block) => {
                const prefix = $(block).find('div:first-child > div:first-child span').text().toLowerCase();
                if (CODE_TYPES.has(prefix)) {
                  const content = $(block).find('code').text();
                  codeBlocks.push({ type: prefix, content });
                }
              });

              return codeBlocks;
            };

            const checkForUpdates = () => {
              const messages = $('[data-testid="GrokDrawerHeader"] + div > div:first-child > div:last-child')
                .children(':nth-child(odd)');

              messages.each((index, message) => {
                if (!seenMessages.has(message)) {
                  seenMessages.add(message);
                  
                  // Reset the debounce timer on new message
                  clearTimeout(updateTimer);
                  updateTimer = setTimeout(processFinalMessage, 2000);
                }
              });
            };

            const createHtmlSandbox = (htmlContent) => {
              // Remove any existing windows
              $('.grokkedclippy-window').remove();

              // Create window structure with close button
              const windowMarkup = '<div class="grokkedclippy-window"><header>HTML Sandbox <button class="close-btn">x</button></header><iframe id="html-sandbox"></iframe></div>';

              // Inject into DOM
              $('body').append(windowMarkup);
              
              const window = $('.grokkedclippy-window')[0];
              const header = window.querySelector('header');
              
              // Add close button handler
              window.querySelector('.close-btn').addEventListener('click', () => {
                window.remove();
              });

              // Make draggable via header
              let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
              
              header.onmousedown = dragMouseDown;

              function dragMouseDown(e) {
                e.preventDefault();
                pos3 = e.clientX;
                pos4 = e.clientY;
                document.onmouseup = closeDragElement;
                document.onmousemove = elementDrag;
              }

              function elementDrag(e) {
                e.preventDefault();
                pos1 = pos3 - e.clientX;
                pos2 = pos4 - e.clientY;
                pos3 = e.clientX;
                pos4 = e.clientY;
                window.style.top = (window.offsetTop - pos2) + "px";
                window.style.left = (window.offsetLeft - pos1) + "px";
              }

              function closeDragElement() {
                document.onmouseup = null;
                document.onmousemove = null;
              }

              // Write content to iframe
              const iframe = $('#html-sandbox')[0];
              const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
              iframeDoc.open();
              iframeDoc.write(htmlContent);
              iframeDoc.close();
            };
            
            // Modify the processFinalMessage function
            const processFinalMessage = () => {
              const lastMessage = $('[data-testid="GrokDrawerHeader"] + div > div:first-child > div:last-child')
                .children(':nth-child(odd)').last();
              
              const codeData = extractCode(lastMessage);
              
              codeData.forEach(({ type, content }) => {
                if (type === 'html') {
                  createHtmlSandbox(content);
                }
              });
            };


            // Start polling
            setInterval(checkForUpdates, 2000);
          };

          // Initialize the poller after Clippy setup
          $(document).ready(() => {
            CODE_POLLER();
          });          
        });
      `;
      document.head.appendChild(initScript);
    })();
  }, 2000)
})();
