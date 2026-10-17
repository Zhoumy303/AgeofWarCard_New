const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('C:/Users/Dr.m/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
  const output=__dirname;
  const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const page=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const checks=[];
  for(const [screen,file] of [['menu','01-main-menu.png'],['hero','02-choose-hero.png'],['deploy','03-battle-deploy.png'],['battle','04-battle-attack.png'],['adventure','05-adventure.png'],['notes','06-design-notes.png']]){
    await page.goto(pathToFileURL(path.join(output,'design-preview.html')).href+'?screen='+screen+'&export=1');
    await page.evaluate(async()=>{await document.fonts.ready;await Promise.all(Array.from(document.images).map(img=>img.decode().catch(()=>{})));});
    const state=await page.evaluate(()=>{
      const stage=document.getElementById('stage').getBoundingClientRect();
      return {
        missingImages:Array.from(document.images).filter(img=>img.src&&!img.complete||img.src&&img.naturalWidth===0).map(img=>img.src),
        tiles:document.querySelectorAll('.tile').length,
        baseCount:document.querySelectorAll('.base').length,
        deployCells:document.querySelectorAll('.deploy-space').length,
        handCards:document.querySelectorAll('.hand-card').length,
        eventCards:document.querySelectorAll('.event-card').length,
        sheetFooter:document.querySelector('.sheet-footer')?.getBoundingClientRect().top,
        lastAbilityBottom:document.querySelector('.selection-state')?.getBoundingClientRect().bottom,
        offCanvas:Array.from(document.querySelectorAll('.hand-card,.major,.tactical-sheet,.event-card,.hero-selector,.board-frame')).filter(el=>{const b=el.getBoundingClientRect();return b.left<stage.left||b.right>stage.right+1||b.top<stage.top||b.bottom>stage.bottom+1;}).map(el=>el.className)
      };
    });
    await page.screenshot({path:path.join(output,file)});
    checks.push({screen,file,...state});
  }
  fs.writeFileSync(path.join(output,'render-checks.json'),JSON.stringify({errors,checks},null,2));
  await browser.close();
  console.log(JSON.stringify({errors,checks},null,2));
  if(errors.length||checks.some(s=>s.missingImages.length||s.offCanvas.length))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});

