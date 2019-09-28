export function load(url, callback) {
    var xhr = new XMLHttpRequest();
  
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        callback(xhr.response);
      }
    }
  
    xhr.open('GET', url, true);
    xhr.send('');
  }