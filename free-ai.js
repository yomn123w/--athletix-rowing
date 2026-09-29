export class FreeAI {
  constructor(){this.worker=null;this.pending=null;this.ocr=null;this.epoch=0;}
  cancel(){
    this.epoch++;this.worker?.terminate();this.worker=null;
    this.ocr?.terminate();this.ocr=null;
    this.pending?.reject(Error('요청을 중지했습니다. 다시 시도할 수 있습니다.'));this.pending=null;
  }
  generate(payload,onProgress,onToken){
    if(this.pending)return Promise.reject(Error('현재 요청이 끝난 뒤 다시 시도하세요.'));
    return new Promise((resolve,reject)=>{
      const id=crypto.randomUUID();
      this.pending={id,resolve,reject};
      try{
        if(!this.worker){
          this.worker=new Worker(new URL('./local-ai.worker.js',import.meta.url),{type:'module'});
          this.worker.onmessage=({data})=>{
            const p=this.pending;if(!p||p.id!==data.id)return;
            if(data.type==='progress')onProgress?.(data);
            if(data.type==='token')onToken?.(data.text);
            if(data.type==='result'){this.pending=null;p.resolve(data.result);}
            if(data.type==='error'){this.pending=null;p.reject(Error(friendlyError(data.message)));}
          };
          this.worker.onerror=()=>{const p=this.pending;this.pending=null;this.worker?.terminate();this.worker=null;p?.reject(Error('기기 AI를 불러오지 못했습니다. 인터넷 연결을 확인하고 Safari/Chrome을 최신 버전으로 업데이트해 주세요. 기록 계산과 무료 사진 인식은 별도로 사용할 수 있습니다.'));};
        }
        this.worker.postMessage({...payload,id});
      }catch(error){this.pending=null;reject(Error(friendlyError(error.message)));}
    });
  }
  async recognize(image,onProgress){
    const epoch=this.epoch;
    // Tesseract's neural image model runs in its own worker; no image upload.
    if(!window.Tesseract)throw Error('사진 인식 도구를 불러오지 못했습니다. 인터넷 연결 후 새로고침해 주세요.');
    const worker=await window.Tesseract.createWorker('eng',1,{
      logger:p=>onProgress?.({message:p.status==='recognizing text'?'사진 글자 인식 중':'사진 인식 모델 준비 중',progress:(p.progress||0)*100}),
      workerPath:'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/worker.min.js',
      corePath:'https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0',
      langPath:'https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng@1.0.0/4.0.0_best_int'
    });
    if(epoch!==this.epoch){await worker.terminate();throw Error('사진 인식을 중지했습니다.');}
    this.ocr=worker;
    try{const {data}=await worker.recognize(image);return {text:data.text,confidence:data.confidence};}
    finally{if(this.ocr===worker){await worker.terminate();this.ocr=null;}}
  }
}
function friendlyError(message=''){
  if(/out of memory|memory access|allocation|Array buffer/i.test(message))return '기기의 메모리가 부족합니다. 다른 탭을 닫고 다시 시도하세요. 다운로드 없는 기록 계산과 작은 사진 인식 모델은 계속 사용할 수 있습니다.';
  if(/fetch|network|404|403|download/i.test(message))return '무료 모델을 내려받지 못했습니다. 인터넷 연결을 확인하고 다시 시도하세요. 유료 API로 전환하지 않습니다.';
  return message||'기기 AI 처리에 실패했습니다. 다시 시도해 주세요.';
}
