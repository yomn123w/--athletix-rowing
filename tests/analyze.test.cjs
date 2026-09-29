const {test}=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const handler=require('../api/analyze.js');
const originalFetch=global.fetch;
test('HTTP POST, context, image and API failure handling',async()=>{
 const server=http.createServer(async(req,res)=>{let text='';for await(const chunk of req)text+=chunk;req.body=text;res.status=n=>{res.statusCode=n;return res};res.json=x=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(x));};await handler(req,res);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port;
 const context={profile:{name:'TEST'},pbs:{erg2000:{seconds:397}},recent7Days:[{distance:2000}],recent28Days:[{distance:5000}],checkins:[{sleep:8,condition:7}],competitions:[{date:'2026-10-20'}],goals:'6:35'};
 const post=async(body)=>{const response=await originalFetch(url,{method:'POST',body:JSON.stringify(body)});return {status:response.status,...await response.json()};};
 try{
  delete process.env.OPENAI_API_KEY;
  assert.equal((await post({mode:'chat',question:'페이스?',context})).code,'KEY_MISSING');
  process.env.OPENAI_API_KEY='test-placeholder';
  process.env.OPENAI_API_KEY='test\nplaceholder';assert.equal((await post({mode:'week',context})).code,'KEY_FORMAT');
  process.env.OPENAI_API_KEY='  test-placeholder\n';
  let captured;
  global.fetch=async(url,options)=>{assert.equal(url,'https://api.openai.com/v1/responses');assert.equal(options.headers.Authorization,'Bearer test-placeholder');captured=JSON.parse(options.body);return new Response(JSON.stringify({id:'mock_response_id',model:'gpt-4o-mini',output:[{content:[{type:'output_text',text:'MOCK ONLY'}]}]}),{status:200});};
  for(const mode of ['chat','week','photo']){
   const r=await post({mode,question:'나만의 질문',context,image:mode==='photo'?'data:image/jpeg;base64,YQ==':null});
   assert.equal(r.status,200);assert.equal(r.provider,'openai');
   const content=captured.input.at(-1).content;
   for(const key of Object.keys(context))assert.ok(content[0].text.includes(key));
   if(mode==='chat')assert.ok(content[0].text.includes('나만의 질문'));
   if(mode==='photo')assert.equal(content[1].type,'input_image');
  }
  for(const [status,code,expected] of [[401,'invalid_api_key','INVALID_KEY'],[429,'insufficient_quota','QUOTA'],[429,'rate_limit','RATE_LIMIT'],[500,'server_error','UPSTREAM'],[403,'access','ACCESS']]){global.fetch=async()=>new Response(JSON.stringify({error:{code}}),{status});assert.equal((await post({mode:'week',context})).code,expected);}
  global.fetch=async()=>new Response(JSON.stringify({output:[]}),{status:200});assert.equal((await post({mode:'week',context})).code,'EMPTY');
  global.fetch=async()=>new Response('bad gateway',{status:502});assert.equal((await post({mode:'week',context})).code,'UPSTREAM_FORMAT');
  global.fetch=async()=>{throw Error('network');};assert.equal((await post({mode:'week',context})).code,'NETWORK');
  assert.equal((await post({mode:'photo',context,image:'bad'})).code,'IMAGE');
  assert.equal((await post({mode:'chat',context,question:''})).code,'INPUT');
 }finally{delete process.env.OPENAI_API_KEY;global.fetch=originalFetch;await new Promise(r=>server.close(r));}
});
