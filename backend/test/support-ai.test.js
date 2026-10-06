const test = require('node:test');
const assert = require('node:assert/strict');
const { askGroq } = require('../src/services/supportAiService');

test('Support AI gửi ngữ cảnh giới hạn và đọc phản hồi JSON có cấu trúc', async () => {
  const previousFetch = global.fetch;
  const previousKey = process.env.GROQ_API_KEY;
  const previousModel = process.env.AI_MODEL;
  let request;
  process.env.GROQ_API_KEY = 'gsk_test_only';
  process.env.AI_MODEL = 'openai/gpt-oss-120b';
  global.fetch = async (url, options) => {
    request = { url, options, body: JSON.parse(options.body) };
    return new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ answer: 'Xin chào, mình có thể hỗ trợ bạn.', needsHuman: false, reason: '' }) } }]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  try {
    const result = await askGroq([{ role: 'user', content: 'Bạn hỗ trợ gì?' }], 'Dữ liệu doanh nghiệp thử nghiệm');
    assert.equal(result.answer, 'Xin chào, mình có thể hỗ trợ bạn.');
    assert.equal(result.needsHuman, false);
    assert.equal(request.url, 'https://api.groq.com/openai/v1/chat/completions');
    assert.equal(request.body.model, 'openai/gpt-oss-120b');
    assert.equal(request.body.messages.at(-1).content, 'Bạn hỗ trợ gì?');
    assert.equal(request.body.response_format.json_schema.strict, true);
    assert.equal(request.options.headers.Authorization, 'Bearer gsk_test_only');
  } finally {
    global.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = previousKey;
    if (previousModel === undefined) delete process.env.AI_MODEL; else process.env.AI_MODEL = previousModel;
  }
});
