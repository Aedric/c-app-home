export const windowLoad = (applets) => {
    
    for ( var i=0, len = applets.length; i < len; i++ ) {
      var applet = applets[i];
      var draggie = new Draggabilly( applet, {
        handle: '.handle'
      }
      );
      console.log(draggie);
    }
  
  }