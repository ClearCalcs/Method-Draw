MD.Parameters = function(){
  const _self = this;
  
  // Parameter name validation regex: must start with letter or underscore, 
  // followed by letters, numbers, or underscores
  const PARAM_NAME_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  
  // Parameter types supported
  const PARAM_TYPES = {
    number: { label: 'Number', defaultValue: 0 },
    text: { label: 'Text', defaultValue: '' },
    color: { label: 'Color', defaultValue: '#000000' },
    boolean: { label: 'Boolean', defaultValue: false },
    equation: { label: 'Equation', defaultValue: '0' },
    clone_config: { label: 'Clone Configuration', defaultValue: { num_cols: 3, num_rows: 2, spacing_x: 50, spacing_y: 50 } },
    grid_cols: { label: 'Grid Columns', defaultValue: 3 },
    grid_rows: { label: 'Grid Rows', defaultValue: 2 },
    grid_spacing_x: { label: 'Horizontal Spacing', defaultValue: 50 },
    grid_spacing_y: { label: 'Vertical Spacing', defaultValue: 50 }
  };

  // Get current parameters from state
  function getParameters() {
    return state.get('canvasParameters') || {};
  }

  // Save parameters to state
  function saveParameters(params) {
    state.set('canvasParameters', params);
  }

  // Validate parameter name
  function isValidParameterName(name) {
    if (!name || typeof name !== 'string') return false;
    return PARAM_NAME_REGEX.test(name);
  }

  // Check if parameter name already exists
  function parameterExists(name, excludeId = null) {
    const params = getParameters();
    return Object.keys(params).some(id => 
      id !== excludeId && params[id].name === name
    );
  }

  // Generate unique parameter ID
  function generateParameterId() {
    return 'param_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Add new parameter
  function addParameter(name, type, defaultValue, description = '') {
    if (!isValidParameterName(name)) {
      throw new Error('Invalid parameter name. Must start with letter or underscore, followed by letters, numbers, or underscores.');
    }
    
    if (parameterExists(name)) {
      throw new Error('Parameter name already exists.');
    }

    if (!PARAM_TYPES[type]) {
      throw new Error('Invalid parameter type.');
    }

    const params = getParameters();
    const id = generateParameterId();
    
    params[id] = {
      name: name,
      type: type,
      defaultValue: defaultValue,
      description: description
    };
    
    saveParameters(params);
    return id;
  }

  // Update existing parameter
  function updateParameter(id, name, type, defaultValue, description = '') {
    if (!isValidParameterName(name)) {
      throw new Error('Invalid parameter name. Must start with letter or underscore, followed by letters, numbers, or underscores.');
    }
    
    if (parameterExists(name, id)) {
      throw new Error('Parameter name already exists.');
    }

    if (!PARAM_TYPES[type]) {
      throw new Error('Invalid parameter type.');
    }

    const params = getParameters();
    if (!params[id]) {
      throw new Error('Parameter not found.');
    }
    
    params[id] = {
      name: name,
      type: type,
      defaultValue: defaultValue,
      description: description
    };
    
    saveParameters(params);
  }

  // Delete parameter
  function deleteParameter(id) {
    const params = getParameters();
    if (!params[id]) {
      throw new Error('Parameter not found.');
    }
    
    delete params[id];
    saveParameters(params);
  }

  // Get parameter by ID
  function getParameter(id) {
    const params = getParameters();
    return params[id] || null;
  }

  // Get parameter by name
  function getParameterByName(name) {
    const params = getParameters();
    const id = Object.keys(params).find(id => params[id].name === name);
    return id ? params[id] : null;
  }

  // Get all parameter names (for autocomplete)
  function getParameterNames() {
    const params = getParameters();
    return Object.values(params).map(param => param.name);
  }

  // Evaluate equation with parameter references
  function evaluateEquation(equation, visited = new Set()) {
    if (typeof equation !== 'string') {
      return equation;
    }
    
    // Replace parameter references with their values
    let processedEquation = equation;
    const paramReferenceRegex = /@([a-zA-Z_][a-zA-Z0-9_]*)/g;
    let match;
    
    while ((match = paramReferenceRegex.exec(equation)) !== null) {
      const paramName = match[1];
      const fullMatch = match[0]; // e.g., "@width"
      
      // Check for circular dependencies
      if (visited.has(paramName)) {
        console.error(`Circular dependency detected involving parameter: ${paramName}`);
        return 0;
      }
      
      const param = getParameterByName(paramName);
      if (!param) {
        console.warn(`Parameter @${paramName} not found in equation, treating as 0`);
        processedEquation = processedEquation.replace(fullMatch, '0');
        continue;
      }
      
      let resolvedValue;
      if (param.type === 'equation') {
        // Recursively resolve equation parameters
        const newVisited = new Set(visited);
        newVisited.add(paramName);
        resolvedValue = evaluateEquation(param.defaultValue, newVisited);
      } else {
        resolvedValue = resolveParameterValueDirect(param);
      }
      
      // Replace the parameter reference with its resolved value
      processedEquation = processedEquation.replace(fullMatch, resolvedValue);
    }
    
    // Evaluate the mathematical expression
    try {
      // Basic safety check - only allow numbers, operators, parentheses, and whitespace
      if (!/^[0-9+\-*/.() \t]+$/.test(processedEquation)) {
        throw new Error('Invalid characters in equation');
      }
      
      // Use Function constructor for safe evaluation (better than eval)
      const result = new Function('return ' + processedEquation)();
      
      if (typeof result !== 'number' || isNaN(result)) {
        throw new Error('Equation did not evaluate to a number');
      }
      
      return result;
    } catch (error) {
      console.error(`Error evaluating equation "${equation}": ${error.message}`);
      return 0;
    }
  }
  
  // Helper function to resolve parameter value directly (without equation evaluation)
  function resolveParameterValueDirect(param) {
    const resolvedValue = param.defaultValue;
    if (param.type === 'number') {
      const num = parseFloat(resolvedValue);
      return isNaN(num) ? 0 : num;
    }
    return resolvedValue;
  }

  // Resolve parameter reference (e.g., "@width" -> actual value)
  function resolveParameterValue(value) {
    if (typeof value !== 'string' || !value.startsWith('@')) {
      return value;
    }
    
    const paramName = value.substring(1);
    const param = getParameterByName(paramName);
    
    if (!param) {
      console.warn(`Parameter @${paramName} not found, using original value`);
      return value;
    }
    
    // Handle equation type parameters
    if (param.type === 'equation') {
      return evaluateEquation(param.defaultValue);
    }
    
    // Ensure proper type conversion for other types
    return resolveParameterValueDirect(param);
  }

  // Check if a value is a parameter reference
  function isParameterReference(value) {
    return typeof value === 'string' && value.startsWith('@') && value.length > 1;
  }

  // Validate equation syntax
  function validateEquationSyntax(equation) {
    if (typeof equation !== 'string') {
      return false;
    }
    
    // Basic syntax validation - check for valid characters only
    if (!/^[0-9+\-*/.()@ \t_a-zA-Z]+$/.test(equation)) {
      return false;
    }
    
    // Check for valid parameter references
    const paramReferenceRegex = /@([a-zA-Z_][a-zA-Z0-9_]*)/g;
    let match;
    while ((match = paramReferenceRegex.exec(equation)) !== null) {
      const paramName = match[1];
      // Allow parameter references even if they don't exist yet (for forward references)
      // The actual resolution will handle missing parameters gracefully
    }
    
    return true;
  }

  // Validate parameter value for its type
  function validateParameterValue(value, type) {
    switch (type) {
      case 'number':
        const num = parseFloat(value);
        return !isNaN(num) ? num : PARAM_TYPES.number.defaultValue;
      case 'text':
        return String(value);
      case 'color':
        // Basic color validation - should be hex color
        if (typeof value === 'string' && /^#[0-9A-F]{6}$/i.test(value)) {
          return value;
        }
        return PARAM_TYPES.color.defaultValue;
      case 'boolean':
        return Boolean(value);
      case 'equation':
        if (validateEquationSyntax(value)) {
          return String(value);
        }
        return PARAM_TYPES.equation.defaultValue;
      default:
        return value;
    }
  }

  // Public API
  this.getParameters = getParameters;
  this.addParameter = addParameter;
  this.updateParameter = updateParameter;
  this.deleteParameter = deleteParameter;
  this.getParameter = getParameter;
  this.getParameterByName = getParameterByName;
  this.getParameterNames = getParameterNames;
  this.resolveParameterValue = resolveParameterValue;
  this.isParameterReference = isParameterReference;
  this.validateParameterValue = validateParameterValue;
  this.validateEquationSyntax = validateEquationSyntax;
  this.evaluateEquation = evaluateEquation;
  this.isValidParameterName = isValidParameterName;
  this.parameterExists = parameterExists;
  this.PARAM_TYPES = PARAM_TYPES;
}; 