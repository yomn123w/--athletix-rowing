import { pipeline, env, TextStreamer, AutoProcessor, AutoModelForVision2Seq, RawImage } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0/dist/transformers.web.js';
import { TEXT_MODEL, VISION_MODEL, buildMessages } from './local-analysis.js';

env.allowLocalModels=false;
env.useBrowserCache=true;
env.backends.onnx.wasm.numThreads=1;
let generator,processor,vision;
const send=(id,type,data={})=>self.postMessage({id,type,...data});
const progress=id=>p=>{
  if(p.status==='progress')send(id,'progress',{message:`모델 다운로드 · ${p.file}`,progress:p.progress,loaded:p.loaded,total:p.total});
  else if(p.status==='initiate')send(id,'progress',{message:'무료 모델 준비 · '+p.file});
};
async function textGeneration(payload) {
  const {id}=payload;
  if(!generator){send(id,'progress',{message:'채팅 모델 준비 중 · 첫 사용 약 520MB 다운로드'});generator=await pipeline('text-generation',TEXT_MODEL,{device:'wasm',dtype:'q8',progress_callback:progress(id)});}
  const messages=buildMessages(payload);
  const inputs=generator.tokenizer.apply_chat_template(messages,{tokenize:true,add_generation_prompt:true,return_dict:true});
  if(inputs.input_ids.dims.at(-1)>6144)throw Error('선수 데이터와 대화가 이 기기의 AI 처리 범위를 넘었습니다. 새 대화를 시작하거나 기록 계산을 이용해 주세요. 데이터는 임의로 생략하지 않았습니다.');
  send(id,'progress',{message:'기기에서 답변 생성 중 · 잠시 기다려 주세요'});
  let partial='';
  const streamer=new TextStreamer(generator.tokenizer,{skip_prompt:true,callback_function:token=>{partial+=token;send(id,'token',{text:partial});}});
  const output=await generator(messages,{max_new_tokens:220,do_sample:false,repetition_penalty:1.08,streamer});
  const analysis=output[0]?.generated_text?.at(-1)?.content;
  if(!analysis?.trim())throw Error('기기 AI가 답변을 만들지 못했습니다. 다시 시도해 주세요.');
  return {analysis,provider:'local',model:TEXT_MODEL,responseId:crypto.randomUUID(),mode:payload.mode};
}
async function visionGeneration(payload) {
  const {id,image}=payload;
  // Free memory before loading a different model on mobile devices.
  if(generator){await generator.dispose();generator=null;}
  if(!processor)processor=await AutoProcessor.from_pretrained(VISION_MODEL,{progress_callback:progress(id)});
  if(!vision){send(id,'progress',{message:'사진 AI 준비 중 · 첫 사용 약 190MB 다운로드'});vision=await AutoModelForVision2Seq.from_pretrained(VISION_MODEL,{device:'wasm',dtype:{embed_tokens:'q8',vision_encoder:'q4',decoder_model_merged:'q4'},progress_callback:progress(id)});}
  const raw=await RawImage.read(image);
  const prompt=processor.apply_chat_template([{role:'user',content:[{type:'image'},{type:'text',text:'Read this rowing monitor. Transcribe only visible distance, time, pace per 500m, strokes per minute and watts. Do not guess. Answer briefly.'}]}],{add_generation_prompt:true});
  const inputs=await processor(prompt,[raw]);
  send(id,'progress',{message:'실제 이미지 픽셀을 사진 모델로 읽는 중'});
  const outputs=await vision.generate({...inputs,max_new_tokens:100,do_sample:false});
  const analysis=processor.batch_decode(outputs.slice(null,[inputs.input_ids.dims.at(-1),null]),{skip_special_tokens:true})[0];
  if(!analysis?.trim())throw Error('사진 AI가 응답을 만들지 못했습니다. 무료 문자인식을 이용해 주세요.');
  return {analysis,provider:'local-vision',model:VISION_MODEL,responseId:crypto.randomUUID(),mode:'photo'};
}
self.onmessage=async({data})=>{
  try{
    if(data.mode!=='photo'&&vision){await vision.dispose();vision=null;processor=null;}
    const result=data.mode==='photo'?await visionGeneration(data):await textGeneration(data);
    send(data.id,'result',{result});
  }catch(error){send(data.id,'error',{message:error.message});}
};
