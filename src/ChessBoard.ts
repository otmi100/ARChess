import {
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
} from "three";
import { ChessPiece } from "./ChessPiece";
import { board as debugBoard } from "chessops/debug";
import { Chess, Color as PlayingColor, Move, Role, Square } from "chessops";
import OnlineChess from "./OnlineChessClient";

type ChessBoardField = {
  object3D: Object3D;
  isOption?: boolean;
  placedPiece: ChessPiece | null;
};

export type Position = {
  rank: number;
  file: number;
};

export class ChessBoard {
  private chessBoardFields: Map<number, ChessBoardField> = new Map<
    number,
    ChessBoardField
  >();

  private chessBoardObject3D: Group = new Group();
  private chessBoardWorldObject: Group = new Group();
  private selectedPiece: ChessPiece | undefined;
  private onlineGame: OnlineChess;
  private pieceMap = new PieceMap(this.chessBoardObject3D);

  constructor(gameId: number) {
    this.generateFields();
    this.chessBoardObject3D.position.set(-4, 0, 4);
    this.chessBoardObject3D.name = "ChessBoard";
    this.chessBoardWorldObject.name = "ChessBoardWorld";
    this.chessBoardWorldObject.add(this.chessBoardObject3D);
    console.log("starting new game with id + " + gameId);
    this.onlineGame = new OnlineChess(gameId, this.readBoardAndPositionPieces);
  }

  getAllVisiblePieceObjects(): Object3D[] {
    const visiblePieces: Object3D[] = [];
    //console.log("looking for pieces");
    const loadedPieceObject3Ds = this.pieceMap.getPieces();
    for (let i = 0; i < loadedPieceObject3Ds.length; i++) {
      const loadedPiece = loadedPieceObject3Ds[i].object3D;
      if (loadedPiece && loadedPiece.visible === true) {
        visiblePieces.push(loadedPiece);
      } else {
        //console.log("piece has no position and should not be returned");
      }
    }
    //console.log(visiblePieces);
    return visiblePieces;
  }

  getAllFieldObjects(): Object3D[] {
    const fieldObjects: Object3D[] = [];
    this.chessBoardFields.forEach((field) => {
      fieldObjects.push(field.object3D);
    });
    return fieldObjects;
  }

  getBoardObject(): Group {
    return this.chessBoardWorldObject;
  }

  selectPiece(pieceObject: Object3D): string | undefined {
    console.log("Selecting piece");
    const square: Square = this.positionToSquare({
      file: pieceObject.position.x,
      rank: Math.abs(pieceObject.position.z),
    });
    console.log(this.squareToPosition(square));
    const piece = this.chessBoardFields.get(square)?.placedPiece;
    console.log(piece);
    if (piece) {
      if (this.onlineGame.getCachedGame().turn !== piece.getColor()) {
        return "It's " + this.onlineGame.getCachedGame().turn + "'s turn.";
      } else {
        piece.select();
        this.selectedPiece = piece;
        this.highlightMoveOptions(square);
      }
    } else {
      throw new Error("Piece not found on this field.");
    }
  }

  unSelectPiece(): void {
    this.selectedPiece?.unSelect();
    this.selectedPiece = undefined;
    this.removeMoveOptions();
  }

  getSelectedPiece(): Object3D | undefined {
    if (this.selectedPiece) {
      console.log(
        "returning selected piece of " + this.selectedPiece.getPosition()
      );
      return this.selectedPiece?.object3D;
    } else {
      console.log("nothing selected");
      return undefined;
    }
  }

  async moveSelectedPieceTo(position: Position): Promise<string> {
    return new Promise((resolve, reject) => {
      if (this.selectedPiece) {
        const selectedPiece = this.selectedPiece;
        const oldPosition = this.positionToSquare(selectedPiece.getPosition());
        const newPosition = this.positionToSquare(position);

        if (oldPosition !== undefined || oldPosition !== null) {
          const move: Move = { from: oldPosition, to: newPosition };
          console.debug(
            "Trying to move. This is the Chessboard before the move."
          );
          console.debug(debugBoard(this.onlineGame.getCachedGame().board));
          console.debug("Trying to move:");
          console.debug(move);
          if (this.onlineGame.getCachedGame().isLegal(move)) {
            this.onlineGame.play(move).then(() => {
              console.debug("Chess Board after move:");
              console.debug(debugBoard(this.onlineGame.getCachedGame().board));
              selectedPiece.setPosition({
                file: position.file,
                rank: position.rank,
              });
              selectedPiece.unSelect();
              this.removeMoveOptions();
              resolve(this.gameStatus());
            });
          } else {
            reject("Not a legal move!");
          }
        } else {
          reject("old position for move not found");
        }
      } else {
        reject("No piece selected. Cannot move..");
      }
    });
  }

