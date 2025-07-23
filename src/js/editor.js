const MD = {};

MD.Editor = function(){
  
  const el = document.getElementById("method-draw");
  const serializer = new XMLSerializer();
  const _self = this;
  const workarea = document.getElementById("workarea");
  _self.selected = [];

  function clear(){
    var dims = state.get("canvasSize");
    $.confirm("<h4>Do you want to clear the drawing?</h4><p>This will also erase your undo history</p>", function(ok) {
      if(!ok) return;
      state.set("canvasMode", "select")
      svgCanvas.clear();
      svgCanvas.setResolution(dims[0], dims[1]);
      editor.canvas.update(true);
      editor.zoom.reset();
      editor.panel.updateContextPanel();
      editor.paintBox.fill.prep();
      editor.paintBox.stroke.prep();
      svgCanvas.runExtensions('onNewDocument');
    });
  }

  function save(){
    _self.menu.flash($('#file_menu'));
    svgCanvas.save();
  }

  function undo(){
    if (!svgCanvas.undoMgr.getUndoStackSize()) return false;
    _self.menu.flash($('#edit_menu'));
    svgCanvas.undoMgr.undo();
  }

  function redo(){
    if (svgCanvas.undoMgr.getRedoStackSize() > 0) {
      _self.menu.flash($('#edit_menu'));
      svgCanvas.undoMgr.redo();
    }
  }

  function duplicateSelected(){
    if (!_self.selected.length) return false;
    _self.menu.flash($('#edit_menu'));
    svgCanvas.cloneSelectedElements(20,20);
  };

  function deleteSelected(){
    if (svgCanvas.getMode() === "pathedit" && svgCanvas.pathActions.getNodePoint())
      svgCanvas.pathActions.deletePathNode();
    else 
      svgCanvas.deleteSelectedElements();
  }

  function cutSelected(){
    if (!_self.selected.length) return false;
    _self.menu.flash($('#edit_menu'));
    svgCanvas.cutSelectedElements(); 
  }

  function copySelected(){
    if (!_self.selected.length) return false;
    _self.menu.flash($('#edit_menu'));
    svgCanvas.copySelectedElements();
  }
  
  function pasteSelected(){
    _self.menu.flash($('#edit_menu'));
    var zoom = svgCanvas.getZoom();       
    var x = (workarea.scrollLeft + workarea.offsetWidth/2)/zoom  - svgCanvas.contentW; 
    var y = (workarea.scrollTop + workarea.offsetHeight/2)/zoom  - svgCanvas.contentH;
    svgCanvas.pasteElements('point', x, y); 
  }

  function moveToTopSelected(){
    if (!_self.selected.length) return false;
    _self.menu.flash($('#object_menu'));
    svgCanvas.moveToTopSelectedElement();
  }

  function moveToBottomSelected(){
    if (!_self.selected.length) return false;
    _self.menu.flash($('#object_menu'));
    svgCanvas.moveToBottomSelectedElement();
  }
    
  function moveUpSelected(){
    if (!_self.selected.length) return false;
    _self.menu.flash($('#object_menu'));
    svgCanvas.moveUpDownSelected("Up");
  }

  function moveDownSelected(){
    if (!_self.selected.length) return false;
    _self.menu.flash($('#object_menu'));
    svgCanvas.moveUpDownSelected("Down");
  }
 
  function convertToPath(){
    if (!_self.selected.length) return false;
    svgCanvas.convertToPath();
    var elems = svgCanvas.getSelectedElems()
    svgCanvas.selectorManager.requestSelector(elems[0]).reset(elems[0])
    //svgCanvas.selectorManager.requestSelector(elems[0]).selectorRect.setAttribute("display", "none");
    svgCanvas.setMode("pathedit");
    svgCanvas.pathActions.toEditMode(elems[0]);
    svgCanvas.clearSelection();
    editor.panel.updateContextPanel();
  }

  function reorientPath(){
    if (!_self.selected.length) return false;
    svgCanvas.pathActions.reorient();
  }

  function focusPaint(){
    $("#tool_stroke").toggleClass('active')
    $("#tool_fill").toggleClass('active')
  }

  function switchPaint(strokeOrFill) {
    focusPaint();
    var stroke_rect = document.querySelector('#tool_stroke rect');
    var fill_rect = document.querySelector('#tool_fill rect');
    var fill_color = fill_rect.getAttribute("fill");
    var stroke_color = stroke_rect.getAttribute("fill");
    var stroke_opacity = parseFloat(stroke_rect.getAttribute("opacity"));
    if (isNaN(stroke_opacity)) {stroke_opacity = 1;}
    var fill_opacity = parseFloat(fill_rect.getAttribute("opacity"));
    if (isNaN(fill_opacity)) {fill_opacity = 1;}
    stroke_opacity *= 100;
    fill_opacity   *= 100;
    var stroke = editor.paintBox.stroke.getPaint(stroke_color, stroke_opacity, "stroke");
    var fill = editor.paintBox.fill.getPaint(fill_color, fill_opacity, "fill");
    editor.paintBox.fill.setPaint(stroke, true);
    editor.paintBox.stroke.setPaint(fill, true);
  };

  function escapeMode(){
    for (key in editor.modal) editor.modal[key].close();
    state.set("canvasMode", "select");
    if ($("#cur_context_panel").is(":visible")) {
      svgCanvas.leaveContext()
    }
    else
      saveCanvas()
  }

  // called when we've selected a different element
  function selectedChanged(window,elems) {
    const mode = svgCanvas.getMode();
    _self.selected = elems.filter(Boolean);
    editor.paintBox.fill.update();
    editor.paintBox.stroke.update();
    editor.panel.updateContextPanel(_self.selected);
  };

  function contextChanged(win, context) {
    var link_str = '';
    if(context) {
      var str = '';
      link_str = '<a href="#" data-root="y">' + svgCanvas.getCurrentDrawing().getCurrentLayerName() + '</a>';
      
      $(context).parentsUntil('#svgcontent > g').addBack().each(function() {
        if(this.id) {
          str += ' > ' + this.id;
          if(this !== context) {
            link_str += ' > <a href="#">' + this.id + '</a>';
          } else {
            link_str += ' > ' + this.id;
          }
        }
      });

      cur_context = str;
    } else {
      cur_context = null;
    }
    $('#cur_context_panel').toggle(!!context).html(link_str);

  }

  function elementChanged(window,elems){
    const mode = svgCanvas.getMode();

    // if the element changed was the svg, then it could be a resolution change
    if (elems[0].tagName === "svg")  return editor.canvas.update(true);

    
    editor.panel.updateContextPanel(elems);
    
    svgCanvas.runExtensions("elementChanged", {
      elems: elems
    });

    // Reset any parametrized attributes back to their parameter values after element changes
    if (editor.propertyValidation && elems && elems.length > 0) {
      // Use setTimeout to ensure DOM updates are complete
      setTimeout(() => {
        const elementsWithParams = elems.filter(elem => 
          elem && editor.propertyValidation.hasParameterReferences(elem)
        );
        if (elementsWithParams.length > 0) {
          editor.propertyValidation.resetParameterizedAttributes(elementsWithParams);
        }
      }, 50);
    }

    if (!svgCanvas.getContext()) {
        saveCanvas();
      }
  }

  function changeAttribute(attr, value, completed) {
    // Parameter resolution handled by PropertyValidation
    if (attr === "opacity") value *= 0.01;
    if (completed) {
      svgCanvas.changeSelectedAttribute(attr, value);
      saveCanvas();
    }
    else svgCanvas.changeSelectedAttributeNoUndo(attr, value);      
  }

  function elementTransition(window, elems){
      var mode = svgCanvas.getMode();
      var elem = elems[0];
      
      if(!elem) return;
      
      const multiselected = (elems.length >= 2 && elems[1] != null) ? elems : null;
      // Only updating fields for single elements for now
      if(!multiselected && mode === "rotate") {
        var rotate_string = 'rotate('+ svgCanvas.getRotationAngle(elem) + 'deg)';
        $('#tool_angle_indicator').css("transform", rotate_string);
      }
      svgCanvas.runExtensions("elementTransition", {
        elems: elems
      });
  }

  function moveSelected(dx,dy) {
    if (!_self.selected.length) return false;
    if(state.get("canvasSnap")) {
      // Use grid snap value regardless of zoom level
      var multi = svgCanvas.getZoom() * state.get("canvasSnapStep");
      dx *= multi;
      dy *= multi;
    }
    //$('input').blur()
    svgCanvas.moveSelectedElements(dx,dy);
  };

  function extensionAdded(wind, func){
    if (func.callback) func.callback()
  }

  function changeBlur(ctl, completed){
    // todo not receiving ctl
    const val = $('#blur').val();
    if (completed) {
      svgCanvas.setBlur(val, true);
    }
    else {
      svgCanvas.setBlurNoUndo(val);
    }
  }

  function changeRotationAngle(ctl){
    const val = document.getElementById("angle").value;
    const indicator = document.getElementById("tool_angle_indicator");
    const reorient = document.getElementById("tool_reorient");
    const preventUndo = true;

    svgCanvas.setRotationAngle(val, preventUndo);
    indicator.style.transform = 'rotate('+ val + 'deg)'
    reorient.classList.toggle("disabled", val === 0);

  }

  function exportHandler(window, data) {
    var issues = data.issues;
    
    if(!$('#export_canvas').length) {
      $('<canvas>', {id: 'export_canvas'}).hide().appendTo('body');
    }
    var c = $('#export_canvas')[0];
    
    c.width = svgCanvas.contentW;
    c.height = svgCanvas.contentH;
    canvg(c, data.svg, {renderCallback: function() {
      var datauri = c.toDataURL('image/png');  
      if (!datauri) return false;
      var filename = "Method Draw Image";
      var type = 'image/png';
      var file = svgedit.utilities.dataURItoBlob(datauri, type);
      if (window.navigator.msSaveOrOpenBlob) // IE10+
          window.navigator.msSaveOrOpenBlob(file, filename);
      else { // Others
          var a = document.createElement("a"),
                  url = URL.createObjectURL(file);
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          setTimeout(function() {
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
          }, 0);
      }
    }});
  };

  function exportJS() {
    try {
      console.log('Starting JavaScript export...');
      
      // Get the SVG content
      const svgString = svgCanvas.getSvgString();
      console.log('Got SVG string:', svgString.length, 'characters');
      
      // Create the JavaScript function
      const jsFunction = generateParametricJS(svgString);
      console.log('Generated JS function:', jsFunction.length, 'characters');
      
      // Create and download the JS file
      const title = state.get("canvasTitle") || "parametric-svg";
      const filename = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const blob = new Blob([jsFunction], { type: "application/javascript;charset=utf-8" });
      
      console.log('Downloading file:', `${filename}.js`);
      
      // Use the saveAs function from filesaver.js
      if (typeof saveAs !== 'undefined') {
        saveAs(blob, `${filename}.js`);
      } else {
        // Fallback download method
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${filename}.js`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 0);
      }
      
      console.log('JavaScript export completed successfully');
    } catch (error) {
      console.error('Error during JavaScript export:', error);
      alert('Error exporting JavaScript file: ' + error.message);
    }
  }

  function generateParametricJS(svgString) {
    // Parse the SVG to find parametric elements
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
    
    // Collect all parameters and their default values
    const parametersObj = editor.parametersManager.getParameters() || {};
    console.log('Parameters object:', parametersObj);
    const paramMap = {};
    
    // Convert parameters object to map by parameter name
    Object.values(parametersObj).forEach(param => {
      if (param && param.name) {
        paramMap[param.name] = param;
      }
    });
    console.log('Parameter map:', paramMap);
    
    // Find all elements with data-param-* attributes and replace their values
    const parameterizedElements = svgDoc.querySelectorAll('[class*="data-param-"], [data-param-width], [data-param-height], [data-param-x], [data-param-y], [data-param-cx], [data-param-cy], [data-param-rx], [data-param-ry], [data-param-r]');
    
    // Actually, let's find ALL elements and check their attributes
    const allElements = svgDoc.querySelectorAll('*');
    allElements.forEach(elem => {
      for (let i = 0; i < elem.attributes.length; i++) {
        const attr = elem.attributes[i];
        if (attr.name.startsWith('data-param-')) {
          const attrName = attr.name.substring('data-param-'.length);
          const paramRef = attr.value;
          const paramName = paramRef.substring(1); // Remove the @ symbol
          
          if (paramMap[paramName]) {
            // Replace the actual attribute value with template literal
            elem.setAttribute(attrName, `\${${paramName}}`);
          }
        }
      }
    });
    
    // Handle parametric clone groups
    const cloneGroups = svgDoc.querySelectorAll('[data-parametric-clone="true"]');
    const cloneHelperFunctions = [];
    
    cloneGroups.forEach((cloneGroup, index) => {
      const colsParam = cloneGroup.getAttribute('data-cols-param');
      const rowsParam = cloneGroup.getAttribute('data-rows-param');
      const spacingXParam = cloneGroup.getAttribute('data-spacing-x-param');
      const spacingYParam = cloneGroup.getAttribute('data-spacing-y-param');
      
      // Find template group
      const templateGroup = cloneGroup.querySelector('[data-template="true"]');
      if (templateGroup) {
        // Get template elements as string
        const templateElements = Array.from(templateGroup.children).map(child => {
          return new XMLSerializer().serializeToString(child);
        }).join('');
        
        // Generate helper function name
        const funcName = `generateCloneGrid_${index}`;
        
        // Create helper function
        const helperFunction = `
  function ${funcName}() {
    const cols = ${colsParam};
    const rows = ${rowsParam};
    const spacingX = ${spacingXParam};
    const spacingY = ${spacingYParam};
    
    let elements = '';
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const offsetX = col * spacingX;
        const offsetY = row * spacingY;
        
        if (offsetX === 0 && offsetY === 0) {
          // Original position - just add template elements
          elements += \`${templateElements.replace(/`/g, '\\`')}\`;
        } else {
          // Clone position - wrap in transform group
          elements += \`<g transform="translate(\${offsetX},\${offsetY})">${templateElements.replace(/`/g, '\\`')}</g>\`;
        }
      }
    }
    return elements;
  }`;
        
        cloneHelperFunctions.push(helperFunction);
        
        // Replace the clone group with a placeholder that calls the helper function
        const placeholder = svgDoc.createElement('g');
        placeholder.setAttribute('id', cloneGroup.id);
        placeholder.innerHTML = `\${${funcName}()}`;
        cloneGroup.parentNode.replaceChild(placeholder, cloneGroup);
      }
    });

    // Clean up data-param-* attributes and parametric clone attributes from the final output
    allElements.forEach(elem => {
      const attributesToRemove = [];
      for (let i = 0; i < elem.attributes.length; i++) {
        const attr = elem.attributes[i];
        if (attr.name.startsWith('data-param-') || 
            attr.name.startsWith('data-parametric-') ||
            attr.name.startsWith('data-cols-') ||
            attr.name.startsWith('data-rows-') ||
            attr.name.startsWith('data-spacing-') ||
            attr.name === 'data-template' ||
            attr.name === 'data-clone-instance') {
          attributesToRemove.push(attr.name);
        }
      }
      attributesToRemove.forEach(attrName => {
        elem.removeAttribute(attrName);
      });
    });
    
    // Get the modified SVG string
    const serializer = new XMLSerializer();
    let modifiedSvgString = serializer.serializeToString(svgDoc.documentElement);
    
    // Generate parameter list and default values
    const paramNames = Object.keys(paramMap);
    const paramDefaults = paramNames.map(name => {
      const param = paramMap[name];
      let defaultValue = param.defaultValue;
      
      // Format default value based on type
      if (param.type === 'text' || param.type === 'color') {
        defaultValue = `"${defaultValue}"`;
      } else if (param.type === 'boolean') {
        defaultValue = defaultValue === 'true' || defaultValue === true ? 'true' : 'false';
      }
      
      return defaultValue;
    });
    
    // Escape the SVG string for template literal
    const escapedSvg = modifiedSvgString
      .replace(/\\/g, '\\\\')    // Escape backslashes first
      .replace(/`/g, '\\`')      // Escape backticks
      .replace(/\$(?!{)/g, '\\$'); // Escape $ that aren't part of ${...}
      
    // Generate the function
    const hasParams = paramNames.length > 0;
    const paramComment = hasParams 
      ? paramNames.map(name => ` * @param {${paramMap[name].type}} ${name} - Default: ${paramMap[name].defaultValue}`).join('\n')
      : ' * No parameters defined';
      
    const functionParams = hasParams ? `{${paramNames.join(', ')}} = {}` : '';
    const defaultAssignments = hasParams 
      ? paramNames.map((name, i) => `  const ${name}_val = ${name} !== undefined ? ${name} : ${paramDefaults[i]};`).join('\n')
      : '';
    const variableDeclaration = hasParams 
      ? paramNames.map(name => `  const ${name} = ${name}_val;`).join('\n')
      : '';
    
    const functionBody = `/**
 * Parametric SVG Generator
 * Generated by Method Draw
 * 
 * Parameters:
${paramComment}
 */
function generateSVG(${functionParams}) {
${defaultAssignments}
${variableDeclaration}
${cloneHelperFunctions.join('')}
  
  return \`${escapedSvg}\`;
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = generateSVG;
} else if (typeof define === 'function' && define.amd) {
  define([], function() { return generateSVG; });
} else if (typeof window !== 'undefined') {
  window.generateSVG = generateSVG;
}
`;

    return functionBody;
  }

  function saveCanvas(){
    state.set("canvasContent", svgCanvas.getSvgString());
  }

  function toggleWireframe() {
    editor.menu.flash($('#view_menu')); 
    $('#tool_wireframe').toggleClass('push_button_pressed');
    $("#method-draw").toggleClass('wireframe');
  }

  function groupSelected(){
    // group
    if (_self.selected.length > 1) {
      editor.menu.flash($('#object_menu'));
      svgCanvas.groupSelectedElements();
      saveCanvas();
    }
  };

  function ungroupSelected(){
    if(_self.selected.length === 1 && _self.selected[0].tagName === "g"){
      editor.menu.flash($('#object_menu'));
      svgCanvas.ungroupSelectedElement();
      saveCanvas();
    }
  }

  function createParametricClone(cols, rows, spacingX, spacingY) {
    // Check if we have selected elements
    const selectedElements = svgCanvas.getSelectedElems();
    if (!selectedElements || selectedElements.length === 0 || !selectedElements[0]) {
      alert('Please select one or more elements to create a parametric clone.');
      return;
    }

    // Generate unique parameter names based on timestamp
    const timestamp = Date.now();
    const colsParamName = `clone_cols_${timestamp}`;
    const rowsParamName = `clone_rows_${timestamp}`;
    const spacingXParamName = `clone_spacing_x_${timestamp}`;
    const spacingYParamName = `clone_spacing_y_${timestamp}`;

    try {
      // Add the grid parameters to the parameter system
      editor.parametersManager.addParameter(colsParamName, 'grid_cols', cols, 'Number of columns in the grid');
      editor.parametersManager.addParameter(rowsParamName, 'grid_rows', rows, 'Number of rows in the grid');
      editor.parametersManager.addParameter(spacingXParamName, 'grid_spacing_x', spacingX, 'Horizontal spacing between elements');
      editor.parametersManager.addParameter(spacingYParamName, 'grid_spacing_y', spacingY, 'Vertical spacing between elements');

      // Create the parametric clone group using SVG canvas
      const cloneGroupId = svgCanvas.createParametricCloneGroup(
        selectedElements,
        colsParamName,
        rowsParamName,
        spacingXParamName,
        spacingYParamName
      );

      if (cloneGroupId) {
        // Select the new group
        const cloneGroup = svgedit.utilities.getElem(cloneGroupId);
        if (cloneGroup) {
          svgCanvas.clearSelection();
          svgCanvas.addToSelection([cloneGroup]);
        }
        
        saveCanvas();
        alert(`Parametric clone created with ${cols}×${rows} grid pattern.`);
      }
         } catch (error) {
       alert('Error creating parametric clone: ' + error.message);
     }
   }

   function editParametricClone(cloneGroup) {
     if (!cloneGroup || cloneGroup.getAttribute('data-parametric-clone') !== 'true') {
       alert('Selected element is not a parametric clone.');
       return;
     }

     // Get parameter names from the clone group
     const colsParam = cloneGroup.getAttribute('data-cols-param');
     const rowsParam = cloneGroup.getAttribute('data-rows-param');
     const spacingXParam = cloneGroup.getAttribute('data-spacing-x-param');
     const spacingYParam = cloneGroup.getAttribute('data-spacing-y-param');

     if (!colsParam || !rowsParam || !spacingXParam || !spacingYParam) {
       alert('Parametric clone data is corrupted.');
       return;
     }

     // Get current parameter values
     const colsParamObj = editor.parametersManager.getParameterByName(colsParam);
     const rowsParamObj = editor.parametersManager.getParameterByName(rowsParam);
     const spacingXParamObj = editor.parametersManager.getParameterByName(spacingXParam);
     const spacingYParamObj = editor.parametersManager.getParameterByName(spacingYParam);

     if (!colsParamObj || !rowsParamObj || !spacingXParamObj || !spacingYParamObj) {
       alert('Could not find associated parameters for this parametric clone.');
       return;
     }

     // Set up the modal with current values
     const modal = editor.modal.parametricClone;
     modal.open();
     
     // Pre-populate the form with current values
     setTimeout(() => {
       const modalEl = modal.el;
       modalEl.querySelector('#clone-cols').value = colsParamObj.defaultValue;
       modalEl.querySelector('#clone-rows').value = rowsParamObj.defaultValue;
       modalEl.querySelector('#clone-spacing-x').value = spacingXParamObj.defaultValue;
       modalEl.querySelector('#clone-spacing-y').value = spacingYParamObj.defaultValue;
       
       // Store the parameter names for updating
       modalEl.setAttribute('data-editing-clone', 'true');
       modalEl.setAttribute('data-cols-param', colsParam);
       modalEl.setAttribute('data-rows-param', rowsParam);
       modalEl.setAttribute('data-spacing-x-param', spacingXParam);
       modalEl.setAttribute('data-spacing-y-param', spacingYParam);
       modalEl.setAttribute('data-clone-group-id', cloneGroup.id);
     }, 50);
   }

  function about(){
    editor.modal.about.open();
  }

  function configure(){
    //const props = dao.filter
    editor.modal.configure.open();
  }

  function shortcuts(){
    editor.modal.shortcuts.open();
  }

  function donate(){
    editor.modal.donate.open();
  }

  function source(){
    const textarea = editor.modal.source.el.querySelector("textarea");
    textarea.value = svgCanvas.getSvgString();
    editor.modal.source.open();
  }

  function parameters(){
    // Refresh the parameters list before opening
    if (editor.modal.parameters.renderParametersList) {
      editor.modal.parameters.renderParametersList();
    }
    editor.modal.parameters.open();
  }

  function loadFromUrl(url, cb){
    if(!cb) cb = function(){/*noop*/};
    $.ajax({
      'url': url,
      'dataType': 'text',
      cache: false,
      success: function(str) {
        editor.import.loadSvgString(str, cb);
      },
      error: function(xhr, stat, err) {
        if(xhr.status != 404 && xhr.responseText) {
          editor.import.loadSvgString(xhr.responseText, cb);
        } else {
          $.alert("Unable to load from URL" + ": \n"+err+'', cb);
        }
      }
    });
  }

  this.el = el;
  this.selectedChanged = selectedChanged;
  this.elementChanged = elementChanged;
  this.changeAttribute = changeAttribute;
  this.contextChanged = contextChanged;
  this.elementTransition = elementTransition;
  this.createParametricClone = createParametricClone;
  this.editParametricClone = editParametricClone;
  this.switchPaint = switchPaint;
  this.focusPaint = focusPaint;
  this.save = save;
  this.undo = undo;
  this.redo = redo;
  this.clear = clear;
  this.duplicateSelected = duplicateSelected;
  this.deleteSelected = deleteSelected;
  this.cutSelected = cutSelected;
  this.copySelected = copySelected;
  this.pasteSelected = pasteSelected;
  this.moveToTopSelected = moveToTopSelected;
  this.moveUpSelected = moveUpSelected;
  this.moveToBottomSelected = moveToBottomSelected;
  this.moveDownSelected = moveDownSelected;
  this.moveSelected = moveSelected;
  this.convertToPath = convertToPath;
  this.reorientPath = reorientPath;
  this.escapeMode = escapeMode;
  this.extensionAdded = extensionAdded;
  this.changeBlur = changeBlur;
  this.changeRotationAngle = changeRotationAngle;
  this.exportHandler = exportHandler;
  this.toggleWireframe = toggleWireframe;
  this.groupSelected = groupSelected;
  this.ungroupSelected = ungroupSelected;
  this.about = about;
  this.configure = configure;
  this.shortcuts = shortcuts;
  this.donate = donate;
  this.source = source;
  this.parameters = parameters;
  this.exportJS = exportJS;
  this.saveCanvas = saveCanvas;
  this.loadFromUrl = loadFromUrl;

  this.export = function(){ 
    if(window.canvg) {
        svgCanvas.rasterExport();
      } else {
        $.getScript('js/lib/rgbcolor.js', function() {
          $.getScript('js/lib/canvg.js', function() {
            svgCanvas.rasterExport();
          });
        });
      }}
}