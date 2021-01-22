import { Move } from "chessops";
import { Chess } from "chessops/chess";
import { makeFen, parseFen } from "chessops/fen";

const API = "https://home.envolve-agile.de/chessserver";

export default class OnlineChess {
  private gameId: number;
  private game: Chess;
  private afterUpdateFunction: () => void;

  constructor(gameId: number, afterUpdateFunction: () => void) {
    this.gameId = gameId;
    this.game = Chess.default();
    this.afterUpdateFunction = afterUpdateFunction;
    this.poll();
    //get game from server
  }

  getGame(): Chess {
    return this.game;
  }

  play(move: Move): void {
    const request = new XMLHttpRequest();
    request.open("POST", API + "/games/" + this.gameId);
    request.setRequestHeader("Content-Type", "application/json");
    console.log(JSON.stringify(move));
    request.send(JSON.stringify(move));

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        console.log(request.responseText);
      } else {
        console.warn(request.statusText, request.responseText);
      }
    };
    request.onerror = (e) => {
      console.log(e);
    };
  }

  getGameUpdates(): void {
    console.log("query api");
    const request = new XMLHttpRequest();
    request.open("GET", API + "/games/" + this.gameId);
    request.send();
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        const gameOnline = request.responseText;
        console.log(makeFen(this.game.toSetup()));
        console.log(gameOnline);
        console.log(makeFen(this.game.toSetup()));
        if (makeFen(this.game.toSetup()) !== gameOnline) {
          console.log("Something changed -> updating board.");
          this.game = Chess.fromSetup(parseFen(gameOnline).unwrap()).unwrap();
          this.afterUpdateFunction();
        } else {
          console.log("nothing changed... keep polling...");
        }
      } else {
        console.warn(request.statusText, request.responseText);
      }
    };
    request.onerror = (e) => {
      console.log(e);
    };
  }

  async poll(): Promise<void> {
    const executePoll = async () => {
      await this.getGameUpdates();
      setTimeout(executePoll, 1500);
    };
    return new Promise(executePoll);
  }
}
