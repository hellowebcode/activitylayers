(function(){
  var root=document.documentElement;
  var key=document.querySelector('[data-help]')?'help':(document.querySelector('[data-legal]')?'legal':null);
  if(!key) return;
  var secSel='[data-'+key+']', btnSel='[data-'+key+'-lang]';
  var titles={de:root.getAttribute('data-title-de')||document.title,
              en:root.getAttribute('data-title-en')||document.title};
  var back={de:'Zurück zum Tool', en:'Back to the tool'};
  function apply(lang){
    lang=(lang==='en')?'en':'de';
    root.lang=lang;
    document.title=titles[lang];
    var b=document.querySelector('[data-back]');
    if(b) b.textContent=back[lang];
    document.querySelectorAll(secSel).forEach(function(s){
      s.hidden=(s.getAttribute('data-'+key)!==lang);
    });
    document.querySelectorAll(btnSel).forEach(function(x){
      var on=x.getAttribute('data-'+key+'-lang')===lang;
      x.classList.toggle('active',on);
      x.setAttribute('aria-pressed',on?'true':'false');
    });
    try{ localStorage.setItem('overlayUILanguage',lang); }catch(e){}
  }
  document.querySelectorAll(btnSel).forEach(function(x){
    x.addEventListener('click',function(){ apply(x.getAttribute('data-'+key+'-lang')); });
  });
  var saved='en';
  try{ saved=localStorage.getItem('overlayUILanguage')||'en'; }catch(e){}
  apply(saved);
})();
