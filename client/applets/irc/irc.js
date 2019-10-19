//  Commented out xhr load
//export function load (url, callback) {
// let xhr = new XMLHttpRequest();
//
// xhr.onreadystatechange = function() {
//   if (xhr.readystate === 4) {
//     callback(xhr.response);
//   }
// }
//
// xhr.open('GET', url, true);
// xhr.send('');
//}
import { IRC } from './utils/webIrc.js';
export function load () {
  const irc = IRC('irc-content', connected, disconnected);
  const ret  = irc.connect(wsUrl, '80', false, 'aedric', 'general');
  console.log(ret);
}

const wsUrl = '192.168.1.9';

function handleDataLoad (data) {
  console.log(data);
  // handle that data
  parseChatPayload(0, data).then((parsedChat) => {
    console.log(parsedChat);
  });
}

function disconnect() {
	console.log('disconnect');
		irc.disconnect();
}

function connected() {
	console.log('connected');
}

function disconnected() {
	console.log('disconnected');
}

const parseChatPayload = (data) => {
  if (data.data) {
    data = data.data
  }
  console.log(data);
  return new Promise(data);
  
}
