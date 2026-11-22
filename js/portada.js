(() => {
  'use strict';
  const enlace = document.getElementById('entrar');
  if (!enlace) return;
  const DURACION_FUNDIDO = 750; 
  const reducirMovimiento = matchMedia('(prefers-reduced-motion: reduce)').matches;
  enlace.addEventListener('click', (evento) => {
    if (evento.button !== 0 || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;
    if (reducirMovimiento) return;
    evento.preventDefault();
    document.body.classList.add('saliendo');
    setTimeout(() => window.location.assign(enlace.href), DURACION_FUNDIDO);
  });
  window.addEventListener('pageshow', (evento) => {
    if (evento.persisted) document.body.classList.remove('saliendo');
  });
  setTimeout(() => document.body.classList.add('boton-visible'), 4000);
})();
