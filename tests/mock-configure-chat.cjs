// Node preload for the provisioning script. No test can contact the real agent.
const fs = require('node:fs');

global.fetch = async (url, options) => {
  fs.writeFileSync(process.env.MYAKA_TEST_REQUEST_FILE, JSON.stringify({
    url, method: options.method, headers: options.headers, body: JSON.parse(options.body),
  }));
  if (process.env.MYAKA_TEST_RESPONSE === 'timeout') {
    throw new DOMException('Request timed out', 'TimeoutError');
  }
  if (process.env.MYAKA_TEST_RESPONSE === 'network') {
    throw new TypeError('Network error with a secret: ' + process.env.MYAKA_CHAT_API_KEY);
  }
  const status = Number(process.env.MYAKA_TEST_STATUS);
  const data = status === 200 && process.env.MYAKA_TEST_RESPONSE !== 'empty'
    ? { choices: [{ message: { content: 'готово' } }] }
    : { error: 'Private upstream diagnostic: ' + process.env.MYAKA_CHAT_API_KEY };
  return Response.json(data, { status });
};
