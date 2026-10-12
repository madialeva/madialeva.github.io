// Texto 3D "vagalume" con reflejo, basado en el ejemplo webgl_geometry_text de three.js.
// Es un script clásico (no un módulo) que usa el global THREE de js/3rd/three.min.js
// y la fuente de fonts/optimer-bold/: así la página funciona también abriendo el
// fichero con doble clic (file://), donde el navegador bloquea módulos y fetch locales.
(() => {
  'use strict';
  const { FontLoader, TextGeometry } = THREE;

  const TEXTO = 'vagalume';

  // Parámetros de la geometría del texto
  const PROFUNDIDAD = 20;
  const TAMANO = 70;
  const ELEVACION = 30;
  const SEGMENTOS_CURVA = 4;
  const GROSOR_BISEL = 2;
  const TAMANO_BISEL = 1.5;

  // Posición base de la cámara y mitad del ancho que debe quedar siempre visible
  const POSICION_CAMARA = new THREE.Vector3(0, 400, 700);
  const OBJETIVO_CAMARA = new THREE.Vector3(0, 150, 0);
  const MEDIO_ANCHO_VISIBLE = 280;
  const FOV = 30;

  const contenedor = document.getElementById('escena');

  const camara = new THREE.PerspectiveCamera(FOV, window.innerWidth / window.innerHeight, 1, 4000);

  const escena = new THREE.Scene();
  escena.background = new THREE.Color(0x000000);
  escena.fog = new THREE.Fog(0x000000, 250, 1400);

  const luzDireccional = new THREE.DirectionalLight(0xffffff, 0.4);
  luzDireccional.position.set(0, 0, 1).normalize();
  escena.add(luzDireccional);

  const luzPuntual = new THREE.PointLight(0xffffff, 4.5, 0, 0);
  luzPuntual.color.setHSL(Math.random(), 1, 0.5);
  luzPuntual.position.set(0, 100, 90);
  escena.add(luzPuntual);

  const materiales = [
    new THREE.MeshPhongMaterial({ color: 0xffffff, flatShading: true }), // cara frontal
    new THREE.MeshPhongMaterial({ color: 0xffffff }), // laterales
  ];

  const grupo = new THREE.Group();
  grupo.position.y = 100;
  escena.add(grupo);

  // Plano semitransparente que hace de "espejo" sobre el texto invertido
  const plano = new THREE.Mesh(
    new THREE.PlaneGeometry(10000, 10000),
    new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.5, transparent: true }),
  );
  plano.position.y = 100;
  plano.rotation.x = -Math.PI / 2;
  escena.add(plano);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(renderizar);
  contenedor.appendChild(renderer.domElement);

  crearTexto(new FontLoader().parse(window.FUENTE_OPTIMER_BOLD));

  function crearTexto(fuente) {
    const geometria = new TextGeometry(TEXTO, {
      font: fuente,
      size: TAMANO,
      depth: PROFUNDIDAD,
      curveSegments: SEGMENTOS_CURVA,
      bevelThickness: GROSOR_BISEL,
      bevelSize: TAMANO_BISEL,
      bevelEnabled: true,
    });
    geometria.computeBoundingBox();
    const desplazamiento = -0.5 * (geometria.boundingBox.max.x - geometria.boundingBox.min.x);

    const texto = new THREE.Mesh(geometria, materiales);
    texto.position.set(desplazamiento, ELEVACION, 0);
    grupo.add(texto);

    const reflejo = new THREE.Mesh(geometria, materiales);
    reflejo.position.set(desplazamiento, -ELEVACION, PROFUNDIDAD);
    reflejo.rotation.x = Math.PI;
    grupo.add(reflejo);
  }

  // Aleja la cámara en pantallas estrechas para que la palabra quepa entera
  function ajustarCamara() {
    const aspecto = window.innerWidth / window.innerHeight;
    const distanciaMinima = MEDIO_ANCHO_VISIBLE / (Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * aspecto);
    const factor = Math.max(1, distanciaMinima / POSICION_CAMARA.length());

    camara.aspect = aspecto;
    camara.position.copy(POSICION_CAMARA).multiplyScalar(factor);
    camara.updateProjectionMatrix();

    const extra = (factor - 1) * POSICION_CAMARA.length();
    escena.fog.near = 250 + extra;
    escena.fog.far = 1400 + extra;
  }

  ajustarCamara();

  window.addEventListener('resize', () => {
    ajustarCamara();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Rotación arrastrando con el ratón o el dedo
  let rotacionObjetivo = 0;
  let rotacionAlPulsar = 0;
  let punteroXAlPulsar = 0;
  let haArrastrado = false;

  contenedor.style.touchAction = 'none';
  contenedor.addEventListener('pointerdown', alPulsar);

  function alPulsar(evento) {
    if (evento.isPrimary === false) return;
    punteroXAlPulsar = evento.clientX;
    rotacionAlPulsar = rotacionObjetivo;
    haArrastrado = false;
    document.addEventListener('pointermove', alMover);
    document.addEventListener('pointerup', alSoltar);
  }

  function alMover(evento) {
    if (evento.isPrimary === false) return;
    const dx = evento.clientX - punteroXAlPulsar;
    if (Math.abs(dx) > 3) haArrastrado = true;
    rotacionObjetivo = rotacionAlPulsar + dx * 0.02;
  }

  function alSoltar(evento) {
    if (evento.isPrimary === false) return;
    document.removeEventListener('pointermove', alMover);
    document.removeEventListener('pointerup', alSoltar);
    // Un toque sin arrastrar cambia el color de la luz
    if (!haArrastrado) luzPuntual.color.setHSL(Math.random(), 1, 0.5);
  }

  function renderizar() {
    grupo.rotation.y += (rotacionObjetivo - grupo.rotation.y) * 0.05;
    camara.lookAt(OBJETIVO_CAMARA);
    renderer.render(escena, camara);
  }
})();
