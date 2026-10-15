if(!window.hirizzDesktop&&'serviceWorker' in navigator&&['http:','https:'].includes(location.protocol))window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
if(window.hirizzDesktop){document.querySelectorAll('.profile small').forEach(el=>el.textContent='Saved on this device');}
