import { Container, Graphics, Text, TextStyle } from "pixi.js";

export interface PlayerInfo {
  sessionId: string;
  username: string;
  isCurrentPlayer: boolean;
  kills?: number;
}

export class PlayersListModal extends Container {
  private overlay: Graphics;
  private modal: Graphics;
  private titleText: Text;
  private playerTexts: Text[] = [];
  private isVisible: boolean = false;

  constructor(screenWidth: number, screenHeight: number) {
    super();
    this.zIndex = 100000; // Very high z-index to be on top
    this.visible = false;

    // Create overlay background
    this.overlay = new Graphics();
    this.overlay.rect(0, 0, screenWidth, screenHeight);
    this.overlay.fill({ color: 0x000000, alpha: 0.7 });
    this.addChild(this.overlay);

    // Create modal background
    const modalWidth = 400;
    const modalHeight = 300;
    const modalX = (screenWidth - modalWidth) / 2;
    const modalY = (screenHeight - modalHeight) / 2;

    this.modal = new Graphics();
    this.modal.roundRect(modalX, modalY, modalWidth, modalHeight, 10);
    this.modal.fill(0x2a2a2a);
    this.modal.stroke({ width: 2, color: 0xffffff });
    this.addChild(this.modal);

    // Title
    const titleStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 24,
      fill: 0xffffff,
      align: "center",
    });

    this.titleText = new Text({
      text: "Žaidėjai",
      style: titleStyle,
    });
    this.titleText.anchor.set(0.5);
    this.titleText.x = screenWidth / 2;
    this.titleText.y = modalY + 30;
    this.addChild(this.titleText);
  }

  updatePlayers(players: PlayerInfo[]): void {
    // Remove old player texts
    this.playerTexts.forEach((text) => {
      this.removeChild(text);
    });
    this.playerTexts = [];

    // Create new player texts
    const playerStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 18,
      fill: 0xffffff,
      align: "left",
    });

    const currentPlayerStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 18,
      fill: 0x4a90e2,
      align: "left",
      fontWeight: "bold",
    });

    const screenWidth = this.overlay.width;
    const modalY = (this.overlay.height - 300) / 2;
    const startY = modalY + 80;
    const lineHeight = 30;

    players.forEach((player, index) => {
      const style = player.isCurrentPlayer ? currentPlayerStyle : playerStyle;
      const prefix = player.isCurrentPlayer ? "► " : "  ";
      const kills = player.kills !== undefined ? player.kills : 0;
      const playerText = new Text({
        text: `${prefix}${player.username} - Kills: ${kills}`,
        style: style,
      });
      playerText.x = screenWidth / 2 - 150;
      playerText.y = startY + index * lineHeight;
      playerText.anchor.set(0, 0.5);
      this.addChild(playerText);
      this.playerTexts.push(playerText);
    });

    // Update modal height based on number of players
    const modalWidth = 400;
    const modalHeight = Math.max(300, 100 + players.length * lineHeight);
    const modalX = (screenWidth - modalWidth) / 2;
    const newModalY = (this.overlay.height - modalHeight) / 2;

    this.modal.clear();
    this.modal.roundRect(modalX, newModalY, modalWidth, modalHeight, 10);
    this.modal.fill(0x2a2a2a);
    this.modal.stroke({ width: 2, color: 0xffffff });

    // Update title position
    this.titleText.y = newModalY + 30;
  }

  show(): void {
    this.visible = true;
    this.isVisible = true;
  }

  hide(): void {
    this.visible = false;
    this.isVisible = false;
  }

  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  destroy(): void {
    this.removeChildren();
    super.destroy();
  }
}