  private gameStatus(): string {
    if (this.onlineGame.getCachedGame().isCheckmate()) {
      console.log(this.onlineGame.getCachedGame().outcome()?.winner + "WON!");
      return (
        this.onlineGame.getCachedGame().outcome()?.winner + " WON this match!"
      );
    } else if (this.onlineGame.getCachedGame().isStalemate()) {
      console.log("STALEMATE!");
      return "STALEMATE!";
    } else if (this.onlineGame.getCachedGame().isCheck()) {
      console.log("CHECK!");
      return "CHECK!";
    } else {
      return "";
    }
  }

  private highlightMoveOptions(square: Square) {
    console.log("getting move options");
    for (const option of this.onlineGame.getCachedGame().dests(square)) {
      console.log(this.squareToPosition(option));
      const field = this.chessBoardFields.get(option);
      if (field) {
        console.log("found field, marking as option");
        field.isOption = true;
        console.log(field);
      }
    }
    this.updateFields();
  }

  private removeMoveOptions(): void {
    this.chessBoardFields.forEach((field) => (field.isOption = false));
    this.updateFields();
  }

  private squareToPosition(square: Square): Position {
    return { rank: square >> 3, file: square & 7 };
  }

  private positionToSquare(position: Position): Square {
    return 8 * position.rank + position.file;
  }

  private readBoardAndPositionPieces = (game: Chess): void => {
    this.pieceMap.reset();
    this.chessBoardFields.forEach((field, key) => {
      const coPiece = game.board.get(key);
      if (coPiece?.role && coPiece.color) {
        const arPiece = this.pieceMap.getUnpositionedOrNewPiece(
          coPiece?.role,
          coPiece?.color,
          this.squareToPosition(key)
        );
        arPiece.setUpdatedAfterMove(true);
        field.placedPiece = arPiece;
      }
    });
    this.pieceMap.hideUnpositioned();
  };

  private fieldGeometry = new BoxGeometry(1, 0.3, 1);
  private fieldDarkMaterial = new MeshStandardMaterial({
    color: 0xf5f5dc,
  });
  private fieldLightMaterial = new MeshStandardMaterial({
    color: 0x463f31,
  });
  private fieldOptionMaterial = new MeshStandardMaterial({
    color: 0xcb42f5,
  });

  private generateFields() {
    for (let file = 0; file < 8; file++) {
      for (let rank = 0; rank < 8; rank++) {
        const square: Square = this.positionToSquare({
          file: file,
          rank: rank,
        });
        let material;
        if ((rank + file) % 2 === 1) {
          material = this.fieldDarkMaterial;
        } else {
          material = this.fieldLightMaterial;
        }
        const cube = new Mesh(this.fieldGeometry, material);
        this.chessBoardObject3D.add(cube);
        cube.position.set(file, 0, -rank);
        this.chessBoardFields.set(square, {
          object3D: cube,
          placedPiece: null,
        });
      }
    }
  }

  private updateFields() {
    console.log("updateing all fields");
    this.chessBoardFields.forEach((field, key) => {
      let material;
      if (field.isOption) {
        console.log(field);
        material = this.fieldOptionMaterial;
      } else if (
        (this.squareToPosition(key).file + this.squareToPosition(key).rank) %
          2 ===
        1
      ) {
        material = this.fieldDarkMaterial;
      } else {
        material = this.fieldLightMaterial;
      }
      (<Mesh>field.object3D).material = material;
    });
  }
}

class PieceMap {
  private chessPieces: ChessPiece[] = [];
  private chessBoard: Object3D;

  constructor(chessBoard: Object3D) {
    this.chessBoard = chessBoard;
  }

  getPieces(): ChessPiece[] {
    return this.chessPieces;
  }

  reset() {
    this.chessPieces.forEach((piece) => piece.setUpdatedAfterMove(false));
  }

  hideUnpositioned() {
    this.chessPieces.forEach((piece) => {
      if (!piece.getUpdatedAfterMove() && piece.object3D) {
        console.log(
          "making piece invisible, because it is not on board anymore"
        );
        piece.object3D.visible = false;
      }
    });
  }

  getUnpositionedOrNewPiece(
    role: Role,
    color: PlayingColor,
    position: Position
  ): ChessPiece {
    const piece = this.chessPieces.find(
      (chessPiece) =>
        chessPiece.getRole() === role &&
        chessPiece.getColor() === color &&
        !chessPiece.getUpdatedAfterMove()
    );
    if (piece) {
      piece.setPosition(position);
      return piece;
    } else {
      const newPiece = new ChessPiece(color, role, position);
      newPiece.getObject3D().then((object3D) => {
        //console.log("adding object to board");
        this.chessBoard.add(object3D);
        object3D.scale.set(0.25, 0.25, 0.25);
        //console.log(this.chessBoardObject3D);
        //console.log(object3D);
      });
      this.chessPieces.push(newPiece);
      return newPiece;
    }
  }
}
