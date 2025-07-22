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
    boolean: { label: 'Boolean', defaultValue: false }
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
    
    // Ensure proper type conversion
    const resolvedValue = param.defaultValue;
    if (param.type === 'number') {
      const num = parseFloat(resolvedValue);
      return isNaN(num) ? 0 : num;
    }
    
    return resolvedValue;
  }

  // Check if a value is a parameter reference
  function isParameterReference(value) {
    return typeof value === 'string' && value.startsWith('@') && value.length > 1;
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
  this.isValidParameterName = isValidParameterName;
  this.parameterExists = parameterExists;
  this.PARAM_TYPES = PARAM_TYPES;
}; 