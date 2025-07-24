MD.PropertyValidation = function() {
  const _self = this;
  
  // Global flag to prevent dropdown recreation during parameter creation
  let isCreatingParameterFromAutocomplete = false;
  
  // Pattern to match parameter references (@paramName)
  const PARAM_REFERENCE_PATTERN = /^@[a-zA-Z_][a-zA-Z0-9_]*$/;
  
  // Pattern to match numeric values (including decimals and negatives)
  const NUMERIC_PATTERN = /^-?[0-9]+(\.[0-9]+)?$/;
  
  // Validate if a value is either a number or a valid parameter reference
  function isValidPropertyValue(value) {
    if (typeof value !== 'string') return false;
    
    value = value.trim();
    if (value === '') return false;
    
    // Check if it's a number
    if (NUMERIC_PATTERN.test(value)) return true;
    
    // Check if it's a valid parameter reference
    if (PARAM_REFERENCE_PATTERN.test(value)) {
      const paramName = value.substring(1);
      const param = editor.parametersManager.getParameterByName(paramName);
      if (!param) return false;
      
      // For equation parameters, validate that they can be resolved to a number
      if (param.type === 'equation') {
        try {
          const resolvedValue = editor.parametersManager.resolveParameterValue(value);
          return typeof resolvedValue === 'number' && !isNaN(resolvedValue);
        } catch (error) {
          return false;
        }
      }
      
      return true;
    }
    
    return false;
  }
  
  // Clear all validation classes from an input
  function clearInputValidation(input) {
    input.classList.remove('param-valid', 'param-invalid', 'param-reference');
    input.removeAttribute('data-original-param');
    
    // Remove has-parameter class from parent draginput
    const draginputParent = input.closest('.draginput');
    if (draginputParent) {
      draginputParent.classList.remove('has-parameter');
    }
  }
  
  // Add visual feedback to input field based on validation
  function updateInputValidation(input) {
    if (!input || !input.value) return; // Add null check
    let value = input.value.trim();
    
    // Handle parameter display format: "@width (200)" - extract just the parameter reference
    const paramMatch = value.match(/^(@[a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)$/);
    if (paramMatch) {
      value = paramMatch[1]; // Get just the parameter reference part
    }
    
    const isValid = value === '' || isValidPropertyValue(value);
    
    // Remove existing validation classes
    input.classList.remove('param-valid', 'param-invalid', 'param-reference');
    
    if (value === '') {
      // Empty is neutral - make sure no parameter data remains
      input.removeAttribute('data-original-param');
      return;
    }
    
    if (isValid) {
      input.classList.add('param-valid');
      
      // Add special styling for parameter references
      if (PARAM_REFERENCE_PATTERN.test(value)) {
        input.classList.add('param-reference');
      }
    } else {
      input.classList.add('param-invalid');
    }
  }
  
  // Enhanced change handler for dragInput callbacks
  function createEnhancedCallback(originalCallback) {
    return function(attr, value, completed) {
      // Validate the value before processing
      if (typeof value === 'string' && value.trim() !== '') {
        if (!isValidPropertyValue(value)) {
          console.warn(`Invalid property value: ${value}. Expected number or @paramName.`);
          return; // Don't apply invalid values
        }
      }
      
      // Call the original callback
      return originalCallback.call(this, attr, value, completed);
    };
  }
  
  // Initialize validation for all property inputs
  function initializeValidation() {
    // Find all property input fields
    const propertyInputs = document.querySelectorAll('.attr_changer, input[data-attr]');
    
    propertyInputs.forEach(input => {
      // Update pattern to accept parameter references
      if (input.hasAttribute('pattern')) {
        input.pattern = '([0-9]+(\.[0-9]+)?|@[a-zA-Z_][a-zA-Z0-9_]*)';
      } else {
        input.setAttribute('pattern', '([0-9]+(\.[0-9]+)?|@[a-zA-Z_][a-zA-Z0-9_]*)');
      }
      
      // Add real-time validation
      input.addEventListener('input', () => updateInputValidation(input));
      input.addEventListener('blur', () => updateInputValidation(input));
      input.addEventListener('change', () => updateInputValidation(input));
      
      // Handle parameter references on blur/change/enter
      input.addEventListener('blur', function() {
        handleParameterInput(this);
      });
      input.addEventListener('change', function() {
        handleParameterInput(this);
      });
      
      // Handle Enter key for parameter references  
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && isValidParameterReference(this.value)) {
          e.preventDefault();
          handleParameterInput(this);
          this.blur();
        }
      });
      
      // Initial validation
      updateInputValidation(input);
    });
    
    // Add autocomplete support for parameter names
    addParameterAutocomplete();
  }
  
  // Check if a value is a valid parameter reference
  function isValidParameterReference(value) {
    // Handle parameter display format: "@width (200)" - extract just the parameter reference
    const paramMatch = value.match(/^(@[a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)$/);
    if (paramMatch) {
      value = paramMatch[1]; // Get just the parameter reference part
    }
    
    if (!PARAM_REFERENCE_PATTERN.test(value)) return false;
    const paramName = value.substring(1);
    return editor.parametersManager.getParameterByName(paramName) !== null;
  }
  
  // Handle parameter input changes
  function handleParameterInput(input) {
    let value = input.value.trim();
    
    // Handle parameter display format: "@width (200)" - extract just the parameter reference
    const paramMatch = value.match(/^(@[a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)$/);
    if (paramMatch) {
      value = paramMatch[1]; // Get just the parameter reference part
    }
    
    // If this is not a parameter reference, make sure we clear any parameter data
    if (!PARAM_REFERENCE_PATTERN.test(value)) {
      const attr = input.getAttribute('data-attr');
      if (attr) {
        // Clear parameter data from selected elements
        const selectedElements = svgCanvas.getSelectedElems();
        selectedElements.forEach(elem => {
          if (elem) {
            elem.removeAttribute(`data-param-${attr}`);
          }
        });
      }
      // Clear parameter display data
      input.removeAttribute('data-original-param');
      return;
    }
    
    // Validate the parameter exists
    if (!isValidParameterReference(value)) return;
    
    // Get the attribute name and resolve the parameter
    const attr = input.getAttribute('data-attr');
    if (!attr) return;
    
    const resolvedValue = editor.parametersManager.resolveParameterValue(value);
    
    // Store parameter reference on selected elements for persistence
    storeParameterReference(attr, value);
    
    // Update input display to show parameter and resolved value
    updateParameterDisplay(input, value, resolvedValue);
    
    // Call the appropriate change handler directly with resolved value
    if (typeof editor.changeAttribute === 'function') {
      editor.changeAttribute(attr, resolvedValue, true);
    }
  }
  
  // Store parameter reference on SVG elements for persistence
  function storeParameterReference(attr, paramRef) {
    const selectedElements = svgCanvas.getSelectedElems();
    selectedElements.forEach(elem => {
      if (elem) {
        elem.setAttribute(`data-param-${attr}`, paramRef);
      }
    });
  }
  
  // Update input display to show both parameter and resolved value
  function updateParameterDisplay(input, paramRef, resolvedValue) {
    const displayValue = `${paramRef} (${resolvedValue})`;
    input.value = displayValue;
    
    // Store original parameter reference for later use
    input.setAttribute('data-original-param', paramRef);
    
    // Add class to parent draginput to help with label styling
    const draginputParent = input.closest('.draginput');
    if (draginputParent) {
      draginputParent.classList.add('has-parameter');
    }
  }
  
  // Clear all parameter validation from inputs
  function clearAllInputValidation() {
    const propertyInputs = document.querySelectorAll('.attr_changer, input[data-attr]');
    propertyInputs.forEach(input => {
      clearInputValidation(input);
    });
  }
  
  // Restore parameter references when elements are selected
  function restoreParameterReferences() {
    const selectedElements = svgCanvas.getSelectedElems();
    if (!selectedElements.length || !selectedElements[0]) {
      // No element selected, clear all validation styling
      clearAllInputValidation();
      return;
    }
    
    const elem = selectedElements[0];
    
    // Find all property inputs and check for stored parameter references
    const propertyInputs = document.querySelectorAll('.attr_changer, input[data-attr]');
    propertyInputs.forEach(input => {
      const attr = input.getAttribute('data-attr');
      if (!attr) return;
      
      // Clear any existing validation first
      clearInputValidation(input);
      
      const paramRef = elem.getAttribute(`data-param-${attr}`);
      if (paramRef && PARAM_REFERENCE_PATTERN.test(paramRef)) {
        const resolvedValue = editor.parametersManager.resolveParameterValue(paramRef);
        updateParameterDisplay(input, paramRef, resolvedValue);
        updateInputValidation(input);
      }
    });
  }
  
  // Add autocomplete functionality for parameter names
  function addParameterAutocomplete() {
    // If we're in the middle of autocomplete parameter creation, skip recreation
    if (isCreatingParameterFromAutocomplete) {
      return;
    }
    
    // Remove any existing dropdown elements first
    const allPossibleDropdowns = document.querySelectorAll(
      '#parameter-autocomplete-dropdown, ' +
      '.parameter-autocomplete-dropdown, ' +
      '[class*="parameter-autocomplete"], ' +
      '[id*="parameter-autocomplete"]'
    );
    allPossibleDropdowns.forEach((el) => {
      el.style.display = 'none !important';
      el.style.visibility = 'hidden !important';
      el.style.opacity = '0 !important';
      el.innerHTML = '';
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
    
    // Remove old datalist if it exists
    const oldDatalist = document.getElementById('parameter-suggestions');
    if (oldDatalist) {
      oldDatalist.remove();
    }
    
    // Create custom dropdown element
    let dropdown = document.getElementById('parameter-autocomplete-dropdown');
    if (!dropdown) {
      dropdown = document.createElement('div');
      dropdown.id = 'parameter-autocomplete-dropdown';
      dropdown.className = 'parameter-autocomplete-dropdown';
      document.body.appendChild(dropdown);
    }
    
    // Always ensure dropdown is clean and hidden when initializing
    dropdown.style.display = 'none';
    dropdown.style.visibility = 'hidden';
    dropdown.innerHTML = '';
    
    let currentInput = null;
    let highlightedIndex = -1;
    let currentParams = [];
    let currentTypedText = '';
    
    // Store autocomplete context for parameter creation
    let autocompleteContext = {
      input: null,
      inputSelector: '',
      inputAttr: '',
      parameterName: '',
      active: false
    };
    
    // Show dropdown with parameter suggestions
    function showDropdown(input, typedText) {
      if (!editor.parametersManager) return;
      
      // Ensure dropdown is back in DOM if it was removed
      if (!dropdown.parentNode) {
        document.body.appendChild(dropdown);
      }
      
      currentInput = input;
      currentTypedText = typedText;
      
      // Store context for potential parameter creation
      const inputAttr = input.getAttribute('data-attr') || '';
      const inputId = input.id || '';
      const inputSelector = inputId ? `#${inputId}` : `input[data-attr="${inputAttr}"]`;
      
      autocompleteContext = {
        input: input,
        inputSelector: inputSelector,
        inputAttr: inputAttr,
        parameterName: typedText,
        active: false // Will be set to true if create option is clicked
      };
      
      // Get current parameters
      const paramNames = editor.parametersManager.getParameterNames();
      
      // Filter parameters based on typed text (without @)
      const filterText = typedText.toLowerCase();
      currentParams = paramNames.filter(name => 
        name.toLowerCase().includes(filterText) || filterText === ''
      );
      
      // Build dropdown content
      let html = '';
      
      // Add existing parameters
      currentParams.forEach((name, index) => {
        html += `<div class="parameter-autocomplete-item" data-index="${index}" data-value="@${name}">@${name}</div>`;
      });
      
      // Add "Create parameter" option if we have typed text
      if (typedText.length > 0) {
        const createIndex = currentParams.length;
        html += `<div class="parameter-autocomplete-create" data-index="${createIndex}" data-create="true">Create '@${typedText}'...</div>`;
      }
      
      dropdown.innerHTML = html;
      
      // Position dropdown below the input
      const inputRect = input.getBoundingClientRect();
      dropdown.style.left = inputRect.left + 'px';
      dropdown.style.top = (inputRect.bottom + 2) + 'px';
      dropdown.style.display = 'block';
      dropdown.style.visibility = 'visible';
      
      // Reset highlighted index
      highlightedIndex = -1;
      
      // Add click handlers to dropdown items
      dropdown.querySelectorAll('.parameter-autocomplete-item, .parameter-autocomplete-create').forEach(item => {
        item.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          selectItem(parseInt(this.getAttribute('data-index')));
        });
      });
    }
    
    // Hide dropdown
    function hideDropdown() {
      // Find ALL dropdown elements that might exist
      const allDropdowns = document.querySelectorAll('#parameter-autocomplete-dropdown, .parameter-autocomplete-dropdown');
      
      // Hide all of them
      allDropdowns.forEach((dd) => {
        dd.style.display = 'none';
        dd.style.visibility = 'hidden';
        dd.innerHTML = '';
        if (dd.parentNode) {
          dd.parentNode.removeChild(dd);
        }
      });
      
      // Hide our specific dropdown too
      dropdown.style.display = 'none';
      dropdown.style.visibility = 'hidden';
      dropdown.innerHTML = '';
      
      // Also temporarily remove from DOM to ensure it's really gone
      if (dropdown.parentNode) {
        dropdown.parentNode.removeChild(dropdown);
      }
      
      currentInput = null;
      highlightedIndex = -1;
      currentParams = [];
    }
    
    // Highlight item by index
    function highlightItem(index) {
      // Remove previous highlights
      dropdown.querySelectorAll('.highlighted').forEach(item => {
        item.classList.remove('highlighted');
      });
      
      // Highlight new item
      const items = dropdown.querySelectorAll('.parameter-autocomplete-item, .parameter-autocomplete-create');
      if (index >= 0 && index < items.length) {
        items[index].classList.add('highlighted');
        highlightedIndex = index;
      } else {
        highlightedIndex = -1;
      }
    }
    
    // Select item by index
    function selectItem(index) {
      const items = dropdown.querySelectorAll('.parameter-autocomplete-item, .parameter-autocomplete-create');
      if (index < 0 || index >= items.length) return;
      
      const item = items[index];
      const isCreateOption = item.hasAttribute('data-create');
      
              if (isCreateOption) {
                  // Set global flag to prevent dropdown recreation
        isCreatingParameterFromAutocomplete = true;
          
          // Activate the context for parameter creation BEFORE hiding dropdown
          autocompleteContext.parameterName = currentTypedText;
          autocompleteContext.active = true;
          
          // Hide dropdown completely
          hideDropdown();
          
          // Nuclear option: destroy ALL possible dropdown elements
          setTimeout(() => {
            const allPossibleDropdowns = document.querySelectorAll(
              '#parameter-autocomplete-dropdown, ' +
              '.parameter-autocomplete-dropdown, ' +
              '[class*="parameter-autocomplete"], ' +
              '[id*="parameter-autocomplete"]'
            );
            allPossibleDropdowns.forEach(el => {
              el.style.display = 'none !important';
              el.style.visibility = 'hidden !important';
              el.style.opacity = '0 !important';
              el.innerHTML = '';
              if (el.parentNode) {
                el.parentNode.removeChild(el);
              }
            });
          }, 1);
        
        // Try multiple approaches to open the modal
        if (editor.modal && editor.modal.parameters) {
          editor.modal.parameters.open();
          
          // Small delay to ensure modal is ready
          setTimeout(() => {
            // Try to access the showParameterForm function
            if (editor.modal.parameters.showParameterForm) {
              editor.modal.parameters.showParameterForm(false, null);
              
              // Pre-fill the name field
              setTimeout(() => {
                const nameInput = editor.modal.parameters.el.querySelector('#param-name');
                if (nameInput) {
                  nameInput.value = currentTypedText;
                  nameInput.focus();
                }
              }, 50);
            } else {
              // Fallback 1: Try clicking the Add Parameter button
              const addParameterBtn = editor.modal.parameters.el.querySelector('#add-parameter-btn');
              if (addParameterBtn) {
                addParameterBtn.click();
                
                // Pre-fill the name field after button click
                setTimeout(() => {
                  const nameInput = editor.modal.parameters.el.querySelector('#param-name');
                  if (nameInput) {
                    nameInput.value = currentTypedText;
                    nameInput.focus();
                  }
                }, 50);
              } else {
                // Fallback 2: Manual approach - directly manipulate the modal DOM
                const parametersContainer = editor.modal.parameters.el.querySelector('#parameters-container');
                const parameterForm = editor.modal.parameters.el.querySelector('#parameter-form');
                const parameterFormTitle = editor.modal.parameters.el.querySelector('#parameter-form-title');
                const paramNameInput = editor.modal.parameters.el.querySelector('#param-name');
                const parameterFormElement = editor.modal.parameters.el.querySelector('#parameter-form-element');
                
                if (parametersContainer && parameterForm && paramNameInput) {
                  // Hide parameters list and show form
                  parametersContainer.style.display = 'none';
                  parameterForm.style.display = 'block';
                  parameterFormTitle.textContent = 'Add Parameter';
                  
                  // Reset form and set name
                  parameterFormElement.reset();
                  paramNameInput.value = currentTypedText;
                  paramNameInput.focus();
                }
              }
            }
          }, 100);
        }
      } else {
        // Select existing parameter
        const paramValue = item.getAttribute('data-value');
        if (currentInput && paramValue) {
          currentInput.value = paramValue;
          hideDropdown();
          
          // Trigger input validation and parameter handling
          if (currentInput && currentInput.value) {
            updateInputValidation(currentInput);
            handleParameterInput(currentInput);
          }
        }
      }
    }
    
    // Handle keyboard navigation
    function handleKeydown(e) {
      if (dropdown.style.display === 'none') return;
      
      const items = dropdown.querySelectorAll('.parameter-autocomplete-item, .parameter-autocomplete-create');
      const itemCount = items.length;
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          highlightItem((highlightedIndex + 1) % itemCount);
          break;
          
        case 'ArrowUp':
          e.preventDefault();
          highlightItem(highlightedIndex <= 0 ? itemCount - 1 : highlightedIndex - 1);
          break;
          
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0) {
            selectItem(highlightedIndex);
          }
          break;
          
        case 'Escape':
          e.preventDefault();
          hideDropdown();
          break;
      }
    }
    
    // Add autocomplete to property inputs
    const propertyInputs = document.querySelectorAll('.attr_changer, input[data-attr]');
    propertyInputs.forEach(input => {
      // Remove old list attribute if it exists
      input.removeAttribute('list');
      
      // Handle input changes
      input.addEventListener('input', function(e) {
        const value = e.target.value;
        const atIndex = value.lastIndexOf('@');
        
        if (atIndex !== -1) {
          // Extract text after the last @
          const afterAt = value.substring(atIndex + 1);
          
          // Only show dropdown if @ is at the start or preceded by non-alphanumeric
          const beforeAt = atIndex > 0 ? value.charAt(atIndex - 1) : ' ';
          if (atIndex === 0 || !/[a-zA-Z0-9_]/.test(beforeAt)) {
            showDropdown(this, afterAt);
          }
        } else {
          hideDropdown();
        }
      });
      
      // Handle keyboard events
      input.addEventListener('keydown', handleKeydown);
      
      // Hide dropdown when input loses focus (with small delay to allow clicks)
      input.addEventListener('blur', function() {
        setTimeout(() => {
          if (!dropdown.matches(':hover')) {
            hideDropdown();
          }
        }, 150);
      });
    });
    
    // Hide dropdown when clicking outside
    document.addEventListener('click', function(e) {
      if (!dropdown.contains(e.target) && currentInput !== e.target) {
        hideDropdown();
      }
    });
    
    // Function to handle parameter creation from autocomplete
    function handleParameterCreated(parameterName) {
      
      if (autocompleteContext.active) {
        // Clear context if empty parameter name (error case) or if parameter matches
        if (!parameterName || parameterName === autocompleteContext.parameterName) {
          if (parameterName) {
            // Try to re-find the input field using multiple methods
            let targetInput = autocompleteContext.input;
            
            // If the original reference is stale, try to find it again
            if (!targetInput || !document.body.contains(targetInput)) {
              // Try by selector first
              if (autocompleteContext.inputSelector) {
                targetInput = document.querySelector(autocompleteContext.inputSelector);
              }
              
              // Fallback: find by data-attr
              if (!targetInput && autocompleteContext.inputAttr) {
                targetInput = document.querySelector(`input[data-attr="${autocompleteContext.inputAttr}"]`);
              }
            }
            
            if (targetInput) {
              // Delay field update to happen after modal closes
              setTimeout(() => {
                // Update the original input with the new parameter reference
                const paramRef = '@' + parameterName;
                targetInput.value = paramRef;
                
                // Trigger validation and parameter handling immediately
                updateInputValidation(targetInput);
                handleParameterInput(targetInput);
                
                // Trigger change event to ensure all handlers are called
                const changeEvent = new Event('change', { bubbles: true });
                targetInput.dispatchEvent(changeEvent);
                
                // Also trigger input event
                const inputEvent = new Event('input', { bubbles: true });
                targetInput.dispatchEvent(inputEvent);
                
                // Hide any dropdown that might have been recreated
                hideDropdown();
              }, 50);
            }
          }
          
          // Store whether this was from autocomplete before clearing
          const wasFromAutocomplete = autocompleteContext.active && parameterName === autocompleteContext.parameterName;
          
          // Clear context and global flag
          autocompleteContext = {
            input: null,
            inputSelector: '',
            inputAttr: '',
            parameterName: '',
            active: false
          };
          
          // Clear global flag after a delay to ensure all initialization calls are blocked
          setTimeout(() => {
            isCreatingParameterFromAutocomplete = false;
          }, 500);
          
          // Return true if this was triggered from autocomplete (so modal should close)
          return wasFromAutocomplete;
        }
      }
      
      // Not from autocomplete, return false (normal behavior)
      return false;
    };
    
    // Expose the handleParameterCreated function globally
    _self.handleParameterCreated = handleParameterCreated;
  }
  
  // Flag to prevent infinite loops during parameter reset
  let isResettingParameters = false;
  
  // Reset elements with parameters back to their parameter values after manual changes
  function resetParameterizedAttributes(elements) {
    if (isResettingParameters) {
      return; // Prevent infinite loops
    }
    
    if (!Array.isArray(elements)) {
      elements = [elements];
    }
    
    isResettingParameters = true;
    
    try {
      elements.forEach(elem => {
        if (!elem) return;
        
        // Find all parameter attributes on this element
        const attributes = elem.attributes;
        for (let i = 0; i < attributes.length; i++) {
          const attr = attributes[i];
          if (attr.name.startsWith('data-param-')) {
            const attrName = attr.name.substring('data-param-'.length);
            const paramRef = attr.value;
            
            if (PARAM_REFERENCE_PATTERN.test(paramRef)) {
              const resolvedValue = editor.parametersManager.resolveParameterValue(paramRef);
              
              // Apply the parameter value to the actual SVG attribute
              elem.setAttribute(attrName, resolvedValue);
              
              // Update the corresponding input field if it exists
              const input = document.querySelector(`input[data-attr="${attrName}"]`);
              if (input) {
                updateParameterDisplay(input, paramRef, resolvedValue);
                updateInputValidation(input);
              }
            }
          }
        }
      });
    } finally {
      isResettingParameters = false;
    }
  }
  
  // Check if element has any parameter references
  function hasParameterReferences(elem) {
    if (!elem || !elem.attributes) return false;
    
    for (let i = 0; i < elem.attributes.length; i++) {
      if (elem.attributes[i].name.startsWith('data-param-')) {
        return true;
      }
    }
    return false;
  }

  // Public API
  this.isValidPropertyValue = isValidPropertyValue;
  this.updateInputValidation = updateInputValidation;
  this.createEnhancedCallback = createEnhancedCallback;
  this.initializeValidation = initializeValidation;
  this.addParameterAutocomplete = addParameterAutocomplete;
  this.restoreParameterReferences = restoreParameterReferences;
  this.clearAllInputValidation = clearAllInputValidation;
  this.resetParameterizedAttributes = resetParameterizedAttributes;
  this.hasParameterReferences = hasParameterReferences;
  this.hideDropdown = function() { 
    if (typeof hideDropdown === 'function') {
      hideDropdown(); 
    }
  };
  this.PARAM_REFERENCE_PATTERN = PARAM_REFERENCE_PATTERN;
  this.NUMERIC_PATTERN = NUMERIC_PATTERN;
}; 