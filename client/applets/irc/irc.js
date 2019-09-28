import { load } from '../../utils/api';
import { mockload } from '../../utils/mock';

const getUrl = `${ env.IRC_SERVER_URL }${ env.IRC_GET }`;
const pageSize = env.IRC_PAGE_SIZE < 4 ? env.IRC_PAGE_SIZE : 4;

let activeChat = {};
let chatLog = [];


load(getUrl, handleDataLoad);

handleDataLoad = (data) => {
    // handle that data
    parseChatPayload(0, data.chatPayload).then((parsedChat) => {
        console.log(parsedChat);
    }) 
}

parseChatPayload = (data) => { return data.replace(/\r\n|\n\r|\n|\r/g,"\n").split("\n"); }