class StartScene extends Phaser.Scene {
  #btnBg     = null;
  #btnLabel  = null;
  #btnR      = 22;
  #btnMargin = 20;
  #btnX      = 0;
  #btnY      = 0;
  constructor() {
    super({ key: 'StartScene' });
  }
  create() {
    this.cameras.main.setBackgroundColor('#000000');
    this.scale.on('resize', (gameSize) => {
      if (this.#btnBg) this.#repositionCloseButton(gameSize.width);
    });
    this.#createCloseButton();
  }
  #createCloseButton() {
    const { width } = this.scale;
    this.#btnBg = this.add.graphics().setDepth(10);
    this.#btnLabel = this.add.text(0, 0, '✕', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5).setDepth(11).setInteractive({ useHandCursor: true });
    this.#btnLabel.on('pointerover', () => this.#drawBtn(true));
    this.#btnLabel.on('pointerout',  () => this.#drawBtn(false));
    this.#btnLabel.on('pointerup',   () => {
      const exit = document.exitFullscreen
        ? document.exitFullscreen()
        : (document.webkitExitFullscreen ? Promise.resolve(document.webkitExitFullscreen()) : Promise.resolve());
      exit.finally(() => { window.location.href = 'index.html'; });
    });
    this.#repositionCloseButton(width);
  }
  #repositionCloseButton(w) {
    const cx = w - this.#btnMargin - this.#btnR;
    const cy = this.#btnMargin + this.#btnR;
    this.#btnX = cx;
    this.#btnY = cy;
    this.#drawBtn(false);
    this.#btnLabel.setPosition(cx, cy);
  }
  #drawBtn(hover) {
    this.#btnBg.clear();
    this.#btnBg.fillStyle(hover ? 0x555555 : 0x222222, 0.85);
    this.#btnBg.fillCircle(this.#btnX, this.#btnY, this.#btnR);
  }
}