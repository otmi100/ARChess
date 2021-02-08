import { Move } from "chessops";
import { Chess } from "chessops/chess";
import { parseFen } from "chessops/fen";

const API = "https://home.envolve-agile.de/chessserver";

export default class OnlineChessClient {
  private gameId: number;
  private game: Chess | undefined;
  private afterUpdateFunction: (game: Chess) => void;
  private lastFen = "";

  constructor(gameId: number, afterUpdateFunction: (game: Chess) => void) {
    this.gameId = gameId;
    this.game = Chess.default();
    this.afterUpdateFunction = afterUpdateFunction;
    this.poll();
    //get game from server
  }

  getCachedGame(): Chess {
    if (this.game) {
      return this.game;
    } else {
      throw new Error("Requested Cached Game before Game started.");
    }
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
          if (this.lastFen !== gameOnline) {
            console.log("Something changed -> updating board.");
            const newGame = Chess.fromSetup(
              parseFen(gameOnline).unwrap()
            ).unwrap();
            this.lastFen = gameOnline;
            this.afterUpdateFunction(newGame);
            this.game = newGame;
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
