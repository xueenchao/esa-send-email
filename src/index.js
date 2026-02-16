/**
 * 阿里云 ESA 边缘函数 - 硬编码 Gmail 发信版
 */

// 直接在此配置，无需环境变量
const CONFIG = {
  clientId: '831467567893-bftkrebsf3v5p74e57b8krpdgvudl4tk.apps.googleusercontent.com',
  clientSecret: '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',
  refreshToken: '1//04c2zYrh6sU_CCgYIARAAGAQSNwF-L9Ir0Z0LiccR2_M7hVLRNTG9KbDVaMIRwk5zeloqVJ0EZiyliPrzs-oxKb4_IfkalN1R45o',
  senderEmail: 'x838050814@gmail.com',
  receiverEmail: '838050814@qq.com'
};

export default {
  async fetch(request, env, ctx) {
    // 1. 处理 CORS 预检请求 (解决前端 Fetch 报错)
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    // 2. 校验请求方法
    if (request.method !== 'POST') {
      return new Response('Only POST allowed', { status: 405 });
    }

    try {
      const { name, email, message } = await request.json();

      // 3. 获取 Google Access Token
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: CONFIG.clientId,
          client_secret: CONFIG.clientSecret,
          refresh_token: CONFIG.refreshToken,
          grant_type: 'refresh_token',
        })
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) throw new Error('Auth failed: ' + JSON.statusText);

      // 4. 构建并编码邮件内容 (RFC 2822)
      const subject = `Message from ${name}`;
      const rawMail = [
        `From: ${CONFIG.senderEmail}`,
        `To: ${CONFIG.receiverEmail}`,
        `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=utf-8',
        '',
        `Name: ${name}`,
        `Email: ${email}`,
        `Message: ${message}`
      ].join('\n');

      const encodedMail = btoa(unescape(encodeURIComponent(rawMail)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // 5. 调用 Gmail API 发送
      const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: encodedMail })
      });

      const result = await sendRes.json();

      return new Response(JSON.stringify({ success: sendRes.ok, id: result.id }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*' 
        }
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }
  }
};