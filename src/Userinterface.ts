import { GameMode } from "./GameMode";

export default class Userinterface {
  private container: HTMLDivElement = document.createElement("div");
  // GAME-MODE Buttons
  private setupButton = <HTMLButtonElement>document.getElementById("setup");

  // SETUP Buttons
  private placeButton = <HTMLButtonElement>document.getElementById("place");
  private rotateChessboardButton = <HTMLButtonElement>(
    document.getElementById("rotate")
  );
  private growButton = <HTMLButtonElement>document.getElementById("grow");
  private shrinkButton = <HTMLButtonElement>document.getElementById("shrink");

  private notificationText = document.getElementById("notificationText");
  private setupMenu = document.getElementById("setupMenu");

  private gameIdInput = <HTMLInputElement>document.getElementById("gameid");
  private visualDebug = <HTMLInputElement>document.getElementById("visualDebug");
  private startGameButton = <HTMLButtonElement>(
    document.getElementById("startGame")
  );
  private startDiv = document.getElementById("startDiv");

  constructor(
    canvas: HTMLCanvasElement,
    startAR: () => void,
    setup: () => void,
    placeBoard: () => void,
    growBoard: () => void,
    shrinkBoard: () => void,
    rotateBoardY: () => void
  ) {
    document.body.appendChild(this.container);
    this.container.appendChild(canvas);
    this.setupButton?.addEventListener("click", () => {
      setup();
    });
    this.startGameButton?.addEventListener("click", () => {
      startAR();
    });
    this.placeButton?.addEventListener("click", () => {
      placeBoard();
    });
    this.rotateChessboardButton?.addEventListener("click", () => {
      rotateBoardY();
    });
    this.growButton?.addEventListener("click", () => {
      growBoard();
    });
    this.shrinkButton?.addEventListener("click", () => {
      shrinkBoard();
    });
  }

  updateGameMenu = (gameMode: GameMode): void => {
    switch (gameMode) {
      case GameMode.Setup:
        if (this.notificationText && this.setupMenu) {
          this.notificationText.innerText =
            'Move the camera slowly around until you see a white circle. Hit "place" to place Chessboard.';
          this.notificationText.style.visibility = "visible";
          this.setupMenu.style.visibility = "visible";
        }
        this.setupButton.classList.add("btnpressed");
        break;
      case GameMode.Play:
        this.setupButton.classList.remove("btnpressed");
        if (this.notificationText && this.setupMenu) {
          this.notificationText.innerText = "";
          this.notificationText.style.visibility = "hidden";
          this.setupMenu.style.visibility = "hidden";
          console.log("trying to hide");
        }
        break;
    }
  };

  hideStartMenu(): void {
    this.setupButton.style.visibility = "visible";
    this.startGameButton.style.visibility = "hidden";
    this.gameIdInput.style.visibility = "hidden";
    this.visualDebug.style.visibility = "hidden";
    if (this.startDiv) {
      this.startDiv.style.visibility = "hidden";
    }
  }

  isVisualDebug(): boolean {
    if(this.visualDebug.checked) {
      return true;
    } else {
      return false;
    }
  }

  showNotification = (result: string | undefined): void => {
    if (result) {
      if (result && this.notificationText) {
        this.notificationText.innerText = result;
        this.notificationText.style.visibility = "visible";
      }
    } else {
      if (this.notificationText) {
        this.notificationText.style.visibility = "hidden";
      }
    }
  };

  showARNotSupported(reason: string): void {
    this.disableARButton();
    this.startGameButton.textContent = reason;
  }

  private disableARButton(): void {
    this.startGameButton.style.display = "";
    this.startGameButton.style.cursor = "auto";

    this.startGameButton.onmouseenter = null;
    this.startGameButton.onmouseleave = null;

    this.startGameButton.onclick = null;
  }

  getGameId(): number {
    return +this.gameIdInput.value;
  }

  getOverlay(): HTMLDivElement {
    const element = <HTMLDivElement>document.getElementById("overlay");
    if (element) {
      return element;
    } else {
      throw new Error("Overlay not found.");
    }
  }
}
