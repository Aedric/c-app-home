window.onload = function () {

    let applets = document.querySelectorAll('.applet');
    console.log(applets);

    if (applets) {
        import('./applets/window.js').then((window) => {
            window.windowLoad(applets);
        })
    }
}