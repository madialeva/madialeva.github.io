class TapScene extends Phaser.Scene {
  #isMobile = false;
  #tapText  = null;
  #music    = null;
  constructor() {
    super({ key: 'TapScene' });
  }
  preload() {
    this.load.audio('tapBack', 'music/tap-back.mp3');
  }
  create() {
    this.cameras.main.setBackgroundColor('#000000');
    this.#music = this.sound.add('tapBack', { loop: true });
    this.#music.play();
    this.#isMobile = this.sys.game.device.os.android || this.sys.game.device.os.iOS;
    this.scale.on('resize', (gameSize) => {
      if (this.#tapText) this.#centerTapText(gameSize.width, gameSize.height);
    });
    this.#showTapToStart();
  }
  #showTapToStart() {
    const { width, height } = this.scale;
    const label = this.#isMobile ? 'TOCA PARA JUGAR' : 'CLICK PARA JUGAR';
    this.#tapText = this.add.text(0, 0, label, {
      fontSize: '26px',
      color: '#ffffff',
      fontFamily: 'courier, sans-serif',
      align: 'center'
    }).setOrigin(0.5).setDepth(5);
    this.#centerTapText(width, height);
    this.tweens.add({
      targets: this.#tapText,
      alpha: 0,
      duration: 600,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
    const trigger = () => {
      document.removeEventListener('touchend', trigger);
      document.removeEventListener('click', trigger);
      this.#enterFullscreen();
    };
    document.addEventListener('touchend', trigger);
    document.addEventListener('click', trigger);
  }
  #centerTapText(w, h) {
    this.#tapText.setPosition(w / 2, h / 2);
  }
  #enterFullscreen() {
    if (this.#tapText) {
      this.#tapText.destroy();
      this.#tapText = null;
    }
    const afterFullscreen = () => {
      if (this.#isMobile) {
        try {
          screen.orientation.lock('landscape').catch(() => {});
        } catch (e) {}
      }
      let started = false;
      const startGame = () => {
        if (started) return;
        started = true;
        if (this.#music) this.#music.stop();
        this.scene.start('StartScene');
      };
      this.sys.game.events.once('resume', startGame);
      window.setTimeout(() => {
        this.sys.game.resume();
        startGame();
      }, 300);
    };
    const el = document.documentElement;
    const requestFS = el.requestFullscreen
      || el.webkitRequestFullscreen
      || el.mozRequestFullScreen;
    if (requestFS) {
      requestFS.call(el)
        .then(() => afterFullscreen())
        .catch(() => afterFullscreen());
    } else {
      afterFullscreen();
    }
  }
}