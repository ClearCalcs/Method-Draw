// globals
const svgCanvas = new $.SvgCanvas(document.getElementById("svgcanvas"));
const editor = new MD.Editor();
const state = new State();

editor.modal = {
  about: new MD.Modal({
    html: `
      <h1>About this application</h1>
      <p>Method Draw is a simple <a href="https://github.com/methodofaction/Method-Draw">open source</a> vector drawing application. Method Draw was forked from <a href="https://github.com/SVG-Edit/svgedit">SVG-Edit</a> several years ago with the goal of improving and modernizing the interface.</p>
      <p>At this time (2021), the author (<a href="http://method.ac/writing">Mark MacKay</a>) is working on improving stability and improving the codebase, which contains a lot of legacy practices. The goal is to create a vector editor suitable for simple graphic design tasks.</p>
      `
  }),
  source: new MD.Modal({
    html: `
      <div id="svg_source_editor">
        <div id="svg_source_overlay" class="overlay"></div>
        <div id="svg_source_container">
          <form>
            <textarea id="svg_source_textarea" spellcheck="false"></textarea>
          </form>
          <div id="tool_source_back" class="toolbar_button">
            <button id="tool_source_cancel" class="cancel">Cancel</button>
            <button id="tool_source_save" class="ok">Apply Changes</button>
          </div>
        </div>
    </div>`,
    js: function(el){
      el.children[0].classList.add("modal-item-source");
      el.querySelector("#tool_source_save").addEventListener("click", function(){
        var saveChanges = function() {
          svgCanvas.clearSelection();
          $('#svg_source_textarea').blur();
          editor.zoom.multiply(1);
          editor.rulers.update();
          editor.paintBox.fill.prep();
          editor.paintBox.stroke.prep();
          editor.modal.source.close();
        }

        if (!svgCanvas.setSvgString($('#svg_source_textarea').val())) {
          $.confirm("There were parsing errors in your SVG source.\nRevert back to original SVG source?", function(ok) {
            if(!ok) return false;
            saveChanges();
          });
        } else {
          saveChanges();
        } 
      })
      el.querySelector("#tool_source_cancel").addEventListener("click", function(){
        editor.modal.source.close();
      });
    }
  }),
  configure: new MD.Modal({
    html: `
      <h1>Configuration</h1>
      <div id="configuration">
        <button class="warning">Erase all data</button>
        </div>
      </div>`,
    js: function(el){
      const input = el.querySelector("#configuration button.warning");
      input.addEventListener("click", function(){
        state.clean();
      })
    }
  }),
  donate: new MD.Modal({
    html: `
      <h1>Donate</h1>
      <p>
        Method Draw relies on your generous donations for continued development.
        <a href="https://method.ac/donate/">Donate now</a> if you find this application useful.
      </p>`
  }),
  shortcuts: new MD.Modal({
    html: `
      <h1>Shortcuts</h1>
      <div id="shortcuts"></div>`,
    js: function(el){
      el.children[0].classList.add("modal-item-wide");
    }
  }),
  parameters: new MD.Modal({
    html: `
      <h1>Parameters</h1>
      <div id="parameters-container">
        <div id="parameters-list">
          <div id="parameters-empty" style="display: none; text-align: center; color: #666; padding: 20px;">
            No parameters defined yet. Click "Add Parameter" to create your first parameter.
          </div>
          <table id="parameters-table" style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f5f5f5;">
                <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Name</th>
                <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Type</th>
                <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Default Value</th>
                <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Actions</th>
              </tr>
            </thead>
            <tbody id="parameters-tbody">
            </tbody>
          </table>
        </div>
        <div style="margin-top: 20px; text-align: right;">
          <button id="parameters-cancel-btn" style="background: #666; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin-right: 10px;">Cancel</button>
          <button id="add-parameter-btn" style="background: #007cba; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Add Parameter</button>
        </div>
      </div>
      
      <!-- Add/Edit Parameter Form (initially hidden) -->
      <div id="parameter-form" style="display: none;">
        <h2 id="parameter-form-title">Add Parameter</h2>
        <form id="parameter-form-element">
          <div style="margin-bottom: 15px;">
            <label for="param-name" style="display: block; margin-bottom: 5px; font-weight: bold;">Name:</label>
            <input type="text" id="param-name" placeholder="e.g., width, height, color" 
                   style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
            <small style="color: #666;">Must start with letter or underscore, followed by letters, numbers, or underscores</small>
          </div>
          
          <div style="margin-bottom: 15px;">
            <label for="param-type" style="display: block; margin-bottom: 5px; font-weight: bold;">Type:</label>
            <select id="param-type" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
              <option value="number">Number</option>
              <option value="text">Text</option>
              <option value="color">Color</option>
              <option value="boolean">Boolean</option>
              <option value="equation">Equation</option>
            </select>
          </div>
          
          <div style="margin-bottom: 15px;">
            <label for="param-default" style="display: block; margin-bottom: 5px; font-weight: bold;">Default Value:</label>
            <input type="text" id="param-default" 
                   style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; position: relative; z-index: 1001; pointer-events: auto;">
          </div>
          
          <div style="margin-bottom: 15px;">
            <label for="param-description" style="display: block; margin-bottom: 5px; font-weight: bold;">Description (optional):</label>
            <textarea id="param-description" rows="3" 
                      style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; resize: vertical;"></textarea>
          </div>
          
          <div style="text-align: right;">
            <button type="button" id="parameter-form-cancel" 
                    style="background: #666; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin-right: 10px;">Cancel</button>
            <button type="submit" id="parameter-form-save" 
                    style="background: #007cba; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Save</button>
          </div>
        </form>
      </div>`,
    js: function(el){
      el.children[0].classList.add("modal-item-wide");
      
      const modal = this;
      const parametersContainer = el.querySelector('#parameters-container');
      const parameterForm = el.querySelector('#parameter-form');
      const parametersTable = el.querySelector('#parameters-table');
      const parametersEmpty = el.querySelector('#parameters-empty');
      const parametersTBody = el.querySelector('#parameters-tbody');
      const addParameterBtn = el.querySelector('#add-parameter-btn');
      const parametersCancelBtn = el.querySelector('#parameters-cancel-btn');
      const parameterFormTitle = el.querySelector('#parameter-form-title');
      const parameterFormElement = el.querySelector('#parameter-form-element');
      const parameterFormCancel = el.querySelector('#parameter-form-cancel');
      
      const paramNameInput = el.querySelector('#param-name');
      const paramTypeSelect = el.querySelector('#param-type');
      const paramDefaultInput = el.querySelector('#param-default');
      const paramDescriptionInput = el.querySelector('#param-description');
      
      let editingParameterId = null;
      
      // Update default value input based on parameter type
      function updateDefaultValueInput() {
        const type = paramTypeSelect.value;
        let currentElement = el.querySelector('#param-default');
        
                  const baseStyle = 'width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; position: relative; z-index: 1001; pointer-events: auto;';
          
          if (type === 'boolean') {
            // Replace input with select for boolean
            if (currentElement.tagName === 'INPUT') {
              const select = document.createElement('select');
              select.id = 'param-default';
              select.style.cssText = baseStyle;
              select.innerHTML = '<option value="false">False</option><option value="true">True</option>';
              currentElement.parentNode.replaceChild(select, currentElement);
            }
          } else {
            // Replace select with input for non-boolean types, or just update if already input
            if (currentElement.tagName === 'SELECT') {
              const input = document.createElement('input');
              input.id = 'param-default';
              input.style.cssText = baseStyle;
              currentElement.parentNode.replaceChild(input, currentElement);
              currentElement = input;
            }
          
          // Set input properties based on type
          switch (type) {
            case 'number':
              currentElement.type = 'number';
              currentElement.placeholder = 'e.g., 100';
              break;
            case 'text':
              currentElement.type = 'text';
              currentElement.placeholder = 'e.g., Hello World';
              break;
            case 'color':
              currentElement.type = 'color';
              currentElement.placeholder = '';
              break;
            case 'equation':
              currentElement.type = 'text';
              currentElement.placeholder = 'e.g., 2 * @width + 10';
              break;
            default:
              currentElement.type = 'text';
          }
        }
        
        // Re-apply click handling after updating the input
        ensureDefaultInputClickable();
      }
      
      // Render parameters list
      function renderParametersList() {
        const parameters = editor.parametersManager.getParameters();
        const paramIds = Object.keys(parameters);
        
        if (paramIds.length === 0) {
          parametersTable.style.display = 'none';
          parametersEmpty.style.display = 'block';
        } else {
          parametersTable.style.display = 'table';
          parametersEmpty.style.display = 'none';
          
          parametersTBody.innerHTML = '';
          
          // Group parameters by parametric clone groups
          const cloneGroups = {};
          const regularParams = [];
          
          paramIds.forEach(id => {
            const param = parameters[id];
            // Check if this is a parametric clone parameter by looking for the timestamp pattern
            const timestampMatch = param.name.match(/^clone_(cols|rows|spacing_x|spacing_y)_(\d+)$/);
            if (timestampMatch) {
              const timestamp = timestampMatch[2];
              if (!cloneGroups[timestamp]) {
                cloneGroups[timestamp] = {
                  cols: null,
                  rows: null,
                  spacing_x: null,
                  spacing_y: null
                };
              }
              cloneGroups[timestamp][timestampMatch[1]] = { id, param };
            } else {
              regularParams.push({ id, param });
            }
          });
          
          // Render regular parameters first
          regularParams.forEach(({ id, param }) => {
            const row = document.createElement('tr');
            row.style.borderBottom = '1px solid #eee';
            
            row.innerHTML = 
              '<td style="padding: 8px;">@' + param.name + '</td>' +
              '<td style="padding: 8px;">' + editor.parametersManager.PARAM_TYPES[param.type].label + '</td>' +
              '<td style="padding: 8px;">' + param.defaultValue + '</td>' +
              '<td style="padding: 8px;">' +
                '<button class="edit-param-btn" data-id="' + id + '" ' +
                        'style="background: #007cba; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; margin-right: 5px;">Edit</button>' +
                '<button class="delete-param-btn" data-id="' + id + '" ' +
                        'style="background: #d63031; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer;">Delete</button>' +
              '</td>';
            
            parametersTBody.appendChild(row);
          });
          
          // Add separator if we have both regular params and clone groups
          if (regularParams.length > 0 && Object.keys(cloneGroups).length > 0) {
            const separatorRow = document.createElement('tr');
            separatorRow.innerHTML = '<td colspan="4" style="padding: 12px 8px; background: #f8f8f8; font-weight: bold; color: #666;">Parametric Clone Groups</td>';
            parametersTBody.appendChild(separatorRow);
          }
          
          // Render parametric clone groups
          Object.keys(cloneGroups).forEach(timestamp => {
            const group = cloneGroups[timestamp];
            
            // Create group header
            const headerRow = document.createElement('tr');
            headerRow.style.background = '#f5f5f5';
            headerRow.innerHTML = '<td colspan="4" style="padding: 8px; font-weight: bold;">Clone Group ' + timestamp + '</td>';
            parametersTBody.appendChild(headerRow);
            
            // Render group parameters in order: cols, rows, spacing_x, spacing_y
            ['cols', 'rows', 'spacing_x', 'spacing_y'].forEach(type => {
              if (group[type]) {
                const { id, param } = group[type];
                const row = document.createElement('tr');
                row.style.borderBottom = '1px solid #eee';
                row.style.paddingLeft = '16px';
                
                // Friendly names for grid parameters
                const friendlyNames = {
                  cols: 'Columns',
                  rows: 'Rows', 
                  spacing_x: 'Horizontal Spacing',
                  spacing_y: 'Vertical Spacing'
                };
                
                row.innerHTML = 
                  '<td style="padding: 8px; padding-left: 16px; color: #666;">└ ' + friendlyNames[type] + '</td>' +
                  '<td style="padding: 8px;">' + editor.parametersManager.PARAM_TYPES[param.type].label + '</td>' +
                  '<td style="padding: 8px;">' + param.defaultValue + '</td>' +
                  '<td style="padding: 8px;">' +
                    '<button class="edit-param-btn" data-id="' + id + '" ' +
                            'style="background: #007cba; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; margin-right: 5px;">Edit</button>' +
                    '<button class="delete-param-btn" data-id="' + id + '" ' +
                            'style="background: #d63031; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer;">Delete</button>' +
                  '</td>';
                
                parametersTBody.appendChild(row);
              }
            });
          });
          
          // Add event listeners for edit/delete buttons
          el.querySelectorAll('.edit-param-btn').forEach(btn => {
            btn.addEventListener('click', function() {
              editParameter(this.dataset.id);
            });
          });
          
          el.querySelectorAll('.delete-param-btn').forEach(btn => {
            btn.addEventListener('click', function() {
              deleteParameter(this.dataset.id);
            });
          });
        }
      }
      
      // Store the render function on the modal object so it can be called later
      modal.renderParametersList = renderParametersList;
      
      // Show parameter form
      function showParameterForm(isEdit = false, parameterId = null) {
        parametersContainer.style.display = 'none';
        parameterForm.style.display = 'block';
        parameterFormTitle.textContent = isEdit ? 'Edit Parameter' : 'Add Parameter';
        editingParameterId = parameterId;
        
        if (isEdit && parameterId) {
          const param = editor.parametersManager.getParameter(parameterId);
          if (param) {
            paramNameInput.value = param.name;
            paramTypeSelect.value = param.type;
            updateDefaultValueInput();
            
            // Set default value after updating input type
            setTimeout(() => {
              const defaultInput = el.querySelector('#param-default');
              defaultInput.value = param.defaultValue;
            }, 0);
            
            paramDescriptionInput.value = param.description || '';
          }
        } else {
          parameterFormElement.reset();
          updateDefaultValueInput();
        }
        
        paramNameInput.focus();
      }
      
      // Hide parameter form
      function hideParameterForm() {
        parametersContainer.style.display = 'block';
        parameterForm.style.display = 'none';
        editingParameterId = null;
        parameterFormElement.reset();
      }
      
      // Edit parameter
      function editParameter(id) {
        showParameterForm(true, id);
      }
      
      // Delete parameter
      function deleteParameter(id) {
        const param = editor.parametersManager.getParameter(id);
                 if (param && confirm("Are you sure you want to delete parameter \"@" + param.name + "\"?")) {
          try {
                          editor.parametersManager.deleteParameter(id);
            renderParametersList();
            
            // Update property validation autocomplete
            if (editor.propertyValidation) {
              editor.propertyValidation.addParameterAutocomplete();
            }
          } catch (error) {
            alert('Error deleting parameter: ' + error.message);
          }
        }
      }
      
      // Event listeners
      addParameterBtn.addEventListener('click', () => showParameterForm());
      parametersCancelBtn.addEventListener('click', () => editor.modal.parameters.close());
      parameterFormCancel.addEventListener('click', hideParameterForm);
      paramTypeSelect.addEventListener('change', updateDefaultValueInput);
      
      // Ensure input fields are clickable
      paramNameInput.addEventListener('mousedown', function(e) {
        e.stopPropagation();
        this.focus();
      });
      
      // Handle dynamic default input field
      function ensureDefaultInputClickable() {
        const defaultInput = el.querySelector('#param-default');
        if (defaultInput) {
          defaultInput.addEventListener('mousedown', function(e) {
            e.stopPropagation();
            this.focus();
          });
        }
      }
      ensureDefaultInputClickable();
      
      parameterFormElement.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const name = paramNameInput.value.trim();
        const type = paramTypeSelect.value;
        const defaultValue = el.querySelector('#param-default').value;
        const description = paramDescriptionInput.value.trim();
        
        if (!name) {
          alert('Parameter name is required.');
          return;
        }
        
        try {
          if (editingParameterId) {
                          editor.parametersManager.updateParameter(editingParameterId, name, type, defaultValue, description);
          } else {
                          editor.parametersManager.addParameter(name, type, defaultValue, description);
          }
          
          hideParameterForm();
          renderParametersList();
          
          // Update property validation autocomplete
          if (editor.propertyValidation) {
            editor.propertyValidation.addParameterAutocomplete();
          }
        } catch (error) {
          alert('Error saving parameter: ' + error.message);
        }
      });
    }
  }),
  
  parametricClone: new MD.Modal({
    html: `
      <h1>Define Parametric Clone</h1>
      <p style="margin-bottom: 20px; color: #666;">
        Create a parametric grid of cloned elements with configurable spacing and dimensions.
      </p>
      
      <div id="parametric-clone-form">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
          <div>
            <label for="clone-cols" style="display: block; margin-bottom: 5px; font-weight: bold;">Columns:</label>
            <input type="number" id="clone-cols" value="3" min="1" max="20" 
                   style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
          </div>
          
          <div>
            <label for="clone-rows" style="display: block; margin-bottom: 5px; font-weight: bold;">Rows:</label>
            <input type="number" id="clone-rows" value="2" min="1" max="20"
                   style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
          </div>
          
          <div>
            <label for="clone-spacing-x" style="display: block; margin-bottom: 5px; font-weight: bold;">Horizontal Spacing:</label>
            <input type="number" id="clone-spacing-x" value="50" min="0" max="1000"
                   style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
          </div>
          
          <div>
            <label for="clone-spacing-y" style="display: block; margin-bottom: 5px; font-weight: bold;">Vertical Spacing:</label>
            <input type="number" id="clone-spacing-y" value="50" min="0" max="1000"
                   style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
          </div>
        </div>
        
        <div style="text-align: right; margin-top: 30px;">
          <button id="parametric-clone-cancel" style="background: #666; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin-right: 10px;">Cancel</button>
          <button id="parametric-clone-create" style="background: #007cba; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Create Clone</button>
        </div>
      </div>
    `,
    
    js: function(el) {
      // Handle cancel button
      el.querySelector('#parametric-clone-cancel').addEventListener('click', function() {
        editor.modal.parametricClone.close();
      });
      
      // Handle create button
      el.querySelector('#parametric-clone-create').addEventListener('click', function() {
        const cols = parseInt(el.querySelector('#clone-cols').value) || 3;
        const rows = parseInt(el.querySelector('#clone-rows').value) || 2;
        const spacingX = parseInt(el.querySelector('#clone-spacing-x').value) || 50;
        const spacingY = parseInt(el.querySelector('#clone-spacing-y').value) || 50;
        
        const isEditing = el.getAttribute('data-editing-clone') === 'true';
        
        if (isEditing) {
          // Update existing parametric clone
          const colsParam = el.getAttribute('data-cols-param');
          const rowsParam = el.getAttribute('data-rows-param');
          const spacingXParam = el.getAttribute('data-spacing-x-param');
          const spacingYParam = el.getAttribute('data-spacing-y-param');
          const cloneGroupId = el.getAttribute('data-clone-group-id');
          
          try {
            // Update parameter values
            const parametersManager = editor.parametersManager;
            const colsParamObj = parametersManager.getParameterByName(colsParam);
            const rowsParamObj = parametersManager.getParameterByName(rowsParam);
            const spacingXParamObj = parametersManager.getParameterByName(spacingXParam);
            const spacingYParamObj = parametersManager.getParameterByName(spacingYParam);
            
            if (colsParamObj && rowsParamObj && spacingXParamObj && spacingYParamObj) {
              // Get parameter IDs from the parameters object
              const parameters = parametersManager.getParameters();
              let colsId, rowsId, spacingXId, spacingYId;
              
              Object.keys(parameters).forEach(id => {
                const param = parameters[id];
                if (param.name === colsParam) colsId = id;
                if (param.name === rowsParam) rowsId = id;
                if (param.name === spacingXParam) spacingXId = id;
                if (param.name === spacingYParam) spacingYId = id;
              });
              
              if (colsId) parametersManager.updateParameter(colsId, colsParam, 'grid_cols', cols, colsParamObj.description);
              if (rowsId) parametersManager.updateParameter(rowsId, rowsParam, 'grid_rows', rows, rowsParamObj.description);
              if (spacingXId) parametersManager.updateParameter(spacingXId, spacingXParam, 'grid_spacing_x', spacingX, spacingXParamObj.description);
              if (spacingYId) parametersManager.updateParameter(spacingYId, spacingYParam, 'grid_spacing_y', spacingY, spacingYParamObj.description);
              
              // Regenerate the clone group
              if (typeof svgCanvas.updateParametricCloneGroup === 'function') {
                svgCanvas.updateParametricCloneGroup(cloneGroupId);
              }
              
              alert('Parametric clone updated successfully.');
            }
          } catch (error) {
            alert('Error updating parametric clone: ' + error.message);
          }
          
          // Clear editing state
          el.removeAttribute('data-editing-clone');
          el.removeAttribute('data-cols-param');
          el.removeAttribute('data-rows-param');
          el.removeAttribute('data-spacing-x-param');
          el.removeAttribute('data-spacing-y-param');
          el.removeAttribute('data-clone-group-id');
        } else {
          // Create new parametric clone
          if (typeof editor.createParametricClone === 'function') {
            editor.createParametricClone(cols, rows, spacingX, spacingY);
          }
        }
        
        editor.modal.parametricClone.close();
      });
      
      // Ensure input fields are clickable (fix for modal z-index issues)
      el.querySelector('#clone-cols').addEventListener('mousedown', function(e) {
        e.stopPropagation();
        this.focus();
      });
      el.querySelector('#clone-rows').addEventListener('mousedown', function(e) {
        e.stopPropagation();
        this.focus();
      });
      el.querySelector('#clone-spacing-x').addEventListener('mousedown', function(e) {
        e.stopPropagation();
        this.focus();
      });
      el.querySelector('#clone-spacing-y').addEventListener('mousedown', function(e) {
        e.stopPropagation();
        this.focus();
      });
    }
  })
};