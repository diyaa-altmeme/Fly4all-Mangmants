const { onRequest } = require('firebase-functions/v2/https');
  const server = import('firebase-frameworks');
  exports.ssrfly4all782771223cbd0 = onRequest({"region":"us-central1"}, (req, res) => server.then(it => it.handle(req, res)));
  