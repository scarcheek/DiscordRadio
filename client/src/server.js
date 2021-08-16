import { updateActivity } from './activity.js';

let prevData = {};



export function requestHandlerFor(client, config) {
  return (req, res) => {
    try {
      setCorsHeaders(res);

      if (req.method === 'POST') {
        parseJsonBody(req, data => {
          updateActivity(client, config, data);
          
          if (prevData?.title !== data.title) {
            console.log(`🎶 Now listening to ${data.title}`);
            prevData = data;
          }
        });
      }
      if (req.method === 'DELETE') {
        client.setActivity();
        console.log(`🙉 Stopped listening to ${prevData.title}`);
        prevData = {};
      }

      res.end();
    }
    catch (err) {
      console.error(err);
      res.statusCode = 500;
      return res.end(`😱 Error: ${err.message}`);
    }
  };
}



function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "*");
}

function parseJsonBody(req, callback) {
  req.body = '';
  req.on('data', chunk => req.body += chunk);
  req.on('end', $ => {
    const data = JSON.parse(req.body);
    callback(data);
  });
}
