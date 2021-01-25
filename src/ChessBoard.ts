import {
  BoxGeometry,
  Group,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
} from "three";
import { ChessPiece } from "./ChessPiece";
import { board as debugBoard } from "chessops/debug";
import { Chess, Color as PlayingColor, Move, Role, Square } from "chessops";
import OnlineChess from "./OnlineChess";

type ChessBoardField = {
  object3D: Object3D;
  isOption?: boolean;
  placedPiece: ChessPiece | null;
};

export type Position = {
  rank: number;
  file: number;
};

class PieceMap {
  private chessPieces: ChessPiece[] = [];
  private chessBoardObject3D: Object3D;

  constructor(chessBoard: Object3D) {
    this.chessBoardObject3D = chessBoard;
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
        this.chessBoardObject3D.add(object3D);
        object3D.scale.set(0.25, 0.25, 0.25);
        //console.log(this.chessBoardObject3D);
        //console.log(object3D);
      });
      this.chessPieces.push(newPiece);
      return newPiece;
    }
  }
}

export class ChessBoard {
  private chessBoardFields: Map<number, ChessBoardField> = new Map<
    number,
    ChessBoardField
  >();

  private chessBoardObject3D: Group = new Group();
  private selectedPiece: ChessPiece | undefined;
  private chessGame: OnlineChess | undefined;
  private pieceMap = new PieceMap(this.chessBoardObject3D);

  constructor() {
    this.generateFields();
    this.chessBoardObject3D.name = "ChessBoard";
    this.readBoardAndPositionPieces();
    this.chessBoardObject3D.scale.set(0.05, 0.05, 0.05);
    this.chessBoardObject3D.visible = false;
  }

  startGame(gameId: number): void {
    console.log("starting new game with id + " + gameId);
    this.chessGame = new OnlineChess(gameId, this.readBoardAndPositionPieces);
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
    return this.chessBoardObject3D;
  }

  selectPiece(pieceObject: Object3D): string | undefined {
    if (this.chessGame) {
      console.log("Selecting piece");
      const square: Square = this.positionToSquare({
        file: pieceObject.position.x,
        rank: Math.abs(pieceObject.position.z),
      });
      console.log(this.squareToPosition(square));
      const piece = this.chessBoardFields.get(square)?.placedPiece;
      console.log(piece);
      if (piece) {
        if (this.chessGame.getGame().turn !== piece.getColor()) {
          return "It's " + this.chessGame.getGame().turn + "'s turn.";
        } else {
          piece.select();
          this.selectedPiece = piece;
          this.highlightMoveOptions(square);
        }
      } else {
        throw new Error("Piece not found on this field.");
      }
    } else {
      throw new Error("Game has not been startet yet.");
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

  rotateY(radiant = 0.1): void {
    this.chessBoardObject3D.rotateY(radiant);
  }

  grow(): void {
    this.chessBoardObject3D.scale.x *= 1.1;
    this.chessBoardObject3D.scale.y *= 1.1;
    this.chessBoardObject3D.scale.z *= 1.1;
  }

  shrink(): void {
    this.chessBoardObject3D.scale.x *= 0.9;
    this.chessBoardObject3D.scale.y *= 0.9;
    this.chessBoardObject3D.scale.z *= 0.9;
  }

  setBoardPosition(matrix4: Matrix4): void {
    this.chessBoardObject3D.position.setFromMatrixPosition(matrix4);
    this.chessBoardObject3D.visible = true;
  }

  moveSelectedPieceTo(position: Position): string | undefined {
    if (this.chessGame) {
      if (this.selectedPiece) {
        const oldPosition = this.positionToSquare(
          this.selectedPiece.getPosition()
        );
        const newPosition = this.positionToSquare(position);

        if (oldPosition) {
          const move: Move = { from: oldPosition, to: newPosition };
          console.debug(
            "Trying to move. This is the Chessboard before the move."
          );
          console.debug(debugBoard(this.chessGame.getGame().board));
          console.debug("Trying to move:");
          console.debug(move);
          if (this.chessGame.getGame().isLegal(move)) {
            this.chessGame.play(move);
            console.debug("Chess Board after move:");
            console.debug(debugBoard(this.chessGame.getGame().board));
            this.selectedPiece.setPosition({
              file: position.file,
              rank: position.rank,
            });
            this.selectedPiece.unSelect();
            this.removeMoveOptions();
            this.readBoardAndPositionPieces();
            if (this.chessGame.getGame().isCheckmate()) {
              console.log(this.chessGame.getGame().outcome()?.winner + "WON!");
              return (
                this.chessGame.getGame().outcome()?.winner + " WON this match!"
              );
            } else if (this.chessGame.getGame().isStalemate()) {
              console.log("STALEMATE!");
              return "STALEMATE!";
            } else if (this.chessGame.getGame().isCheck()) {
              console.log("CHECK!");
              return "CHECK!";
            } else {
              return undefined;
            }
          } else {
            console.log("Not a legal move!");
          }
        } else {
          throw Error("old position for move not found");
        }
      } else {
        throw new Error("No piece selected. Cannot move..");
      }
    } else {
      throw new Error("Game has not been startet yet!");
    }
  }

  private highlightMoveOptions(square: Square) {
    if (this.chessGame) {
      console.log("getting move options");
      for (const option of this.chessGame.getGame().dests(square)) {
        console.log(this.squareToPosition(option));
        const field = this.chessBoardFields.get(option);
        if (field) {
          console.log("found field, marking as option");
          field.isOption = true;
          console.log(field);
        }
      }
      this.updateFields();
    } else {
      throw new Error("Game has not been startet yet!");
    }
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

  private readBoardAndPositionPieces = (): void => {
    console.log(this);
    let chessGame: Chess;
    if (this.chessGame) {
      chessGame = this.chessGame.getGame();
    } else {
      chessGame = Chess.default();
    }
    this.pieceMap.reset();
    this.chessBoardFields.forEach((field, key) => {
      const coPiece = chessGame.board.get(key);
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

  private fieldGeometry = new BoxGeometry(1, 0.01, 1);
  private fieldDarkMaterial = new MeshStandardMaterial({
    color: 0xf5f5dc,
    opacity: 0.7,
  });
  private fieldLightMaterial = new MeshStandardMaterial({
    color: 0x463f31,
    opacity: 0.7,
  });
  private fieldOptionMaterial = new MeshStandardMaterial({
    color: 0xcb42f5,
    opacity: 0.7,
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
