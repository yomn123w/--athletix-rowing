// Vercel Node function. Keep OPENAI_API_KEY in Vercel environment variables.
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'POST 요청만 가능합니다.'});
 if(!process.env.OPENAI_API_KEY)return res.status(503).json({error:'AI 분석 설정이 필요합니다. Vercel 환경 변수 OPENAI_API_KEY를 등록해 주세요.'});
 const {mode,workouts,checkins,image}=req.body||{};
 let content;
 if(mode==='week'){
  if(!Array.isArray(workouts)||!workouts.length||workouts.length>100||!Array.isArray(checkins)||JSON.stringify({workouts,checkins}).length>24000)return res.status(400).json({error:'주간 기록 형식을 확인해 주세요.'});
  content=[{type:'text',text:'최근 7일 훈련 및 체크인 데이터: '+JSON.stringify({workouts,checkins})+'\n훈련 횟수, 강도, 회복 지표를 요약하고 구체적인 다음 주 조언 2~3개를 한국어로 짧게 작성하세요. 기록에 없는 건강 진단이나 사실을 추정하지 마세요.'}];
 }else if(mode==='photo'){
  if(typeof image!=='string'||image.length>6_000_000||!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(image))return res.status(400).json({error:'4MB 이하 JPG, PNG, WebP 사진이 필요합니다.'});
  content=[{type:'text',text:'Concept2 PM 에르고 모니터 사진을 읽으세요. 보이는 거리(m), 시간, 평균 500m 페이스, 피치(spm), 구간 기록을 한국어로 정리하세요. 보이지 않거나 불확실한 수치는 추측하지 말고 확인 필요라고 명시하세요. 마지막에 기록의 간단한 해석을 덧붙이세요.'},{type:'image_url',image_url:{url:image}}];
 }else return res.status(400).json({error:'분석 종류를 확인해 주세요.'});
 try{
  const response=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+process.env.OPENAI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-4o-mini',messages:[{role:'system',content:'당신은 조정 훈련 기록 분석 도우미입니다. 한국어로 정확하고 간결하게 답하세요. 사진의 숫자를 지어내지 마세요.'},{role:'user',content}],max_tokens:700})});
  const data=await response.json();if(!response.ok)return res.status(502).json({error:'AI 서비스 오류: '+(data.error?.message||response.status)});
  return res.status(200).json({analysis:data.choices?.[0]?.message?.content||'분석 결과를 받지 못했습니다.'});
 }catch{return res.status(502).json({error:'AI 서비스에 연결하지 못했습니다.'})}
};
