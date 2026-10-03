export const yandexMetrikaId = 110822437;

// The local preview must not add visits or recordings to the real counter.
export const yandexMetrikaScript = `
(function () {
  if (['localhost', '127.0.0.1', '[::1]', '::1', 'terminal.local'].includes(location.hostname)) return;
  window.dataLayer = window.dataLayer || [];
  (function(m,e,t,r,i,k,a){
    m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
    m[i].l=1*new Date();
    for (var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
    k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a);
  })(window,document,'script','https://mc.yandex.ru/metrika/tag.js?id=${yandexMetrikaId}','ym');
  ym(${yandexMetrikaId},'init',{
    ssr:true,
    webvisor:true,
    trackHash:true,
    clickmap:true,
    ecommerce:'dataLayer',
    referrer:document.referrer,
    url:location.href,
    accurateTrackBounce:true,
    trackLinks:true
  });
})();
`;
