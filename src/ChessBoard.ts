import {
  BoxGeometry,
  Group,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Vector3,
} from "three";
import { ChessPiece } from "./ChessPiece";
import { Chess } from "chessops/chess";
import { SquareSet } from "chessops/squareSet";
import {
  Board,
  Color as PlayingColor,
  parseSquare,
  Role,
  Square,
} from "chessops";

type ChessBoardField = {
  object3D: Object3D;
  isOption?: boolean;
  placedPiece: ChessPiece | null;
};

export type Position = {
  rank: number;
  file: number;
  square: Square | null;
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
    this.chessPieces.forEach((piece) =>
      piece.setPosition({ file: 0, rank: 0, square: null })
    );
  }

  setUnpositioned(
    role: Role,
    color: PlayingColor,
    position: Position
  ): ChessPiece {
    let piece = this.chessPieces.find(
      (chessPiece) =>
        chessPiece.getRole() === role &&
        chessPiece.getColor() === color &&
        chessPiece.getPosition() === undefined
    );
    if (piece) {
      return piece;
    } else {
      let newPiece = new ChessPiece(color, role, position);
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
    let visiblePieces: Object3D[] = [];
    //console.log("looking for pieces");
    let loadedPieceObject3Ds = this.pieceMap.getPieces();
    for (let i = 0; i < loadedPieceObject3Ds.length; i++) {
      let loadedPiece = loadedPieceObject3Ds[i].object3D;
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
    let fieldObjects: Object3D[] = [];
    this.chessBoardFields.forEach((field) => {
      fieldObjects.push(field.object3D);
    });
    return fieldObjects;
  }

  getBoardObject(): Group {
    return this.chessBoardObject3D;
  }
  getFieldPosition(position: Position): Vector3 {
    let chessBoardField = this.chessBoardFields.get(
      this.fileRankToSquare(position.file, position.rank)
    );
    if (chessBoardField) {
      return chessBoardField.object3D.position;
    } else {
      throw Error("Field not found on position " + position);
    }
    //return this.chessBoardFields[position.x][position.y].field.position;
  }

  placePieceOnField(piece: ChessPiece, position: Position) {
    /*
    if (this.chessBoardFields[position.x][position.y].placedPiece != null) {
      console.log("Da steht schon einer..");
      this.chessBoardFields[position.x][position.y].placedPiece?.setPosition(
        null
      );
    }
    this.chessBoardFields[position.x][position.y].placedPiece = piece;
    piece.setPosition(position);*/
  }

  highlightMoveOptions(square: Square) {
    console.log("getting move options");
    for (let option of this.chessOps.dests(square)) {
      console.log(option);
      let field = this.chessBoardFields.get(option);
      if (field) {
        console.log("found field, marking as option");
        field.isOption = true;
        console.log(field);
      }
      //console.log((square >> 3) + " x " + (square & 7));
    }
    this.updateFields();
  }

  removeMoveOptions() {
    this.chessBoardFields.forEach((field) => (field.isOption = false));
    this.updateFields();
  }

  private squareSetToFieldArray(squareSet: SquareSet) {
    console.log(this.chessOps.board.get(8 * 0 + 3)); // white queen
    console.log(this.chessOps.board.get(8 * 7 + 4)); // black king

    console.log("Dests black king");
    console.log(this.chessOps.dests(8 * 7 + 4));
    console.log("Dests white queen pawn");
    console.log(this.chessOps.dests(8 * 1 + 3));
    for (let square of this.chessOps.dests(8 * 1 + 3).reversed()) {
      console.log((square >> 3) + " x " + (square & 7));
    }

    /*
    square = 8*rank + file;
    square = (rank << 3) + file;
    rank = square >> 3; // div 8
    file = square  & 7; // modulo 8
    */
  }

  private squareToRank(square: Square) {
    return square >> 3; // div 8
  }

  private squareToFile(square: Square) {
    return square & 7; // modulo 8
  }

  private fileRankToSquare(file: number, rank: number): Square {
    return 8 * rank + file;
  }

  selectPiece(pieceObject: Object3D) {
    console.log("Selecting piece");

    let square: Square = 8 * pieceObject.position.z + pieceObject.position.x;
    let piece = this.chessBoardFields.get(square)?.placedPiece;
    if (piece) {
      piece.select();
      this.selectedPiece = piece;
      this.highlightMoveOptions(square);
    } else {
      throw new Error("Piece not found on this field.");
    }
    console.log("Piece selected");
  }

  unSelectPiece() {
    this.selectedPiece?.unSelect();
    this.selectedPiece = undefined;
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

  rotateY(angle: number = 10) {
    this.chessBoardObject3D.rotateY(angle);
  }

  grow() {
    this.chessBoardObject3D.scale.x *= 1.1;
    this.chessBoardObject3D.scale.y *= 1.1;
    this.chessBoardObject3D.scale.z *= 1.1;
  }

  shrink() {
    this.chessBoardObject3D.scale.x *= 0.9;
    this.chessBoardObject3D.scale.y *= 0.9;
    this.chessBoardObject3D.scale.z *= 0.9;
  }

  place(matrix4: Matrix4) {
    this.chessBoardObject3D.position.setFromMatrixPosition(matrix4);
    this.chessBoardObject3D.visible = true;
  }

  moveSelectedPieceTo(file: number, rank: number) {
    if (this.selectedPiece) {
      let oldPosition = this.selectedPiece.getPosition().square;
      let newPosition = this.fileRankToSquare(file, rank);

      if (oldPosition) {
        this.chessOps.play({ from: oldPosition, to: newPosition });
        this.selectedPiece.setPosition({
          square: newPosition,
          file: file,
          rank: rank,
        });
      } else {
        throw Error("old position for move not found");
      }

      this.selectedPiece.unSelect();
      this.removeMoveOptions();
      this.readBoardAndPositionPieces();
    } else {
      throw new Error("No piece selected. Cannot move..");
    }
  }

  private readBoardAndPositionPieces() {
    this.pieceMap.reset();
    this.chessBoardFields.forEach((field, key) => {
      let coPiece = this.chessOps.board.get(key);
      if (coPiece?.role && coPiece.color) {
        let arPiece = this.pieceMap.setUnpositioned(
          coPiece?.role,
          coPiece?.color,
          {
            square: key,
            file: this.squareToFile(key),
            rank: this.squareToRank(key),
          }
        );
        field.placedPiece = arPiece;
      }
    });
    /*
    this.pieces = this.getAllStartingPieces();
    this.pieces.forEach((piece: ChessPiece) => {
      piece.getObject3D().then((object) => {
        //console.log(object);
        let position = piece.getPosition();
        if (position) {
          object.position.copy(this.getFieldPosition(position));
          let field = this.chessBoardFields.get(8*position.y +position.x);
          if(field) {
            //placedPiece = field.placedPiece;
          }
        }
        object.scale.set(0.25, 0.25, 0.25);
        this.chessBoardObject.add(object);
        this.loadedPieceObjects.push(object);
      });
    });*/
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
    for (let x = 0; x < 8; x++) {
      for (let y = 0; y < 8; y++) {
        let square: Square = 8 * y + x;
        let material;
        if ((x + y) % 2 === 1) {
          material = this.fieldDarkMaterial;
        } else {
          material = this.fieldLightMaterial;
        }
        const cube = new Mesh(this.fieldGeometry, material);
        this.chessBoardObject3D.add(cube);
        cube.position.set(x, 0, y);
        this.chessBoardFields.set(square, {
          object3D: cube,
          placedPiece: null,
        });
      }
    }
  }

  private updateFields() {
    console.log("updading all fields");
    this.chessBoardFields.forEach((field, key) => {
      let material;
      if (field.isOption) {
        console.log(field);
        material = this.fieldOptionMaterial;
      } else if ((this.squareToFile(key) + this.squareToRank(key)) % 2 === 1) {
        material = this.fieldDarkMaterial;
      } else {
        material = this.fieldLightMaterial;
      }
      (<Mesh>field.object3D).material = material;
    });
  }
}
