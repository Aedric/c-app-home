function load (url, callback) {
  let xhr = new XMLHttpRequest();

  xhr.onreadystatechange = function() {
    if (xhr.readystate === 4) {
      callback(xhr.response);
    }
  }

  xhr.open('GET', url, true);
  xhr.send('');
}
// const getUrl = `${env.IRC_SERVER_URL}${env.IRC_GET}`;
const getUrl = 'ws.cyberia.club:443';
// const pageSize = env.IRC_PAGE_SIZE < 4 ? env.IRC_PAGE_SIZE : 4;

let activeChat = {};
let chatLog = [];


load(getUrl, handleDataLoad);

var handleDataLoad = (data) => {
  console.log(data);
  // handle that data
  parseChatPayload(0, data.chatPayload).then((parsedChat) => {
    console.log(parsedChat);
  }); 
}

parseChatPayload = (data) => {
  return data
  //.replace(/\r\n|\n\r|\n|\r/g, "\n")
  //  .split("\n"); 
}
