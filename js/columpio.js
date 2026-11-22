(() => {
  'use strict';
  const contenedor = document.getElementById('escena');
  if (!contenedor || !window.THREE || !window.SILUETA_MADIALEVA) return;
  const { MathUtils } = THREE;
  const SUELO = -1.6;                 
  const NIVEL_NUBES = -700;           
  const ANCHO_PALABRA = 2.3;          
  const GROSOR_PALABRA = 0.17;
  const RADIO_CUERDA = 0.021;
  const LARGO_PENDULO = 7.5;          
  const AMPLITUD = MathUtils.degToRad(30);
  const LENTITUD = 1.1;               
  const GRAVEDAD = 9.81;
  const SOL = { elevacion: 2.6, azimut: -66 }; 
  const esMovil = matchMedia('(pointer: coarse)').matches;
  const reducirMovimiento = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: false, stencil: false, powerPreference: 'high-performance' });
  } catch (error) {
    console.warn('Sin WebGL: se muestra la portada estática.', error);
    document.body.classList.add('sin-webgl');
    return;
  }
  let relacionPixeles = Math.min(window.devicePixelRatio || 1, esMovil ? 1.75 : 2);
  renderer.setPixelRatio(relacionPixeles);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.6;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  contenedor.appendChild(renderer.domElement);
  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.2, 400);
  camara.rotation.order = 'YXZ';
  const camaraLejos = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 100, 60000);
  camaraLejos.layers.set(1);
  const lejano = (objeto) => {
    objeto.layers.set(1);
    return objeto;
  };
  function crearAzar(semilla) {
    let a = semilla >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const perlin = new THREE.ImprovedNoise();
  function fbm(x, y, z, octavas = 4) {
    let suma = 0, amplitud = 0.5, frecuencia = 1;
    for (let i = 0; i < octavas; i++) {
      suma += amplitud * perlin.noise(x * frecuencia + 0.31, y * frecuencia + 0.17, z * frecuencia + 0.73);
      frecuencia *= 2.03;
      amplitud *= 0.5;
    }
    return suma;
  }
  function crestas(x, y, z, octavas = 3) {
    let suma = 0, amplitud = 0.5, frecuencia = 1;
    for (let i = 0; i < octavas; i++) {
      const n = 1 - Math.abs(perlin.noise(x * frecuencia + 0.31, y * frecuencia + 0.17, z * frecuencia + 0.73));
      suma += amplitud * n * n;
      frecuencia *= 2.1;
      amplitud *= 0.5;
    }
    return suma;
  }
  const lineal = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);
  const progresion = (n, potencia) => Array.from({ length: n + 1 }, (_, i) => (i / n) ** potencia);
  const GLSL_RUIDO = `
    float azar13(vec3 p) {
      p = fract(p * 0.1031);
      p += dot(p, p.zyx + 31.32);
      return fract((p.x + p.y) * p.z);
    }
    float ruido3(vec3 x) {
      vec3 i = floor(x);
      vec3 f = fract(x);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(azar13(i), azar13(i + vec3(1.0, 0.0, 0.0)), f.x),
                     mix(azar13(i + vec3(0.0, 1.0, 0.0)), azar13(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
                 mix(mix(azar13(i + vec3(0.0, 0.0, 1.0)), azar13(i + vec3(1.0, 0.0, 1.0)), f.x),
                     mix(azar13(i + vec3(0.0, 1.0, 1.0)), azar13(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);
    }
  `;
  const direccionSol = new THREE.Vector3();
  {
    const azimut = MathUtils.degToRad(SOL.azimut);
    const elevacion = MathUtils.degToRad(SOL.elevacion);
    direccionSol.set(-Math.sin(azimut) * Math.cos(elevacion), Math.sin(elevacion), -Math.cos(azimut) * Math.cos(elevacion));
  }
  function configurarCielo(cielo, escala) {
    const u = cielo.material.uniforms;
    u.turbidity.value = 8.5;
    u.rayleigh.value = 3.1;
    u.mieCoefficient.value = 0.0055;
    u.mieDirectionalG.value = 0.86;
    u.sunPosition.value.copy(direccionSol);
    cielo.scale.setScalar(escala);
    cielo.frustumCulled = false;
    return cielo;
  }
  escena.add(lejano(configurarCielo(new THREE.Sky(), 1000)));
  const cieloDifuso = new THREE.Sky();
  cieloDifuso.material.fragmentShader = cieloDifuso.material.fragmentShader
    .replace('L0 += ( vSunE * 19000.0 * Fex ) * sundisk;', '');
  const escenaCielo = new THREE.Scene();
  escenaCielo.add(configurarCielo(cieloDifuso, 10));
  const pmrem = new THREE.PMREMGenerator(renderer);
  escena.environment = pmrem.fromScene(escenaCielo, 0, 0.1, 100).texture;
  escena.environmentIntensity = 0.75;
  pmrem.dispose();
  const cuboCalima = new THREE.WebGLCubeRenderTarget(64, { type: THREE.HalfFloatType });
  new THREE.CubeCamera(0.1, 100, cuboCalima).update(renderer, escenaCielo);
  const colorSol = lineal(1.0, 0.76, 0.52);
  const luzSol = new THREE.DirectionalLight(colorSol, 4.2);
  luzSol.castShadow = true;
  luzSol.shadow.mapSize.setScalar(esMovil ? 1024 : 2048);
  Object.assign(luzSol.shadow.camera, { left: -1.8, right: 1.8, top: 1.8, bottom: -1.8, near: 1, far: 40 });
  luzSol.shadow.camera.updateProjectionMatrix();
  luzSol.shadow.bias = -0.0005;
  luzSol.shadow.normalBias = 0.012;
  escena.add(luzSol, luzSol.target);
  const luzSolLejos = lejano(new THREE.DirectionalLight(colorSol, luzSol.intensity));
  luzSolLejos.position.copy(direccionSol).multiplyScalar(1000);
  luzSolLejos.castShadow = true;
  luzSolLejos.shadow.mapSize.setScalar(2048);
  luzSolLejos.shadow.autoUpdate = false;
  luzSolLejos.shadow.needsUpdate = true;
  luzSolLejos.shadow.camera.layers.set(1);
  luzSolLejos.shadow.bias = -0.0003;
  luzSolLejos.shadow.normalBias = 2.5;
  escena.add(luzSolLejos, luzSolLejos.target);
  function encuadrarSombra(luz, caja) {
    const centro = caja.getCenter(new THREE.Vector3());
    luz.target.position.copy(centro);
    luz.position.copy(centro).addScaledVector(direccionSol, 6000);
    const camaraSombra = luz.shadow.camera;
    camaraSombra.position.copy(luz.position);
    camaraSombra.lookAt(centro);
    camaraSombra.updateMatrixWorld();
    const minimo = new THREE.Vector3(Infinity, Infinity, Infinity), maximo = minimo.clone().negate();
    const esquina = new THREE.Vector3();
    for (let i = 0; i < 8; i++) {
      esquina.set(i & 1 ? caja.max.x : caja.min.x, i & 2 ? caja.max.y : caja.min.y, i & 4 ? caja.max.z : caja.min.z);
      esquina.applyMatrix4(camaraSombra.matrixWorldInverse);
      minimo.min(esquina);
      maximo.max(esquina);
    }
    Object.assign(camaraSombra, { left: minimo.x, right: maximo.x, bottom: minimo.y, top: maximo.y, near: -maximo.z - 50, far: -minimo.z + 50 });
    camaraSombra.updateProjectionMatrix();
  }
  const luzRelleno = new THREE.SpotLight(lineal(1.0, 0.86, 0.74), 190, 0, MathUtils.degToRad(17), 0.6, 2);
  const uniformesAtmosfera = {
    uSolDir: { value: direccionSol },
    uSolColor: { value: colorSol.clone().multiplyScalar(luzSol.intensity) },
    uCieloCalima: { value: cuboCalima.texture },
    uNiebla: { value: new THREE.Vector4(0.03, 0.022, 0.00006, NIVEL_NUBES) },
    uColorBruma: { value: lineal(0.93, 0.8, 0.76) },
  };
  const GLSL_ATMOSFERA = `
    uniform vec3 uSolDir;
    uniform vec3 uSolColor;
    uniform samplerCube uCieloCalima;
    uniform vec4 uNiebla;
    uniform vec3 uColorBruma;
    vec3 atmosfera(vec3 color, vec3 pos, float factorBruma) {
      vec3 rayo = pos - cameraPosition;
      float d = length(rayo);
      vec3 rd = rayo / max(d, 1e-4);
      // Bruma: densidad exponencial que crece al bajar hacia las nubes (integral analítica)
      float b = uNiebla.y;
      float k = b * rd.y;
      float densidadCamara = uNiebla.x * exp(-b * (cameraPosition.y - uNiebla.w));
      float tauBruma = abs(k) > 1e-6
        ? densidadCamara * (1.0 - exp(min(-k * d, 60.0))) / k
        : densidadCamara * d;
      tauBruma *= factorBruma;
      float tauCalima = uNiebla.z * d;
      float tau = max(tauBruma + tauCalima, 1e-6);
      vec3 colorCalima = textureCube(uCieloCalima, normalize(vec3(rd.x, abs(rd.y) * 0.15 + 0.04, rd.z))).rgb;
      vec3 dispersion = (tauBruma * uColorBruma + tauCalima * colorCalima) / tau;
      return mix(dispersion, color, exp(-tau));
    }
  `;
  function conAtmosfera(material, clave, extra = {}) {
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniformesAtmosfera, extra.uniformes);
      shader.vertexShader = 'varying vec3 vPosAtm;\n' + (extra.declaracionesVertex ?? '') + shader.vertexShader.replace(
        '#include <fog_vertex>',
        `#include <fog_vertex>
        vec4 posAtm = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          posAtm = instanceMatrix * posAtm;
        #endif
        vPosAtm = (modelMatrix * posAtm).xyz;
        ${extra.vertex ?? ''}`,
      );
      let fragment = 'varying vec3 vPosAtm;\n' + GLSL_ATMOSFERA + GLSL_RUIDO + (extra.declaracionesFragment ?? '') + shader.fragmentShader;
      fragment = fragment.replace('#include <fog_fragment>',
        `#include <fog_fragment>
        gl_FragColor.rgb = atmosfera(gl_FragColor.rgb, vPosAtm, 1.0);`);
      shader.fragmentShader = extra.fragment ? extra.fragment(fragment) : fragment;
    };
    material.customProgramCacheKey = () => clave;
    return material;
  }
  const tiempoEscena = { value: 0 };   
  function crearTexturaNubes(tam = 256) {
    const datos = new Uint8Array(tam * tam * 4);
    const celdas = 8, celdasBurbujas = 10;
    const rejilla = Float32Array.from({ length: celdas * celdas }, crearAzar(11));
    const azar = crearAzar(31);
    const burbujas = Array.from({ length: celdasBurbujas * celdasBurbujas }, () => ({
      x: azar(), y: azar(), radio: 0.55 + 0.5 * azar(), alto: 0.5 + 0.5 * azar(),
    }));
    const suave = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    const modulo = (a, n) => ((a % n) + n) % n;
    for (let y = 0; y < tam; y++) {
      for (let x = 0; x < tam; x++) {
        const i = (y * tam + x) * 4;
        const fx = (x / tam) * celdas, fy = (y / tam) * celdas;
        const ix = Math.floor(fx), iy = Math.floor(fy);
        const tx = suave(fx - ix), ty = suave(fy - iy);
        const v = (a, b) => rejilla[modulo(b, celdas) * celdas + modulo(a, celdas)];
        const arriba = v(ix, iy) + (v(ix + 1, iy) - v(ix, iy)) * tx;
        const abajo = v(ix, iy + 1) + (v(ix + 1, iy + 1) - v(ix, iy + 1)) * tx;
        datos[i] = Math.round((arriba + (abajo - arriba) * ty) * 255);
        const cx = (x / tam) * celdasBurbujas, cy = (y / tam) * celdasBurbujas;
        const jx = Math.floor(cx), jy = Math.floor(cy);
        let maximo = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const b = burbujas[modulo(jy + dy, celdasBurbujas) * celdasBurbujas + modulo(jx + dx, celdasBurbujas)];
            const ex = jx + dx + b.x - cx, ey = jy + dy + b.y - cy;
            const d2 = (ex * ex + ey * ey) / (b.radio * b.radio);
            if (d2 < 1) {
              const altura = b.alto * (1 - d2);
              const h = Math.max(0.22 - Math.abs(altura - maximo), 0) / 0.22;
              maximo = Math.max(altura, maximo) + h * h * 0.055;
            }
          }
        }
        datos[i + 1] = Math.round(maximo * 255);
        datos[i + 3] = 255;
      }
    }
    const textura = new THREE.DataTexture(datos, tam, tam);
    textura.wrapS = textura.wrapT = THREE.RepeatWrapping;
    textura.minFilter = THREE.LinearMipmapLinearFilter;
    textura.magFilter = THREE.LinearFilter;
    textura.generateMipmaps = true;
    textura.needsUpdate = true;
    return textura;
  }
  const texturaNubes = crearTexturaNubes();
  const RADIO_NUBES = 40000;
  const VIENTO = { x: -7, y: 3.5 };     
  const uniformesNubes = {
    uNubes: { value: texturaNubes },
    uTiempo: tiempoEscena,
    uColorCielo: { value: lineal(0.55, 0.6, 0.76) },
    uColorSombra: { value: lineal(0.44, 0.41, 0.55) },
    uColorHueco: { value: lineal(0.24, 0.25, 0.35) },
  };
  const GLSL_NUBES = `
    uniform sampler2D uNubes;
    uniform float uTiempo;
    uniform vec3 uColorCielo;
    uniform vec3 uColorSombra;
    uniform vec3 uColorHueco;
    const float NUBES_ESCALA = 4200.0;   // metros por repetición de la textura
    const float NUBES_ALTURA = 170.0;    // altura de las burbujas más grandes
    const float NUBES_RADIO = ${RADIO_NUBES.toFixed(1)};  // a partir de la mitad, el mar se funde con el cielo
    const vec2 VIENTO = vec2(${VIENTO.x.toFixed(2)}, ${VIENTO.y.toFixed(2)});  // m/s en el plano (x, z)
    // Altura de la superficie de las nubes (metros sobre su nivel) en el punto p del plano
    // El viento arrastra el conjunto, y cada escala de detalle deriva a su aire: así los cúmulos
    // cambian de forma mientras avanzan, en vez de deslizarse como una alfombra
    float alturaNubes(vec2 p) {
      vec2 q = (p - VIENTO * uTiempo) / NUBES_ESCALA;
      float cobertura = texture2D(uNubes, q * 0.29 + 0.27 + uTiempo * vec2(0.00004, -0.00003)).r * 0.6
                      + texture2D(uNubes, q * 0.83).r * 0.4;
      float h = 0.0;
      float a = 1.0;
      mat2 giro = mat2(0.8, -0.6, 0.6, 0.8);
      const vec2 DERIVA[4] = vec2[4](vec2(0.0), vec2(-0.00081, 0.00074), vec2(0.00019, -0.00219), vec2(0.00201, 0.00262));
      for (int i = 0; i < 4; i++) {
        h += a * texture2D(uNubes, q + uTiempo * DERIVA[i]).g;
        q = giro * q * 2.07 + vec2(0.37, 0.11);
        a *= 0.5;
      }
      return NUBES_ALTURA * h * smoothstep(0.25, 0.6, cobertura);
    }
    // Color de la superficie de las nubes en p, vista en la dirección rd (sin la atmósfera)
    vec3 colorNubes(vec2 p, vec3 rd) {
      float h = alturaNubes(p);
      float e = 10.0;
      vec3 n = normalize(vec3(h - alturaNubes(p + vec2(e, 0.0)), e, h - alturaNubes(p + vec2(0.0, e))));
      // Autosombra: ¿tapa la nube el camino hacia el sol?
      vec2 haciaSol = normalize(uSolDir.xz);
      float subida = uSolDir.y / length(uSolDir.xz);
      float luz = 1.0;
      for (int i = 1; i <= 3; i++) {
        float s = float(i * i) * 26.0;
        luz *= clamp(1.0 - (alturaNubes(p + haciaSol * s) - h - s * subida) / 45.0, 0.0, 1.0);
      }
      float masa = clamp(h / NUBES_ALTURA, 0.0, 1.0);
      float difusa = clamp(dot(n, uSolDir) * 0.7 + 0.3, 0.0, 1.0) * mix(0.2, 1.0, luz);
      vec3 color = uSolColor * 0.4 * difusa;
      color += mix(uColorSombra, uColorCielo, n.y * 0.5 + 0.5) * 0.5;
      // Contraluz: los bordes finos brillan cuando se mira hacia el sol
      float haciaElSol = max(dot(rd, uSolDir), 0.0);
      color += uSolColor * (0.3 * pow(haciaElSol, 4.0) * (1.0 - masa) + 0.06 * pow(1.0 - max(dot(-rd, n), 0.0), 3.0));
      color = mix(uColorHueco, color, smoothstep(0.0, 0.1, masa));
      // Esponjosidad: variación fina de brillo, solo de cerca (de lejos se promedia sola)
      color *= 0.93 + 0.12 * texture2D(uNubes, (p - VIENTO * uTiempo) / NUBES_ESCALA * 23.0).r;
      color += uSolColor * 0.12 * pow(haciaElSol, 10.0);
      return color;
    }
    float opacidadNubes(vec2 p) {
      return 1.0 - smoothstep(NUBES_RADIO * 0.45, NUBES_RADIO * 0.97, length(p - cameraPosition.xz));
    }
    // Color medio de una niebla iluminada como las nubes, sin su textura de cúmulos
    vec3 colorNiebla() {
      return uSolColor * 0.2 + mix(uColorSombra, uColorCielo, 0.75) * 0.5;
    }
  `;
  const bordeCabo = (x) => -2.6 + 0.04 * x * x + 0.3 * fbm(x * 0.2 + 3.1, 0.5, 0.2, 3) + 0.06 * fbm(x * 1.4, 1.7, 0.4, 2);
  const radioFilo = (x) => 0.4 + 0.22 * fbm(x * 0.6, 4.2, 1.1, 3);
  const FONDO_MESETA = 5.5;
  const limiteHierbaEn = (x) => 0.03 + 0.16 * Math.max(0, fbm(x * 1.3, 2.2, 0.7, 3) + 0.25);
  function normalBorde(x) {
    const pendiente = (bordeCabo(x + 0.01) - bordeCabo(x - 0.01)) / 0.02;
    const largo = Math.sqrt(pendiente * pendiente + 1);
    return [pendiente / largo, -1 / largo];
  }
  const alturaMeseta = (px, pz, adentro) =>
    SUELO + 0.07 * fbm(px * 0.7, 3.3, pz * 0.7, 3) + 0.025 * fbm(px * 2.6, 1.1, pz * 2.6, 2) - 0.012 * adentro
    - 0.07 * (1 - MathUtils.smoothstep(adentro, 0.3, 1.4));
  const GLSL_RUIDO_GRADIENTE = `
    vec3 azar33(vec3 p) {
      p = fract(p * vec3(0.1031, 0.1030, 0.0973));
      p += dot(p, p.yxz + 33.33);
      return fract((p.xxy + p.yxx) * p.zyx) * 2.0 - 1.0;
    }
    float ruidoG(vec3 p) {
      vec3 i = floor(p);
      vec3 f = fract(p);
      vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
      return mix(mix(mix(dot(azar33(i), f), dot(azar33(i + vec3(1.0, 0.0, 0.0)), f - vec3(1.0, 0.0, 0.0)), u.x),
                     mix(dot(azar33(i + vec3(0.0, 1.0, 0.0)), f - vec3(0.0, 1.0, 0.0)), dot(azar33(i + vec3(1.0, 1.0, 0.0)), f - vec3(1.0, 1.0, 0.0)), u.x), u.y),
                 mix(mix(dot(azar33(i + vec3(0.0, 0.0, 1.0)), f - vec3(0.0, 0.0, 1.0)), dot(azar33(i + vec3(1.0, 0.0, 1.0)), f - vec3(1.0, 0.0, 1.0)), u.x),
                     mix(dot(azar33(i + vec3(0.0, 1.0, 1.0)), f - vec3(0.0, 1.0, 1.0)), dot(azar33(i + vec3(1.0, 1.0, 1.0)), f - vec3(1.0, 1.0, 1.0)), u.x), u.y), u.z);
    }
  `;
  const materialCabo = conAtmosfera(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.86 }), 'cabo', {
    declaracionesVertex: 'attribute float aTierra;\nvarying float vTierra;\n',
    vertex: 'vTierra = aTierra;',
    declaracionesFragment: 'varying float vTierra;\n' + GLSL_RUIDO_GRADIENTE + `
      float relieveRoca(vec3 p) {
        return ruidoG(p * 1.7) * 0.9 + ruidoG(p * 4.0) * 0.5 + ruidoG(p * 11.0) * 0.25 + ruidoG(p * 29.0) * 0.12;
      }
    `,
    fragment: (f) => f
      .replace('#include <color_fragment>', `#include <color_fragment>
        // Granito: fondo gris rosado con cristales oscuros (biotita) y claros (cuarzo) que se ven
        // de cerca; de lejos se funden en su tono medio para que no centelleen
        vec3 pr = vPosAtm;
        float huella = length(fwidth(pr));
        float mancha = clamp(ruidoG(pr * 0.7) * 0.7 + 0.5, 0.0, 1.0);
        vec3 roca = mix(vec3(0.4, 0.36, 0.33), vec3(0.66, 0.6, 0.54), mancha);
        roca *= mix(vec3(1.0), vec3(1.08, 0.97, 0.93), smoothstep(-0.2, 0.4, ruidoG(pr * 1.9 + 4.0)));
        roca *= 0.88 + 0.24 * ruidoG(pr * 3.3);
        float cristales = clamp(1.3 - huella * 90.0, 0.0, 1.0);
        // La intemperie tapa los cristales a rodales: costra oscura, polvo y tierra en los huecos
        float intemperie = smoothstep(-0.15, 0.35, ruidoG(pr * 2.1 + 11.0) + 0.5 * ruidoG(pr * 7.3));
        cristales *= 1.0 - 0.75 * intemperie;
        roca = mix(roca, vec3(0.08, 0.075, 0.07), smoothstep(0.22, 0.34, ruidoG(pr * 190.0)) * 0.6 * cristales);
        roca = mix(roca, vec3(0.8, 0.79, 0.76), smoothstep(0.34, 0.44, ruidoG(pr * 110.0 + 9.0)) * 0.5 * cristales);
        roca *= 1.0 + 0.18 * ruidoG(pr * 45.0) * cristales;
        roca = mix(roca, roca * vec3(0.62, 0.58, 0.52), intemperie * 0.7);
        float grieta = 1.0 - smoothstep(0.0, 0.016 + huella * 2.0, abs(ruidoG(pr * vec3(1.2, 0.45, 1.2))));
        roca = mix(roca, vec3(0.06, 0.05, 0.045), grieta * 0.85);
        float liquen = smoothstep(0.22, 0.3, ruidoG(pr * 2.4 + 7.0));
        roca = mix(roca, vec3(0.62, 0.6, 0.44), liquen * 0.55);
        float liquenNaranja = smoothstep(0.3, 0.36, ruidoG(pr * 4.1 + 19.0));
        roca = mix(roca, vec3(0.72, 0.36, 0.1), liquenNaranja * 0.5);
        vec3 tierra = mix(vec3(0.1, 0.085, 0.045), vec3(0.17, 0.17, 0.07), clamp(mancha, 0.0, 1.0));
        diffuseColor.rgb *= mix(roca, tierra, vTierra);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor - grieta * 0.2 + vTierra * 0.1, 0.0, 1.0);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        // Microrrelieve, solo de cerca: relieve del ruido con derivadas de pantalla (una sola
        // evaluación por píxel; a esta distancia cada detalle ocupa varios píxeles)
        float cercania = 1.0 - smoothstep(4.0, 40.0, length(vPosAtm - cameraPosition));
        if (cercania > 0.0) {
          float hRoca = relieveRoca(vPosAtm) * 0.022 * cercania * (1.0 - 0.6 * vTierra);
          vec3 sp = -vViewPosition;
          vec3 dpx = dFdx(sp), dpy = dFdy(sp);
          vec3 r1 = cross(dpy, normal), r2 = cross(normal, dpx);
          float det = dot(dpx, r1);
          vec3 grad = sign(det) * (dFdx(hRoca) * r1 + dFdy(hRoca) * r2);
          normal = normalize(abs(det) * normal - grad);
        }`),
  });
  function crearCabo() {
    const xs = [0];
    for (let paso = 0.035, x = 0; x < 16; paso *= 1.012) { x += paso; xs.push(x); xs.unshift(-x); }
    const perfil = [];
    progresion(60, 1.9).reverse().forEach((t) => perfil.push({ tipo: 'meseta', t }));            
    for (let i = 1; i <= 10; i++) perfil.push({ tipo: 'filo', t: i / 10 });
    progresion(56, 2.6).slice(1).forEach((t) => perfil.push({ tipo: 'pared', t }));            
    const nC = xs.length, nF = perfil.length;
    const posiciones = new Float32Array(nC * nF * 3);
    const tierra = new Float32Array(nC * nF);
    for (let c = 0; c < nC; c++) {
      const x = xs[c];
      const z = bordeCabo(x);
      const [nx, nz] = normalBorde(x);
      const filo = radioFilo(x);
      const limiteHierba = limiteHierbaEn(x);
      for (let f = 0; f < nF; f++) {
        const { tipo, t } = perfil[f];
        let d, y = 0;
        if (tipo === 'meseta') {
          d = -filo - t * FONDO_MESETA;
        } else if (tipo === 'filo') {
          const a = t * Math.PI / 2;
          d = -filo + filo * Math.sin(a);
          y = -filo + filo * Math.cos(a);
        } else {
          const bajada = t * 46;
          y = -filo - bajada;
          d = 0.1 * bajada + 1.6 * fbm(x * 0.15, y * 0.05, 2.3, 3) * Math.min(1, bajada / 6);
        }
        let px = x + nx * d, pz = z + nz * d, py;
        if (tipo === 'meseta') {
          const suelo = MathUtils.smoothstep(-d, limiteHierba - 0.15, limiteHierba + 0.25);
          py = alturaMeseta(px, pz, -d) + 0.05 * bloques(px / 0.7, pz / 0.7, 23) * (1 - suelo);
          tierra[c * nF + f] = suelo;
        } else {
          py = SUELO + y;
          const rugosidad = 0.04 + 0.13 * bloques(x / 0.45, py / 0.55, 21) + 0.035 * fbm(px * 4, py * 4, pz * 4, 2);
          px += nx * rugosidad;
          pz += nz * rugosidad;
        }
        posiciones.set([px, py, pz], (c * nF + f) * 3);
      }
    }
    const indices = [];
    for (let c = 0; c < nC - 1; c++) {
      for (let f = 0; f < nF - 1; f++) {
        const a = c * nF + f, b = a + nF;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    const geometria = new THREE.BufferGeometry();
    geometria.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
    geometria.setAttribute('aTierra', new THREE.BufferAttribute(tierra, 1));
    geometria.setIndex(indices);
    geometria.computeVertexNormals();
    const cabo = new THREE.Mesh(geometria, materialCabo);
    cabo.receiveShadow = true;
    escena.add(cabo);
  }
  const materialHierba = conAtmosfera(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75, side: THREE.DoubleSide }), 'hierba', {
    uniformes: { uTiempo: tiempoEscena },
    declaracionesVertex: 'attribute float aAltura;\nvarying float vAltura;\nuniform float uTiempo;\n',
    declaracionesFragment: 'varying float vAltura;\n',
    fragment: (f) => f
      .replace('#include <color_fragment>', `#include <color_fragment>
        diffuseColor.rgb *= mix(0.3, 1.0, vAltura);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        // Contraluz: el sol atraviesa las briznas
        float haciaSol = max(dot(normalize(vPosAtm - cameraPosition), uSolDir), 0.0);
        totalEmissiveRadiance += uSolColor * diffuseColor.rgb * 0.5 * (0.15 + pow(haciaSol, 3.0)) * vAltura;`),
  });
  {
    const anterior = materialHierba.onBeforeCompile;
    materialHierba.onBeforeCompile = (shader) => {
      anterior(shader);
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        vAltura = aAltura;
        vec3 origenHoja = vec3(instanceMatrix[3]);
        float fase = uTiempo * 1.7 + origenHoja.x * 1.9 + origenHoja.z * 1.3;
        float rafaga = sin(fase) * 0.6 + sin(fase * 2.3 + 1.7) * 0.3 + sin(uTiempo * 0.37 + origenHoja.x * 0.2) * 0.5;
        transformed.x += rafaga * 0.16 * aAltura * aAltura;
        transformed.z += rafaga * 0.06 * aAltura * aAltura;`);
    };
  }
  function crearHierba() {
    const segmentos = 4;
    const posiciones = [], alturas = [], indices = [];
    for (let i = 0; i <= segmentos; i++) {
      const t = i / segmentos;
      const medioAncho = 0.5 * (0.14 + 0.86 * (1 - t) ** 0.8);
      const curva = 0.28 * t * t;
      posiciones.push(-medioAncho, t, curva, medioAncho, t, curva);
      alturas.push(t, t);
    }
    for (let i = 0; i < segmentos; i++) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const hoja = new THREE.BufferGeometry();
    hoja.setAttribute('position', new THREE.Float32BufferAttribute(posiciones, 3));
    hoja.setAttribute('aAltura', new THREE.Float32BufferAttribute(alturas, 1));
    hoja.setIndex(indices);
    hoja.computeVertexNormals();
    const normales = hoja.attributes.normal;
    for (let i = 0; i < normales.count; i++) {
      const n = new THREE.Vector3().fromBufferAttribute(normales, i).lerp(new THREE.Vector3(0, 1, 0), 0.45).normalize();
      normales.setXYZ(i, n.x, n.y, n.z);
    }
    const cantidad = esMovil ? 5000 : 8000;
    const hierba = new THREE.InstancedMesh(hoja, materialHierba, cantidad);
    const azar = crearAzar(4242);
    const matriz = new THREE.Matrix4(), giro = new THREE.Quaternion(), escala = new THREE.Vector3(), pos = new THREE.Vector3();
    const euler = new THREE.Euler();
    const verde = lineal(0.3, 0.38, 0.12), dorado = lineal(0.66, 0.55, 0.26), seco = lineal(0.5, 0.42, 0.28);
    const color = new THREE.Color();
    for (let i = 0; i < cantidad; i++) {
      const x = (azar() * 2 - 1) * 6;
      const [nx, nz] = normalBorde(x);
      const adentro = radioFilo(x) * 0.55 + limiteHierbaEn(x) + azar() ** 3.2 * 3;
      const px = x - nx * adentro, pz = bordeCabo(x) - nz * adentro;
      euler.set((azar() - 0.5) * 0.5, azar() * Math.PI * 2, (azar() - 0.5) * 0.5);
      giro.setFromEuler(euler);
      const alto = 0.1 + azar() ** 1.4 * 0.32;
      escala.set(0.006 + azar() * 0.01, alto, alto);
      matriz.compose(pos.set(px, alturaMeseta(px, pz, adentro) - 0.01, pz), giro, escala);
      hierba.setMatrixAt(i, matriz);
      color.copy(verde).lerp(dorado, azar() ** 0.8).lerp(seco, azar() * 0.3);
      hierba.setColorAt(i, color);
    }
    hierba.frustumCulled = false;
    escena.add(hierba);
  }
  const materialMacizo = conAtmosfera(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94 }), 'macizo', {
    uniformes: uniformesNubes,
    declaracionesVertex: 'attribute float aU;\nattribute float aPared;\nvarying float vU;\nvarying float vPared;\n',
    vertex: 'vU = aU;\n vPared = aPared;',
    declaracionesFragment: 'varying float vU;\nvarying float vPared;\n' + GLSL_NUBES + GLSL_RUIDO_GRADIENTE,
    fragment: (f) => f
      .replace('gl_FragColor.rgb = atmosfera(gl_FragColor.rgb, vPosAtm, 1.0);', `
        // Velos de niebla que se arrastran por las laderas, justo por encima del mar de nubes
        vec3 colorRoca = gl_FragColor.rgb;
        float sobreMar = vPosAtm.y - uNiebla.w;
        if (sobreMar < 420.0) {
          vec3 q = (vPosAtm - vec3(VIENTO.x, 0.0, VIENTO.y) * uTiempo) * vec3(0.0055, 0.016, 0.0055) + vec3(0.0, uTiempo * 0.004, 0.0);
          float velo = ruido3(q) * 0.6 + ruido3(q * 2.3 + 3.1) * 0.3 + ruido3(q * 5.3 + 7.7) * 0.1;
          float jiron = smoothstep(0.55, 0.82, velo) * smoothstep(40.0, 140.0, sobreMar) * (1.0 - smoothstep(200.0, 420.0, sobreMar)) * 0.55;
          colorRoca = mix(colorRoca, colorNiebla() * (0.9 + 0.25 * velo), jiron);
        }
        gl_FragColor.rgb = atmosfera(colorRoca, vPosAtm, 0.03);
        // La roca se funde con la niebla al acercarse a la cima de los cúmulos y, ya dentro, se
        // descarta: por el hueco se ve el mar de nubes que hay detrás. Como en ese borde la roca ya
        // tiene el color de la niebla, el corte no se nota y la montaña emerge de los cúmulos.
        if (sobreMar < NUBES_ALTURA * 1.9 + 90.0) {
          vec3 rd = normalize(vPosAtm - cameraPosition);
          float sobre = sobreMar - alturaNubes(vPosAtm.xz) - 26.0 * (ruido3(vPosAtm * 0.012) - 0.5);
          // (los últimos metros sobre el mar siempre se los traga la niebla: así nunca se ve la
          // intersección recta de la roca con el plano de las nubes, ni siquiera en los claros)
          float fundido = max(1.0 - smoothstep(-10.0, 80.0, sobre), 1.0 - smoothstep(4.0, 45.0, sobreMar));
          // Solo donde el mar es opaco: a lo lejos se funde con el cielo y el hueco lo dejaría ver
          fundido *= rd.y < -1e-4 ? opacidadNubes((cameraPosition + rd * ((uNiebla.w - cameraPosition.y) / rd.y)).xz) : 0.0;
          vec3 niebla = atmosfera(colorNiebla() * (0.94 + 0.12 * ruido3(vPosAtm * 0.05)), vPosAtm, 0.0);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, niebla, smoothstep(0.0, 0.9, fundido));
          if (fundido > 0.9) discard;
        }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        if (vPared > 0.5) {
          // Pared del macizo: chorreones oscuros del agua, finos y largos, y cicatrices más claras
          // donde se ha desprendido roca. Todo se funde cuando es más fino que el píxel.
          vec2 w = vec2(vU, vPosAtm.y);
          float huella = length(fwidth(w));
          float chorreon = smoothstep(0.6, 0.74, ruido3(vec3(w.x * 0.085, w.y * 0.0042, 5.0)))
                         * (0.55 + 0.45 * ruido3(vec3(w.x * 0.02, w.y * 0.01, 9.0)));
          diffuseColor.rgb *= mix(vec3(1.0), vec3(0.45, 0.43, 0.45), chorreon * 0.75);
          float cicatriz = smoothstep(0.68, 0.8, ruido3(vec3(w * vec2(0.03, 0.012), 2.0)));
          diffuseColor.rgb *= mix(vec3(1.0), vec3(1.16, 1.1, 1.04), cicatriz * 0.7);
          float granoFino = ruidoG(vPosAtm * 0.55) * clamp(1.5 - huella * 1.1, 0.0, 1.0)
                          + ruidoG(vPosAtm * 1.7) * 0.6 * clamp(1.5 - huella * 3.4, 0.0, 1.0);
          diffuseColor.rgb *= 1.0 + 0.16 * granoFino;
        } else {
          float grano = ruido3(vPosAtm * 0.35) * 0.5 + ruido3(vPosAtm * 1.3) * 0.3 + ruido3(vPosAtm * vec3(0.12, 0.012, 0.12)) * 0.5;
          diffuseColor.rgb *= 0.7 + 0.5 * grano;
        }`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          // Montañas lejanas: relieve de detalle con derivadas de pantalla, sin geometría. Cada octava
          // se apaga cuando es más fina que el píxel, para que no centellee. (En la gran pared no hace
          // falta: su estructura la dan los bloques de la geometría y sus sombras.)
          float huella = length(fwidth(vPosAtm));
          float hRoca = vPared > 0.5
            ? 0.0
            : ruido3(vPosAtm * vec3(0.05, 0.008, 0.05)) * 12.0 * clamp(1.6 - huella * 0.1, 0.0, 1.0)
              + ruido3(vPosAtm * vec3(0.16, 0.025, 0.16)) * 5.0 * clamp(1.6 - huella * 0.32, 0.0, 1.0)
              + ruido3(vPosAtm * vec3(0.5, 0.12, 0.5)) * 1.6 * clamp(1.6 - huella * 1.0, 0.0, 1.0);
          vec3 sp = -vViewPosition;
          vec3 dpx = dFdx(sp), dpy = dFdy(sp);
          vec3 r1 = cross(dpy, normal), r2 = cross(normal, dpx);
          float det = dot(dpx, r1);
          vec3 grad = sign(det) * (dFdx(hRoca) * r1 + dFdy(hRoca) * r2);
          normal = normalize(abs(det) * normal - grad * 0.8);
        }`),
  });
  function crearGeometriaArbol() {
    const copaBaja = new THREE.ConeGeometry(0.36, 0.62, 6, 1).translate(0, 0.42, 0);
    const copaAlta = new THREE.ConeGeometry(0.24, 0.5, 6, 1).translate(0, 0.78, 0);
    const tronco = new THREE.CylinderGeometry(0.04, 0.06, 0.2, 4).translate(0, 0.1, 0);
    return THREE.mergeGeometries([copaBaja.toNonIndexed(), copaAlta.toNonIndexed(), tronco.toNonIndexed()]);
  }
  const materialArbol = conAtmosfera(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }), 'arbol');
  const azarDeCelda = new Float64Array(5);
  function sortearCelda(x, y, semilla) {
    let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(semilla, 1442695041)) | 0;
    for (let k = 0; k < 5; k++) {
      h = Math.imul(h ^ (h >>> 15), 2246822519);
      h = Math.imul(h ^ (h >>> 13), 3266489917);
      h ^= h >>> 16;
      azarDeCelda[k] = (h >>> 0) / 4294967296;
    }
  }
  function bloques(x, y, semilla) {
    const ix = Math.floor(x), iy = Math.floor(y);
    let mejor = Infinity, valor = 0;
    for (let j = -1; j <= 1; j++) {
      for (let i = -1; i <= 1; i++) {
        sortearCelda(ix + i, iy + j, semilla);
        const dx = x - (ix + i + 0.1 + 0.8 * azarDeCelda[0]);
        const dy = y - (iy + j + 0.1 + 0.8 * azarDeCelda[1]);
        const d = dx * dx + dy * dy;
        if (d < mejor) {
          mejor = d;
          valor = azarDeCelda[2] + (azarDeCelda[3] - 0.5) * 0.5 * dx + (azarDeCelda[4] - 0.5) * 0.35 * dy;
        }
      }
    }
    return valor;
  }
  function crearMacizo(m, arboles) {
    const { cx, cz, radio: R, cima, desde, hasta, nAng, nAlt } = m;
    const base = NIVEL_NUBES - 120;
    const s = m.semilla * 37.7;
    const altoBorde = (ang) => cima + 0.07 * R * fbm(ang * 2.2 + s, s, 0.5, 4) + 14 * fbm(ang * 40 + s, 0.3, s, 3)
      - 9 * crestas(ang * 120, s, 0.7, 2);
    const radioBase = (ang, y) => {
      const px = Math.cos(ang) * R, pz = Math.sin(ang) * R;
      return R * (1 + 0.1 * fbm(px * 0.003 + s, y * 0.0015, pz * 0.003 - s, 3)) + 0.05 * (cima - y);
    };
    const radioEn = (ang, y) => {
      const u = ang * R;                                             
      let r = radioBase(ang, y);
      r += 20 * crestas(u * 0.0032 + s, y * 0.0011, s, 3);            
      r += 42 * bloques(u / 95, y / 270, m.semilla);
      r += 13 * bloques(u / 30, y / 75, m.semilla + 7);
      r += 4 * bloques(u / 10, y / 24, m.semilla + 13);
      sortearCelda(Math.floor((y + 16 * fbm(u * 0.004, 0.5, s, 2)) / 31), 0, m.semilla + 3);
      r += 3 * (azarDeCelda[0] - 0.5);                                  
      r += 1.0 * fbm(u * 0.13, y * 0.09, s, 2);                        
      return r;
    };
    const filas = [];
    [0.86, 0.93, 0.975].forEach((f) => filas.push({ meseta: f }));
    progresion(nAlt, 1.5).forEach((t) => filas.push({ y: t }));
    const nC = nAng + 1, nF = filas.length;
    const posiciones = new Float32Array(nC * nF * 3);
    const oclusion = new Float32Array(nC * nF);
    const enPared = new Float32Array(nC * nF);
    for (let c = 0; c < nC; c++) {
      const ang = desde + (hasta - desde) * (c / nAng);
      const borde = altoBorde(ang);
      for (let f = 0; f < nF; f++) {
        const fila = filas[f];
        let r, y, ao = 1;
        if (fila.meseta !== undefined) {
          y = borde + 6 * (1 - fila.meseta) + 4 * fbm(ang * 9 + s, fila.meseta * 5, 1.5, 2);
          r = radioEn(ang, borde) * fila.meseta;
        } else {
          y = borde - (borde - base) * fila.y;
          r = radioEn(ang, y);
          ao = MathUtils.clamp(0.55 + 0.006 * (r - radioBase(ang, y)), 0.43, 1.05);
        }
        posiciones.set([cx + Math.cos(ang) * r, y, cz + Math.sin(ang) * r], (c * nF + f) * 3);
        oclusion[c * nF + f] = ao;
        enPared[c * nF + f] = ang * R;
      }
    }
    const indices = [];
    for (let c = 0; c < nC - 1; c++) {
      for (let f = 0; f < nF - 1; f++) {
        const a = c * nF + f, b = a + nF;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    const geometria = new THREE.BufferGeometry();
    geometria.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
    geometria.setAttribute('aU', new THREE.BufferAttribute(enPared, 1));
    geometria.setAttribute('aPared', new THREE.BufferAttribute(new Float32Array(nC * nF).fill(1), 1));
    geometria.setIndex(indices);
    geometria.computeVertexNormals();
    colorearRoca(geometria, oclusion, 0, false);
    if (arboles) {
      const azar = crearAzar(m.semilla * 101 + 7);
      const cantidad = Math.round(Math.abs(hasta - desde) * R * 0.5);
      for (let n = 0; n < cantidad; n++) {
        const ang = desde + (hasta - desde) * azar();
        const f = 0.9 + 0.08 * azar();
        const r = radioEn(ang, altoBorde(ang)) * f;
        arboles.push({
          x: cx + Math.cos(ang) * r, y: altoBorde(ang) + 6 * (1 - f) - 1.5, z: cz + Math.sin(ang) * r,
          escala: 14 + azar() * 16, giro: azar() * Math.PI, tono: azar(),
        });
      }
    }
    return geometria;
  }
  function colorearRoca(geometria, oclusion, nieve, chorreones = true) {
    const posiciones = geometria.attributes.position.array;
    const normales = geometria.attributes.normal;
    const cantidad = normales.count;
    const colores = new Float32Array(cantidad * 3);
    const claro = lineal(0.66, 0.6, 0.53), oscuro = lineal(0.24, 0.22, 0.21), oxido = lineal(0.7, 0.5, 0.34);
    const verde = lineal(0.13, 0.18, 0.09), blanco = lineal(0.92, 0.93, 0.95);
    const c = new THREE.Color();
    for (let v = 0; v < cantidad; v++) {
      const x = posiciones[v * 3], y = posiciones[v * 3 + 1], z = posiciones[v * 3 + 2];
      const ny = normales.getY(v);
      const chorreon = chorreones ? MathUtils.smoothstep(perlin.noise(x * 0.045, y * 0.0025, z * 0.045), 0.05, 0.45) : 0;
      c.copy(claro).lerp(oxido, MathUtils.clamp(fbm(x * 0.006, y * 0.01, z * 0.006, 2) * 2, 0, 0.55));
      c.lerp(oscuro, chorreon * 0.75);
      if (nieve) {
        const cubierta = MathUtils.smoothstep(y + 120 * fbm(x * 0.002, 0.3, z * 0.002, 3), nieve - 60, nieve + 60)
          * MathUtils.smoothstep(ny, 0.35, 0.6);
        c.lerp(blanco, cubierta);
      } else {
        const plano = MathUtils.smoothstep(ny, 0.5, 0.82);
        c.lerp(verde, plano * MathUtils.clamp(0.8 + fbm(x * 0.05, y * 0.05, z * 0.05, 2), 0, 1));
      }
      if (oclusion) c.multiplyScalar(oclusion[v]);
      colores.set([c.r, c.g, c.b], v * 3);
    }
    geometria.setAttribute('color', new THREE.BufferAttribute(colores, 3));
  }
  function crearPico({ cx, cz, radio: R, altura, semilla, nieve, n = 80 }) {
    const posiciones = [], indices = [];
    const s = semilla * 11.3;
    for (let j = 0; j <= n; j++) {
      for (let i = 0; i <= n; i++) {
        const u = (i / n) * 2 - 1, v = (j / n) * 2 - 1;
        const x = cx + u * R, z = cz + v * R;
        const r = Math.sqrt(u * u + v * v) * (1 + 0.25 * fbm(u * 1.5 + s, v * 1.5, s, 3));
        const perfil = Math.max(0, 1 - r) ** 1.25;
        const h = altura * (perfil * (0.3 + 0.95 * crestas(x / R * 1.7 + s, s, z / R * 1.7, 5))
          + 0.16 * perfil ** 0.5 * crestas(x / R * 6.5 - s, s * 0.5, z / R * 6.5, 4));
        posiciones.push(x, NIVEL_NUBES - 180 + h, z);
      }
    }
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const a = j * (n + 1) + i, b = a + n + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    const geometria = new THREE.BufferGeometry();
    geometria.setAttribute('position', new THREE.Float32BufferAttribute(posiciones, 3));
    const vertices = posiciones.length / 3;
    geometria.setAttribute('aU', new THREE.BufferAttribute(new Float32Array(vertices), 1));
    geometria.setAttribute('aPared', new THREE.BufferAttribute(new Float32Array(vertices), 1));
    geometria.setIndex(indices);
    geometria.computeVertexNormals();
    colorearRoca(geometria, null, nieve);
    return geometria;
  }
  function crearPaisaje() {
    const geometrias = [];
    const arboles = [];
    const macizo = {
      cx: -1700, cz: -1700, radio: 1200, cima: 200, desde: -0.55, hasta: 1.75,
      nAng: esMovil ? 380 : 520, nAlt: esMovil ? 130 : 170, semilla: 1,
    };
    const pared = crearMacizo(macizo, arboles);
    pared.computeBoundingBox();
    encuadrarSombra(luzSolLejos, pared.boundingBox);
    geometrias.push(pared);
    [
      { cx: 2300, cz: -5400, radio: 1500, altura: 1250, semilla: 2, nieve: 260 },
      { cx: -1100, cz: -7800, radio: 2000, altura: 1350, semilla: 3, nieve: 330 },
      { cx: 5600, cz: -9800, radio: 2600, altura: 1700, semilla: 4, nieve: 420, n: 60 },
      { cx: -5600, cz: -12500, radio: 3000, altura: 2000, semilla: 5, nieve: 480, n: 56 },
      { cx: 700, cz: -15500, radio: 3600, altura: 2400, semilla: 6, nieve: 560, n: 56 },
    ].forEach((p) => geometrias.push(crearPico(p)));
    const roca = lejano(new THREE.Mesh(THREE.mergeGeometries(geometrias), materialMacizo));
    roca.castShadow = roca.receiveShadow = true;
    escena.add(roca);
    const bosque = new THREE.InstancedMesh(crearGeometriaArbol(), materialArbol, arboles.length);
    const matriz = new THREE.Matrix4(), giro = new THREE.Quaternion(), escala = new THREE.Vector3(), pos = new THREE.Vector3();
    const verdeOscuro = lineal(0.07, 0.11, 0.06), verdeClaro = lineal(0.16, 0.22, 0.1), tono = new THREE.Color();
    arboles.forEach((a, i) => {
      giro.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, a.giro);
      escala.set(a.escala * 0.75, a.escala, a.escala * 0.75);
      matriz.compose(pos.set(a.x, a.y, a.z), giro, escala);
      bosque.setMatrixAt(i, matriz);
      bosque.setColorAt(i, tono.copy(verdeOscuro).lerp(verdeClaro, a.tono));
    });
    escena.add(lejano(bosque));
    [{ distancia: 22000, altura: 1600, semilla: 3 }, { distancia: 32000, altura: 2400, semilla: 9 }].forEach((c) => {
      escena.add(lejano(new THREE.Mesh(crearCordillera(c), materialMacizo)));
    });
  }
  function crearCordillera({ distancia, altura, semilla }) {
    const nAng = 260, nRad = 22, ancho = distancia * 0.3;
    const posiciones = [], colores = [], indices = [];
    const roca = lineal(0.5, 0.48, 0.48);
    for (let j = 0; j <= nRad; j++) {
      const t = j / nRad;
      const r = distancia - ancho / 2 + ancho * t;
      for (let i = 0; i <= nAng; i++) {
        const ang = MathUtils.degToRad(-120 + 240 * (i / nAng));
        const x = Math.sin(ang) * r, z = -Math.cos(ang) * r;
        const perfil = Math.sin(t * Math.PI) ** 0.8;
        const h = altura * perfil * (0.25 + crestas(x * 0.00025 + semilla, semilla, z * 0.00025, 5) * 1.5);
        posiciones.push(x, NIVEL_NUBES - 200 + h, z);
        colores.push(roca.r, roca.g, roca.b);
      }
    }
    for (let j = 0; j < nRad; j++) {
      for (let i = 0; i < nAng; i++) {
        const a = j * (nAng + 1) + i, b = a + nAng + 1;
        indices.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
    const geometria = new THREE.BufferGeometry();
    geometria.setAttribute('position', new THREE.Float32BufferAttribute(posiciones, 3));
    geometria.setAttribute('color', new THREE.Float32BufferAttribute(colores, 3));
    geometria.setIndex(indices);
    geometria.computeVertexNormals();
    return geometria;
  }
  const materialNubes = new THREE.ShaderMaterial({
    uniforms: { ...uniformesAtmosfera, ...uniformesNubes },
    transparent: true,
    depthWrite: false,
    vertexShader: `
      varying vec3 vPosAtm;
      void main() {
        vec4 posMundo = modelMatrix * vec4(position, 1.0);
        vPosAtm = posMundo.xyz;
        gl_Position = projectionMatrix * viewMatrix * posMundo;
      }
    `,
    fragmentShader: `
      varying vec3 vPosAtm;
      ${GLSL_ATMOSFERA}
      ${GLSL_NUBES}
      void main() {
        vec3 color = atmosfera(colorNubes(vPosAtm.xz, normalize(vPosAtm - cameraPosition)), vPosAtm, 0.0);
        gl_FragColor = vec4(color, opacidadNubes(vPosAtm.xz));
      }
    `,
  });
  const nubes = new THREE.Mesh(new THREE.PlaneGeometry(RADIO_NUBES * 2, RADIO_NUBES * 2).rotateX(-Math.PI / 2), materialNubes);
  nubes.position.y = NIVEL_NUBES;
  escena.add(lejano(nubes));
  const ALTURA_CIRROS = 2600;
  const materialCirros = new THREE.ShaderMaterial({
    uniforms: {
      ...uniformesAtmosfera,
      uNubes: { value: texturaNubes },
      uTiempo: tiempoEscena,
      uColorOro: { value: lineal(1.0, 0.66, 0.38) },
      uColorRosa: { value: lineal(0.78, 0.58, 0.66) },
    },
    transparent: true,
    depthWrite: false,
    vertexShader: materialNubes.vertexShader,
    fragmentShader: `
      varying vec3 vPosAtm;
      uniform sampler2D uNubes;
      uniform float uTiempo;
      uniform vec3 uColorOro;
      uniform vec3 uColorRosa;
      ${GLSL_ATMOSFERA}
      float fbmCirros(vec2 q) {
        float v = 0.0;
        float a = 0.5;
        mat2 giro = mat2(0.94, -0.34, 0.34, 0.94);
        for (int i = 0; i < 5; i++) {
          v += a * texture2D(uNubes, q).r;
          q = giro * q * 2.13 + vec2(0.21, 0.47);
          a *= 0.5;
        }
        return v / 0.97;
      }
      void main() {
        vec2 p = vPosAtm.xz;
        vec2 q = vec2((p.x + 16.0 * uTiempo) * 0.00007, (p.y - 5.0 * uTiempo) * 0.00013);
        float d = fbmCirros(q + 0.5 * vec2(fbmCirros(q * 0.6 + 1.7), fbmCirros(q * 0.6 + 4.3)));
        float densidad = smoothstep(0.52, 0.82, d);
        vec3 rd = normalize(vPosAtm - cameraPosition);
        float haciaSol = max(dot(normalize(rd.xz), normalize(uSolDir.xz)), 0.0);
        vec3 color = mix(uColorRosa, uColorOro, haciaSol * haciaSol) * (0.55 + 0.9 * pow(haciaSol, 5.0));
        color *= 0.75 + 0.6 * smoothstep(0.5, 0.9, d);
        color = atmosfera(color, vPosAtm, 0.0);
        float distancia = length(p - cameraPosition.xz);
        float alfa = densidad * 0.85 * (1.0 - smoothstep(16000.0, 34000.0, distancia));
        gl_FragColor = vec4(color, alfa);
      }
    `,
  });
  const cirros = new THREE.Mesh(new THREE.PlaneGeometry(80000, 80000).rotateX(Math.PI / 2), materialCirros);
  cirros.position.y = ALTURA_CIRROS;
  escena.add(lejano(cirros));
  const silueta = window.SILUETA_MADIALEVA;
  const piezaPrincipal = silueta.piezas.reduce((a, b) => (b.exterior.length > a.exterior.length ? b : a));
  const escalaPalabra = ANCHO_PALABRA / (silueta.caja.maxX - silueta.caja.minX); 
  const ALTURA_REMATE = 500;  
  const X_CANCAMOS = [-1926, 1943]; 
  const ALTO_LAZO = 0.045;          
  const ENTRADA_CUERDA = 0.1;       
  const materialMadera = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0.5, clearcoat: 0.55, clearcoatRoughness: 0.22,
  });
  conAtmosfera(materialMadera, 'madera', {
    declaracionesVertex: 'varying vec3 vPosObjeto;\n',
    vertex: 'vPosObjeto = position;',
    declaracionesFragment: `
      varying vec3 vPosObjeto;
      vec3 madera(vec3 p, out float veta) {
        // Tronco con la médula por debajo de la tabla y el eje algo inclinado: anillos finos
        // (~1 cm) que la distorsión dobla en llamas y arcos, como en una tabla de roble aserrada
        vec3 q = vec3(p.x, p.y + p.x * 0.04, p.z) + vec3(0.0, 0.62, -0.02);
        float distorsion = ruido3(p * vec3(0.8, 5.0, 5.0)) * 6.0 + ruido3(p * vec3(2.5, 14.0, 14.0)) * 1.4;
        float r = length(q.yz) * 95.0 + distorsion;
        float anillo = fract(r);
        // Antialiasing procedural: si los anillos se apiñan en pantalla, se funden en su tono medio
        float nitidez = 1.0 - smoothstep(0.2, 0.65, fwidth(r));
        veta = smoothstep(0.62, 0.93, anillo) * (1.0 - smoothstep(0.94, 1.0, anillo)) * nitidez;
        float fibras = ruido3(p * vec3(4.0, 240.0, 240.0)) * 0.6 + ruido3(p * vec3(1.5, 70.0, 70.0)) * 0.4;
        float tono = ruido3(p * vec3(0.5, 9.0, 9.0)) * 0.6 + ruido3(p * vec3(0.2, 3.0, 3.0)) * 0.4;
        vec3 claro = mix(vec3(0.4, 0.21, 0.085), vec3(0.58, 0.33, 0.14), tono);
        vec3 c = mix(claro, claro * vec3(0.5, 0.45, 0.4), veta * 0.75 + 0.12 * nitidez * (1.0 - nitidez));
        c *= 0.88 + 0.14 * fibras;
        return c;
      }
    `,
    fragment: (f) => f
      .replace('#include <color_fragment>', `#include <color_fragment>
        float vetaMadera;
        diffuseColor.rgb *= madera(vPosObjeto, vetaMadera);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor + vetaMadera * 0.18, 0.0, 1.0);`),
  });
  function crearGeometriaPalabra() {
    const aPuntos = (plano) => {
      const puntos = [];
      for (let i = 0; i < plano.length; i += 2) puntos.push(new THREE.Vector2(plano[i], plano[i + 1]));
      return puntos;
    };
    const formas = silueta.piezas.map((pieza) => {
      const forma = new THREE.Shape(aPuntos(pieza.exterior));
      forma.holes = pieza.agujeros.map((a) => new THREE.Path(aPuntos(a)));
      return forma;
    });
    const grosor = GROSOR_PALABRA / escalaPalabra;
    const bisel = 24;
    const geometria = new THREE.ExtrudeGeometry(formas, {
      depth: grosor - 2 * bisel, bevelEnabled: true, bevelThickness: bisel, bevelSize: 15, bevelSegments: 5, curveSegments: 1,
    });
    geometria.translate(0, -ALTURA_REMATE, -(grosor - 2 * bisel) / 2);
    normalesConAristas(geometria, MathUtils.degToRad(40));
    geometria.scale(escalaPalabra, escalaPalabra, escalaPalabra);
    return geometria;
  }
  function normalesConAristas(geometria, angulo) {
    const pos = geometria.attributes.position.array;
    const vertices = pos.length / 3;
    const triangulos = vertices / 3;
    const normalCara = new Float32Array(triangulos * 3);
    const claves = new Float64Array(vertices);
    const grupos = new Map();
    const B = 131072;
    for (let t = 0; t < triangulos; t++) {
      const i = t * 9;
      const ux = pos[i + 6] - pos[i + 3], uy = pos[i + 7] - pos[i + 4], uz = pos[i + 8] - pos[i + 5];
      const vx = pos[i] - pos[i + 3], vy = pos[i + 1] - pos[i + 4], vz = pos[i + 2] - pos[i + 5];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const largo = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      normalCara[t * 3] = nx / largo;
      normalCara[t * 3 + 1] = ny / largo;
      normalCara[t * 3 + 2] = nz / largo;
      for (let k = 0; k < 3; k++) {
        const j = i + k * 3;
        const clave = (Math.round(pos[j] * 10) + 65536) + (Math.round(pos[j + 1] * 10) + 65536) * B
          + (Math.round(pos[j + 2] * 10) + 65536) * B * B;
        claves[t * 3 + k] = clave;
        const grupo = grupos.get(clave);
        if (grupo) grupo.push(t); else grupos.set(clave, [t]);
      }
    }
    const limite = Math.cos(angulo);
    const normales = new Float32Array(vertices * 3);
    for (let v = 0; v < vertices; v++) {
      const t = (v / 3) | 0;
      const ax = normalCara[t * 3], ay = normalCara[t * 3 + 1], az = normalCara[t * 3 + 2];
      let sx = 0, sy = 0, sz = 0;
      for (const u of grupos.get(claves[v])) {
        const bx = normalCara[u * 3], by = normalCara[u * 3 + 1], bz = normalCara[u * 3 + 2];
        if (ax * bx + ay * by + az * bz > limite) { sx += bx; sy += by; sz += bz; }
      }
      const largo = Math.sqrt(sx * sx + sy * sy + sz * sz) || 1;
      normales[v * 3] = sx / largo;
      normales[v * 3 + 1] = sy / largo;
      normales[v * 3 + 2] = sz / largo;
    }
    geometria.setAttribute('normal', new THREE.BufferAttribute(normales, 3));
  }
  function bordeSuperior(x, contorno, hasta = Infinity) {
    let maximo = -Infinity;
    for (let i = 0; i < contorno.length; i += 2) {
      const j = (i + 2) % contorno.length;
      const x1 = contorno[i], y1 = contorno[i + 1], x2 = contorno[j], y2 = contorno[j + 1];
      if ((x1 - x) * (x2 - x) > 0 || x1 === x2) continue;
      const y = y1 + ((y2 - y1) * (x - x1)) / (x2 - x1);
      if (y > maximo && y < hasta) maximo = y;
    }
    return maximo;
  }
  function crearTexturaFibras() {
    const lienzo = document.createElement('canvas');
    lienzo.width = lienzo.height = 128;
    const g = lienzo.getContext('2d');
    g.fillStyle = '#b39a74';
    g.fillRect(0, 0, 128, 128);
    const azar = crearAzar(77);
    for (let n = 0; n < 260; n++) {
      const y = azar() * 128, luz = 120 + azar() * 110;
      g.strokeStyle = `rgba(${luz | 0}, ${(luz * 0.86) | 0}, ${(luz * 0.64) | 0}, ${0.35 + azar() * 0.5})`;
      g.lineWidth = 0.5 + azar() * 1.6;
      for (const dy of [-128, 0, 128]) {
        g.beginPath();
        g.moveTo(-10, y + dy);
        g.lineTo(138, y + dy + 46);
        g.stroke();
      }
    }
    const textura = new THREE.CanvasTexture(lienzo);
    textura.colorSpace = THREE.SRGBColorSpace;
    textura.wrapS = textura.wrapT = THREE.RepeatWrapping;
    textura.anisotropy = 4;
    return textura;
  }
  const texturaFibras = crearTexturaFibras();
  const materialCuerda = conAtmosfera(new THREE.MeshPhysicalMaterial({
    color: 0xd8c3a0, map: texturaFibras, bumpMap: texturaFibras, bumpScale: 1.4, roughness: 0.92,
    sheen: 0.6, sheenRoughness: 0.75, sheenColor: lineal(1.0, 0.86, 0.66),
  }), 'cuerda');
  const materialLaton = conAtmosfera(new THREE.MeshStandardMaterial({
    color: lineal(0.86, 0.68, 0.38), metalness: 1, roughness: 0.32,
  }), 'laton');
  function crearGeometriaCuerda(longitud, radio = RADIO_CUERDA) {
    const radioCabo = radio * 0.52, radioHelice = radio * 0.5;
    const paso = radio * 7.5;                     
    const porVuelta = esMovil ? 9 : 12;
    const segmentos = Math.max(6, Math.ceil((longitud / paso) * porVuelta));
    const radiales = 7;
    const cabos = [];
    const radial = new THREE.Vector3(), tangente = new THREE.Vector3(), binormal = new THREE.Vector3(), n = new THREE.Vector3();
    for (let h = 0; h < 3; h++) {
      const posiciones = [], normales = [], uvs = [], indices = [];
      for (let i = 0; i <= segmentos; i++) {
        const y = -longitud * (i / segmentos);
        const fase = (-y / paso) * Math.PI * 2 + (h * Math.PI * 2) / 3;
        radial.set(Math.cos(fase), 0, Math.sin(fase));
        const giro = (Math.PI * 2 * radioHelice) / paso;
        tangente.set(-Math.sin(fase) * giro, -1, Math.cos(fase) * giro).normalize();
        binormal.crossVectors(tangente, radial).normalize();
        for (let j = 0; j <= radiales; j++) {
          const a = (j / radiales) * Math.PI * 2;
          n.copy(radial).multiplyScalar(Math.cos(a)).addScaledVector(binormal, Math.sin(a));
          posiciones.push(radial.x * radioHelice + n.x * radioCabo, y + n.y * radioCabo, radial.z * radioHelice + n.z * radioCabo);
          normales.push(n.x, n.y, n.z);
          uvs.push(-y / (radio * 9), j / radiales);
        }
      }
      for (let i = 0; i < segmentos; i++) {
        for (let j = 0; j < radiales; j++) {
          const a = i * (radiales + 1) + j, b = a + radiales + 1;
          indices.push(a, a + 1, b, b, a + 1, b + 1);
        }
      }
      const cabo = new THREE.BufferGeometry();
      cabo.setAttribute('position', new THREE.Float32BufferAttribute(posiciones, 3));
      cabo.setAttribute('normal', new THREE.Float32BufferAttribute(normales, 3));
      cabo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      cabo.setIndex(indices);
      cabos.push(cabo);
    }
    return THREE.mergeGeometries(cabos);
  }
  const marco = new THREE.Group();
  escena.add(marco);
  luzRelleno.position.set(0, 1.6, 6);
  marco.add(luzRelleno);
  escena.add(luzRelleno.target);
  const asiento = new THREE.Group();
  marco.add(asiento);
  const palabra = new THREE.Mesh(crearGeometriaPalabra(), materialMadera);
  palabra.castShadow = palabra.receiveShadow = true;
  asiento.add(palabra);
  {
    const punto = silueta.piezas.find((p) => p !== piezaPrincipal && p.agujeros.length === 0);
    if (punto) {
      let minX = Infinity, maxX = -Infinity, minY = Infinity;
      for (let i = 0; i < punto.exterior.length; i += 2) {
        minX = Math.min(minX, punto.exterior[i]);
        maxX = Math.max(maxX, punto.exterior[i]);
        minY = Math.min(minY, punto.exterior[i + 1]);
      }
      const xPasador = minX + (maxX - minX) * 0.42;
      const yAbajo = bordeSuperior(xPasador - 12, piezaPrincipal.exterior, minY);
      const largo = (minY - yAbajo + 60) * escalaPalabra;
      const pasador = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, largo, 8), materialLaton);
      pasador.position.set(xPasador * escalaPalabra, ((minY + yAbajo) / 2 - ALTURA_REMATE) * escalaPalabra, 0);
      pasador.rotation.z = 0.08;
      asiento.add(pasador);
    }
  }
  const enganches = X_CANCAMOS.map((xEm) => {
    const yRemate = bordeSuperior(xEm, piezaPrincipal.exterior);
    const base = new THREE.Vector3(xEm * escalaPalabra, (yRemate - ALTURA_REMATE) * escalaPalabra, 0);
    const herraje = new THREE.Group();
    herraje.position.copy(base);
    const arandela = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.004, 16), materialLaton);
    arandela.position.y = 0.002;
    const vastago = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.02, 8), materialLaton);
    vastago.position.y = 0.012;
    const ojo = new THREE.Mesh(new THREE.TorusGeometry(0.019, 0.0052, 8, 22), materialLaton);
    ojo.position.y = 0.022 + 0.019;
    ojo.rotation.y = Math.PI / 2;
    herraje.add(arandela, vastago, ojo);
    for (const pieza of herraje.children) pieza.castShadow = true;
    asiento.add(herraje);
    const lazo = new THREE.Group();
    lazo.position.copy(base).add(new THREE.Vector3(0, ALTO_LAZO, 0));
    const anilla = new THREE.Mesh(new THREE.TorusGeometry(0.032, RADIO_CUERDA * 0.62, 8, 26), materialCuerda);
    anilla.position.y = 0.028;
    const ligadura = new THREE.Mesh(new THREE.CylinderGeometry(RADIO_CUERDA * 1.25, RADIO_CUERDA * 1.25, 0.05, 12), materialCuerda);
    ligadura.position.y = 0.085;
    lazo.add(anilla, ligadura);
    for (const pieza of lazo.children) pieza.castShadow = true;
    asiento.add(lazo);
    const cuerda = new THREE.Mesh(new THREE.BufferGeometry(), materialCuerda);
    cuerda.castShadow = true;
    cuerda.frustumCulled = false;
    marco.add(cuerda);
    return { base, lazo, cuerda, anclaje: new THREE.Vector3(), local: new THREE.Vector3(), longitud: 1 };
  });
  const pendulo = { pivote: new THREE.Vector3(), omega: 1 };
  const encuadre = { posicion: new THREE.Vector3(), cabeceo: 0, guinada: 0 };
  function encuadrar() {
    const ancho = window.innerWidth, alto = window.innerHeight;
    const aspecto = ancho / alto;
    const t = MathUtils.smoothstep(aspecto, 0.55, 1.5);   
    const fovVertical = MathUtils.lerp(60, 42, t);
    const cabeceo = MathUtils.degToRad(MathUtils.lerp(-15, -11, t));
    const guinada = MathUtils.degToRad(MathUtils.lerp(4, 0, t));
    const tanV = Math.tan(MathUtils.degToRad(fovVertical / 2));
    const tanH = tanV * aspecto;
    const yFilo = MathUtils.lerp(-0.66, -0.78, t);
    const anguloFilo = -cabeceo - Math.atan(yFilo * tanV);
    encuadre.posicion.set(0, 0, bordeCabo(0) - SUELO / Math.tan(anguloFilo));
    encuadre.cabeceo = cabeceo;
    encuadre.guinada = guinada;
    marco.position.set(encuadre.posicion.x, 0, encuadre.posicion.z);
    marco.rotation.y = guinada;
    for (const c of [camara, camaraLejos]) {
      c.fov = fovVertical;
      c.aspect = aspecto;
      c.updateProjectionMatrix();
    }
    const fraccionCerca = MathUtils.lerp(0.8, 0.6, t);
    const acercamiento = LARGO_PENDULO * Math.sin(AMPLITUD);
    const distancia = acercamiento + ANCHO_PALABRA / 2 / (tanH * fraccionCerca);
    const rayo = (xn, yn) => {
      const d = new THREE.Vector3(xn * tanH, yn * tanV, -1);
      d.applyAxisAngle(new THREE.Vector3(1, 0, 0), cabeceo);
      return d;
    };
    const reposo = rayo(0, -0.08).normalize().multiplyScalar(distancia);
    pendulo.pivote.set(0, reposo.y + LARGO_PENDULO, reposo.z);
    marco.updateMatrixWorld(true);
    luzRelleno.target.position.copy(reposo);
    marco.localToWorld(luzRelleno.target.position);
    const longitudEfectiva = LARGO_PENDULO + 0.15;
    pendulo.omega = Math.sqrt(GRAVEDAD / longitudEfectiva) / (1 + AMPLITUD ** 2 / 16) / LENTITUD;
    const xCancamo = Math.abs(enganches[1].base.x);
    const xPalabraPantalla = xCancamo / (distancia * tanH);
    const xEntrada = Math.min(1.02, MathUtils.lerp(1.02, xPalabraPantalla * 1.5, t));
    enganches.forEach((e, i) => {
      const lado = i === 0 ? -1 : 1;
      const d = rayo(lado * xEntrada, 1.02);
      const entrada = d.multiplyScalar(reposo.z / d.z);
      const atado = e.base.clone().add(new THREE.Vector3(0, ALTO_LAZO, 0)).add(reposo);
      const subida = (pendulo.pivote.y - atado.y) / (entrada.y - atado.y);
      e.anclaje.copy(atado).addScaledVector(entrada.clone().sub(atado), subida);
      const direccion = e.anclaje.clone().sub(atado).normalize();
      e.lazo.quaternion.setFromUnitVectors(THREE.Object3D.DEFAULT_UP, direccion);
      e.local.copy(e.base).add(new THREE.Vector3(0, ALTO_LAZO, 0)).addScaledVector(direccion, ENTRADA_CUERDA);
      e.longitud = e.anclaje.distanceTo(e.local.clone().add(reposo));
      e.cuerda.geometry.dispose();
      e.cuerda.geometry = crearGeometriaCuerda(e.longitud);
    });
    renderer.setSize(ancho, alto);
    composer.setPixelRatio(relacionPixeles);
    composer.setSize(ancho, alto);
    acabado.uniforms.uResolucion.value.set(ancho * relacionPixeles, alto * relacionPixeles);
  }
  const conMsaa = !navigator.userAgent.includes('OculusBrowser');
  const destino = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: conMsaa ? 4 : 0 });
  destino.resolveDepthBuffer = false;  
  const composer = new THREE.EffectComposer(renderer, destino);
  composer.addPass({
    enabled: true, needsSwap: false, clear: false, renderToScreen: false,
    setSize() {},
    dispose() {},
    render(renderizador, escritura, lectura) {
      const limpiarSolo = renderizador.autoClear;
      renderizador.autoClear = false;
      renderizador.setRenderTarget(lectura);
      renderizador.clear();
      renderizador.render(escena, camaraLejos);
      renderizador.clearDepth();
      renderizador.render(escena, camara);
      renderizador.autoClear = limpiarSolo;
    },
  });
  composer.renderTarget2.samples = 0;
  const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(256, 256), 0.28, 0.6, 0.95);
  const tamanoBloom = bloom.setSize.bind(bloom);
  bloom.setSize = (ancho, alto) => tamanoBloom(Math.max(1, ancho >> 1), Math.max(1, alto >> 1));
  composer.addPass(bloom);
  composer.addPass(new THREE.OutputPass());
  const acabado = new THREE.ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTiempo: { value: 0 }, uResolucion: { value: new THREE.Vector2(1, 1) } },
    vertexShader: `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float uTiempo;
      uniform vec2 uResolucion;
      varying vec2 vUv;
      void main() {
        vec4 color = texture2D(tDiffuse, vUv);
        // Gradación: algo más de saturación y contraste, como un positivado fotográfico
        float luminancia = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
        color.rgb = mix(vec3(luminancia), color.rgb, 1.14);
        color.rgb = clamp((color.rgb - 0.5) * 1.07 + 0.5, 0.0, 1.0);
        vec2 d = vUv - 0.5;
        color.rgb *= mix(1.0, 0.72, smoothstep(0.3, 0.85, length(d * vec2(1.0, 0.9)) * 1.25));
        vec2 p = vUv * uResolucion + fract(uTiempo * 7.13) * vec2(97.0, 41.0);
        float grano = fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))) - 0.5;
        color.rgb += grano * 0.03;
        gl_FragColor = color;
      }
    `,
  });
  composer.addPass(acabado);
  crearCabo();
  crearHierba();
  crearPaisaje();
  encuadrar();
  window.addEventListener('resize', encuadrar);
  const paralaje = { x: 0, y: 0, objetivoX: 0, objetivoY: 0 };
  if (!esMovil && !reducirMovimiento) {
    window.addEventListener('pointermove', (evento) => {
      paralaje.objetivoX = (evento.clientX / window.innerWidth) * 2 - 1;
      paralaje.objetivoY = (evento.clientY / window.innerHeight) * 2 - 1;
    });
  }
  const reloj = new THREE.Clock();
  let tAnterior = 0;
  const amplitud = reducirMovimiento ? AMPLITUD * 0.25 : AMPLITUD;
  const vaiven = reducirMovimiento ? 0 : 1;
  const centroAsiento = new THREE.Vector3();
  const mundo = new THREE.Vector3();
  const direccion = new THREE.Vector3();
  const abajo = new THREE.Vector3(0, -1, 0);
  let primerFotograma = true;
  const rendimiento = { esperaHasta: Infinity, anterior: -1, intervalos: [], minimo: esMovil ? 0.9 : 0.7 };
  function vigilarRendimiento() {
    const ahora = performance.now();
    const salto = ahora - rendimiento.anterior;
    rendimiento.anterior = ahora;
    if (document.hidden || ahora < rendimiento.esperaHasta || salto > 250) return;
    rendimiento.intervalos.push(salto);
    const muestras = rendimiento.intervalos;
    if (muestras.length < 30 || muestras.reduce((a, b) => a + b, 0) < 750) return;
    const mediana = rendimiento.intervalos.sort((a, b) => a - b)[rendimiento.intervalos.length >> 1];
    rendimiento.intervalos.length = 0;
    if (mediana > 20 && relacionPixeles > rendimiento.minimo) {
      relacionPixeles = Math.max(rendimiento.minimo, relacionPixeles * 0.85);
      renderer.setPixelRatio(relacionPixeles);
      encuadrar();
      rendimiento.esperaHasta = ahora + 1000;
    } else if (mediana > 26 && bloom.enabled) {
      bloom.enabled = false;  
    }
  }
  function fotograma() {
    const t = reloj.getElapsedTime();
    const dt = MathUtils.clamp(t - tAnterior, 0, 0.1);
    tAnterior = t;
    vigilarRendimiento();
    const suavizado = 1 - Math.exp(-dt * 1.8);
    paralaje.x += (paralaje.objetivoX - paralaje.x) * suavizado;
    paralaje.y += (paralaje.objetivoY - paralaje.y) * suavizado;
    const lateral = 0.012 * Math.sin(t * 0.23) * vaiven + 0.16 * paralaje.x;
    camara.position.copy(encuadre.posicion);
    camara.position.x += lateral * Math.cos(encuadre.guinada);
    camara.position.z -= lateral * Math.sin(encuadre.guinada);
    camara.position.y += 0.008 * Math.sin(t * 0.31 + 1.0) * vaiven - 0.06 * paralaje.y;
    camara.rotation.set(encuadre.cabeceo + 0.0012 * Math.sin(t * 0.27) * vaiven, encuadre.guinada + 0.0015 * Math.sin(t * 0.19) * vaiven, 0);
    camaraLejos.position.copy(camara.position);
    camaraLejos.quaternion.copy(camara.quaternion);
    const angulo = amplitud * Math.sin(pendulo.omega * t - Math.PI / 2);
    centroAsiento.set(0, -Math.cos(angulo), Math.sin(angulo)).multiplyScalar(LARGO_PENDULO).add(pendulo.pivote);
    asiento.position.copy(centroAsiento);
    asiento.rotation.set(-angulo, 0.02 * Math.sin(t * 0.61 + 1.3) * vaiven, 0.008 * Math.sin(t * 1.13) * vaiven, 'XYZ');
    asiento.updateMatrix();
    for (const e of enganches) {
      mundo.copy(e.local).applyMatrix4(asiento.matrix);
      direccion.copy(mundo).sub(e.anclaje);
      const largo = direccion.length();
      e.cuerda.position.copy(e.anclaje);
      e.cuerda.quaternion.setFromUnitVectors(abajo, direccion.divideScalar(largo));
      e.cuerda.scale.set(1, largo / e.longitud, 1);
    }
    marco.updateMatrixWorld(true);
    asiento.getWorldPosition(luzSol.target.position);
    luzSol.position.copy(luzSol.target.position).addScaledVector(direccionSol, 20);
    tiempoEscena.value = t;
    acabado.uniforms.uTiempo.value = t;
    composer.render();
    if (primerFotograma) {
      primerFotograma = false;
      document.body.classList.add('escena-lista');
      rendimiento.esperaHasta = performance.now() + 4000;  
    }
  }
  renderer.setAnimationLoop(fotograma);
})();
