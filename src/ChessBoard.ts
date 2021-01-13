import {
  BoxGeometry,
  Group,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
} from "three";
import { ChessPiece } from "./ChessPiece";
import { Chess } from "chessops/chess";
import { board as debugBoard } from 'chessops/debug';
import { Color as PlayingColor, Move, Role, Square } from "chessops";

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
        console.log("making piece invisible, because it is not on board anymore");
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
  private chessOps = Chess.default();
  private pieceMap = new PieceMap(this.chessBoardObject3D);

  constructor() {
    this.chessBoardObject3D.name = "ChessBoard";
    this.generateFields();
    this.readBoardAndPositionPieces();
    this.chessBoardObject3D.scale.set(0.05, 0.05, 0.05);
    this.chessBoardObject3D.visible = false;
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

  selectPiece(pieceObject: Object3D): void {
    console.log("Selecting piece");
    const square: Square = this.positionToSquare({file: pieceObject.position.x, rank: Math.abs(pieceObject.position.z)})
    console.log(this.squareToPosition(square));
    const piece = this.chessBoardFields.get(square)?.placedPiece;
    console.log(piece);
    if (piece) {
      piece.select();
      this.selectedPiece = piece;
      this.highlightMoveOptions(square);
    } else {
      throw new Error("Piece not found on this field.");
    }
    console.log("Piece selected");
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

  rotateY(angle = 4): void {
    this.chessBoardObject3D.rotateY(angle);
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

  positionBoard(matrix4: Matrix4): void {
    this.chessBoardObject3D.position.setFromMatrixPosition(matrix4);
    this.chessBoardObject3D.visible = true;
  }

  moveSelectedPieceTo(position: Position): string | undefined {
    if (this.selectedPiece) {
      const oldPosition = this.positionToSquare(
        this.selectedPiece.getPosition()
      );
      const newPosition = this.positionToSquare(position);

      if (oldPosition) {
        const move: Move = { from: oldPosition, to: newPosition };
        console.debug("Trying to move. This is the Chessboard before the move.");
        console.debug(debugBoard(this.chessOps.board))
        console.debug("Trying to move:");
        console.debug(move);
        if (this.chessOps.isLegal(move)) {
          this.chessOps.play(move);
          console.debug("Chess Board after move:");
          console.debug(debugBoard(this.chessOps.board));
          this.selectedPiece.setPosition({
            file: position.file,
            rank: position.rank,
          });
          this.selectedPiece.unSelect();
          this.removeMoveOptions();
          this.readBoardAndPositionPieces();
          if (this.chessOps.isCheckmate()) {
            console.log(this.chessOps.outcome()?.winner + "WON!");
            return (this.chessOps.outcome()?.winner + " WON this match!")
          } else if (this.chessOps.isStalemate()) {
            console.log("STALEMATE!");
            return ("STALEMATE!")
          } else if (this.chessOps.isCheck()) {
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
  }

  private highlightMoveOptions(square: Square) {
    console.log("getting move options");
    for (const option of this.chessOps.dests(square)) {
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

  private squareToPosition(square: Square) : Position {
    return {rank: square >> 3, file: square & 7}
  }

  private positionToSquare(position: Position): Square {
    return 8 * position.rank + position.file;
  }

  private readBoardAndPositionPieces() {
    this.pieceMap.reset();
    this.chessBoardFields.forEach((field, key) => {
      const coPiece = this.chessOps.board.get(key);
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
  }

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
        const square: Square = this.positionToSquare({file: file, rank: rank});
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
      } else if ((this.squareToPosition(key).file + this.squareToPosition(key).rank) % 2 === 1) {
        material = this.fieldDarkMaterial;
      } else {
        material = this.fieldLightMaterial;
      }
      (<Mesh>field.object3D).material = material;
    });
  }
}
