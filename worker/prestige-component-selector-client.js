(function () {
  console.debug("prestige-component-selector-client.js loaded via proxy v1.0.0");
  const isInsideIframe = window.parent !== window;
  if (!isInsideIframe) return;

  const PARENT_TARGET_ORIGIN = "*";

  // --- Component Selection Functionality ---
  let isSelectMode = false;
  let currentHighlight = null;

  // Create highlight overlay
  function createHighlight() {
    const highlight = document.createElement('div');
    highlight.style.cssText = `
      position: fixed;
      pointer-events: none;
      border: 2px solid #007acc;
      background: rgba(0, 122, 204, 0.1);
      z-index: 9999;
      transition: all 0.1s ease;
    `;
    highlight.id = 'prestige-component-highlight';
    return highlight;
  }

  // Update highlight position
  function updateHighlight(element) {
    if (!currentHighlight) return;
    
    const rect = element.getBoundingClientRect();
    currentHighlight.style.top = rect.top + 'px';
    currentHighlight.style.left = rect.left + 'px';
    currentHighlight.style.width = rect.width + 'px';
    currentHighlight.style.height = rect.height + 'px';
  }

  // Mouse move handler
  function handleMouseMove(event) {
    if (!isSelectMode) return;
    
    const element = event.target;
    updateHighlight(element);
  }

  // Click handler for component selection
  function handleClick(event) {
    if (!isSelectMode) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    const element = event.target;
    const rect = element.getBoundingClientRect();
    
    // Send component info to parent
    window.parent.postMessage(
      {
        type: "component-selected",
        payload: {
          tagName: element.tagName.toLowerCase(),
          className: element.className,
          id: element.id,
          textContent: element.textContent?.substring(0, 100),
          bounds: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
          }
        },
      },
      PARENT_TARGET_ORIGIN,
    );
    
    // Exit select mode
    exitSelectMode();
  }

  // Enter select mode
  function enterSelectMode() {
    isSelectMode = true;
    document.body.style.cursor = 'crosshair';
    
    // Create and add highlight
    currentHighlight = createHighlight();
    document.body.appendChild(currentHighlight);
    
    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);
    
    console.log('[prestige-ai] Component select mode enabled');
  }

  // Exit select mode
  function exitSelectMode() {
    isSelectMode = false;
    document.body.style.cursor = '';
    
    // Remove highlight
    if (currentHighlight) {
      currentHighlight.remove();
      currentHighlight = null;
    }
    
    // Remove event listeners
    document.removeEventListener('mousemove', handleMouseMove, true);
    document.removeEventListener('click', handleClick, true);
    
    console.log('[prestige-ai] Component select mode disabled');
  }

  // Listen for commands from parent
  window.addEventListener("message", (event) => {
    if (
      event.source !== window.parent ||
      !event.data ||
      typeof event.data !== "object"
    )
      return;
      
    if (event.data.type === "start-component-select") {
      enterSelectMode();
    } else if (event.data.type === "stop-component-select") {
      exitSelectMode();
    }
  });

  // Notify parent that component selector is ready
  window.parent.postMessage(
    {
      type: "component-selector-ready",
      payload: {}
    },
    PARENT_TARGET_ORIGIN,
  );
})();