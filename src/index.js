// 你的配置信息
const CONFIG = {
  clientId: '831467567893-bftkrebsf3v5p74e57b8krpdgvudl4tk.apps.googleusercontent.com',
  clientSecret: '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',
  refreshToken: '1//04c2zYrh6sU_CCgYIARAAGAQSNwF-L9Ir0Z0LiccR2_M7hVLRNTG9KbDVaMIRwk5zeloqVJ0EZiyliPrzs-oxKb4_IfkalN1R45o',
  userEmail: 'x838050814@gmail.com', // 发件人
  targetEmail: '838050814@qq.com'    // 收件人
};

async function handleRequest(request) {
  if (request.method !== 'POST') {
    return new Response('请使用 POST 方法提交数据', { status: 405 });
  }

  try {
    const { name, email, message } = await request.json();

    // 1. 获取 Access Token
    const accessToken = await getAccessToken();

    // 2. 构建符合 RFC 2822 标准的邮件内容
    const subject = `来自网站的新消息: ${name}`;
    const str = [
      `From: ${CONFIG.userEmail}`,
      `To: ${CONFIG.targetEmail}`,
      `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
      'Content-Type: text/plain; charset=utf-8',
      'MIME-Version: 1.0',
      '',
      `姓名: ${name}`,
      `发件人邮箱: ${email}`,
      `内容: \n${message}`
    ].join('\n');

    // 转换为 Base64URL 格式
    const encodedMail = btoa(unescape(encodeURIComponent(str)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // 3. 调用 Gmail API 发送
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ raw: encodedMail })
    });

    if (response.ok) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      const errorData = await response.json();
      return new Response(JSON.stringify({ success: false, error: errorData }), { status: 500 });
    }
  } catch (err) {
    return new Response(err.message, { status: 500 });
  }
}

// 通过 Refresh Token 交换 Access Token
async function getAccessToken() {
  const params = new URLSearchParams();
  params.append('client_id', CONFIG.clientId);
  params.append('client_secret', CONFIG.clientSecret);
  params.append('refresh_token', CONFIG.refreshToken);
  params.append('grant_type', 'refresh_token');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: params,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  const data = await res.json();
  if (!res.ok) throw new Error('无法刷新 Access Token: ' + JSON.stringify(data));
  return data.access_token;
}

// 监听 ESA 边缘函数请求
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});