MD.PropertyValidation = function() {
  const _self = this;
  
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
      return editor.parametersManager.getParameterByName(paramName) !== null;
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
    // Create a datalist element for parameter suggestions
    let datalist = document.getElementById('parameter-suggestions');
    if (!datalist) {
      datalist = document.createElement('datalist');
      datalist.id = 'parameter-suggestions';
      document.body.appendChild(datalist);
    }
    
    // Update the datalist with current parameters
    function updateParameterSuggestions() {
      if (!editor.parametersManager) return;
      const paramNames = editor.parametersManager.getParameterNames();
      datalist.innerHTML = paramNames.map(name => `<option value="@${name}">@${name}</option>`).join('');
    }
    
    // Add autocomplete to property inputs
    const propertyInputs = document.querySelectorAll('.attr_changer, input[data-attr]');
    propertyInputs.forEach(input => {
      input.setAttribute('list', 'parameter-suggestions');
      
      // Update suggestions when input gets focus
      input.addEventListener('focus', updateParameterSuggestions);
      
      // Also trigger on input for @ character
      input.addEventListener('input', function(e) {
        if (e.target.value.includes('@')) {
          updateParameterSuggestions();
        }
      });
    });
    
    // Update suggestions when parameters change
    updateParameterSuggestions();
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
  this.PARAM_REFERENCE_PATTERN = PARAM_REFERENCE_PATTERN;
  this.NUMERIC_PATTERN = NUMERIC_PATTERN;
}; 