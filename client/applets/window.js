export const windowLoad = (applets) => {
  console.log(applets);
  applets.forEach((applet) => {
    console.log(applet);
    var draggie = new Draggabilly(applet, {
      handle: '.handle'
    });
    console.log(draggie);
    import(`./irc/irc.js`).then((irc) => {
      irc.load(); 
    });
  });
}

