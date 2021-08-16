import { updateActivity } from './activity.js';



export function requestHandlerFor(client, config) {
  return (req, res) => {
    try {
      setCorsHeaders(res);

      if (req.method === 'POST') parseJsonBody(req, data => updateActivity(client, config, data));
      if (req.method === 'DELETE') client.setActivity();
      
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
