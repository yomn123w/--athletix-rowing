// Free mode is enforced on the server too. Old keys cannot incur AI charges.
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({code:'METHOD',error:'POST 요청만 지원합니다.'});
  }
  return res.status(403).json({
    code:'PAID_DISABLED',
    error:'유료 AI 호출은 차단되어 있습니다. 앱의 무료 기기 AI·주간 계산·사진 인식을 이용해 주세요.'
  });
};
