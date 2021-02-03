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

  getCachedGame(): Chess {
    return this.game;
  }

  async play(move: Move): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open("POST", API + "/games/" + this.gameId);
      request.setRequestHeader("Content-Type", "application/json");
      console.log(JSON.stringify(move));
      request.send(JSON.stringify(move));

      request.onload = async () => {
        if (request.status >= 200 && request.status < 300) {
          console.log(request.responseText);
        } else {
          console.warn(request.statusText, request.responseText);
          reject(request.statusText + request.responseText);
        }
        await this.getGameUpdates(); //Update Board after move
        resolve();
      };
      request.onerror = (e) => {
        console.error(e);
        reject(e);
      };
    });
  }

  private async getGameUpdates(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log("query api");
      const request = new XMLHttpRequest();
      request.open("GET", API + "/games/" + this.gameId);
      request.send();
      request.onload = () => {
        if (request.status >= 200 && request.status < 300) {
          const gameOnline = request.responseText;
          console.log(gameOnline);
          console.log(makeFen(this.game.toSetup()));
          if (makeFen(this.game.toSetup()) !== gameOnline) {
            console.log("Something changed -> updating board.");
            this.game = Chess.fromSetup(parseFen(gameOnline).unwrap()).unwrap();
            this.afterUpdateFunction();
          } else {
            console.log("nothing changed... keep polling...");
          }
          resolve();
        } else {
          console.warn(request.statusText, request.responseText);
          reject(request.statusText + request.responseText);
        }
      };
      request.onerror = (e) => {
        console.error(e);
        reject(e);
      };
    });
  }

  private async poll(): Promise<void> {
    const executePoll = async () => {
      await this.getGameUpdates();
      setTimeout(executePoll, 1500);
    };
    return new Promise(executePoll);
  }
}
