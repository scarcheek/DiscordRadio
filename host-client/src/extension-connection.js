import express from 'express';
import { updateActivity } from './activity.js';
import $ from './state.js';

export default function listenForExtension(config) {
  return new Promise((resolve, reject) => {
    $.extensionConn = express();
    $.extensionConn.use(express.json());
    $.extensionConn.use(cors);
  
    $.extensionConn.post('/', (req, res) => {
      try {
        const data = req.body;
        data.updatedOn = Date.now();
        
        if ($.currActivityData?.title !== data.title) {
          console.log(`🎶 Now listening to ${data.title}`);
          $.currActivityData = data;
        }
        
        updateActivity(data, config);
        res.end();
      }
      catch (err) {
        handleError(res, err);
      }
    });
  
    $.extensionConn.delete('/', (req, res) => {
      try {
        $.discordConn.setActivity();
        console.log(`🙉 Stopped listening to ${$.currActivityData.title}`);
        $.currActivityData = null;
  
        res.end();
      }
      catch (err) {
        handleError(res, err);
      }
    });
  
    $.extensionConn.listen(6969, 'localhost', () => {
      console.log('📻 Listening for the browser extension.');
      console.log();
      resolve();
    });
  });
};

function cors(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', '*');
  res.header('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTION') return res.send();
  else next();
}

function handleError(res, err) {
  console.error(err);
  res.statusCode = 500;
  res.end(`😱 Error: ${err.message}`);
}
