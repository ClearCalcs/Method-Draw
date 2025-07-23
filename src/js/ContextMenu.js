MD.ContextMenu = function(){
  // Set up the context menu
  $("#workarea").contextMenu({
      menu: 'cmenu_canvas',
      inSpeed: 0
    },
    function(action, el, pos) {
      switch ( action ) {
        case 'delete':
          svgCanvas.deleteSelectedElements();
          break;
        case 'cut':
          // Flash edit menu and call cut
          var edit_menu_title = $('#edit_menu').prev();
          edit_menu_title.css({'background': 'white', 'color': 'black'});
          setTimeout(() => edit_menu_title.removeAttr('style'), 200);
          svgCanvas.cutSelectedElements();
          break;
        case 'copy':
          // Flash edit menu and call copy
          var edit_menu_title = $('#edit_menu').prev();
          edit_menu_title.css({'background': 'white', 'color': 'black'});
          setTimeout(() => edit_menu_title.removeAttr('style'), 200);
          svgCanvas.copySelectedElements();
          break;
        case 'paste':
          // Flash edit menu and call paste with proper positioning
          var edit_menu_title = $('#edit_menu').prev();
          edit_menu_title.css({'background': 'white', 'color': 'black'});
          setTimeout(() => edit_menu_title.removeAttr('style'), 200);
          var zoom = svgCanvas.getZoom();
          var workarea = $("#workarea");
          var x = (workarea[0].scrollLeft + workarea.width()/2)/zoom - svgCanvas.contentW; 
          var y = (workarea[0].scrollTop + workarea.height()/2)/zoom - svgCanvas.contentH;
          svgCanvas.pasteElements('point', x, y);
          break;
        case 'paste_in_place':
          // Flash edit menu and call paste in place
          var edit_menu_title = $('#edit_menu').prev();
          edit_menu_title.css({'background': 'white', 'color': 'black'});
          setTimeout(() => edit_menu_title.removeAttr('style'), 200);
          svgCanvas.pasteElements('in_place');
          break;
        case 'group':
          svgCanvas.groupSelectedElements();
          break;
        case 'ungroup':         
          svgCanvas.ungroupSelectedElement();  
          break;
        case 'move_front':
          // Flash object menu and call move front
          var object_menu_title = $('#object_menu').prev();
          object_menu_title.css({'background': 'white', 'color': 'black'});
          setTimeout(() => object_menu_title.removeAttr('style'), 200);
          svgCanvas.moveToTopSelectedElement();
          break;
        case 'move_up':
          // Flash object menu and call move up
          var object_menu_title = $('#object_menu').prev();
          object_menu_title.css({'background': 'white', 'color': 'black'});
          setTimeout(() => object_menu_title.removeAttr('style'), 200);
          svgCanvas.moveUpDownSelected('Up');
          break;
        case 'move_down':
          // Flash object menu and call move down
          var object_menu_title = $('#object_menu').prev();
          object_menu_title.css({'background': 'white', 'color': 'black'});
          setTimeout(() => object_menu_title.removeAttr('style'), 200);
          svgCanvas.moveUpDownSelected('Down');
          break;
        case 'move_back':
          // Flash object menu and call move back
          var object_menu_title = $('#object_menu').prev();
          object_menu_title.css({'background': 'white', 'color': 'black'});
          setTimeout(() => object_menu_title.removeAttr('style'), 200);
          svgCanvas.moveToBottomSelectedElement();
          break;
        case 'parametric_clone':
          // Check if we're editing an existing parametric clone
          var selectedElements = svgCanvas.getSelectedElems();
          var isParametricClone = selectedElements[0] && selectedElements[0].getAttribute('data-parametric-clone') === 'true';
          
          if (isParametricClone) {
            editor.editParametricClone(selectedElements[0]);
          } else {
            editor.modal.parametricClone.open();
          }
          break;
          default:
          if(svgedit.contextmenu && svgedit.contextmenu.hasCustomHandler(action)){
            svgedit.contextmenu.getCustomHandler(action).call();
            }
            break;
      }
      
  });
  
  $('.contextMenu li').mousedown(function(ev) {
    ev.preventDefault();
  })
  
  $('#cmenu_canvas li').disableContextMenu();
  var canv_menu = $("#cmenu_canvas");
  canv_menu.enableContextMenuItems('#delete,#cut,#copy');
}; 