/**
 * This program is a personal rewrite
 * of the Eloquent JavaScript textbook example
 * on objects(Matrix).
 * Instead of a single array to hold its contents,
 * I used an array of arrays. I used the
 * MatrixIterator class to make it iterable,
 * and the code was enough for my implementation.
 */

class MatrixIterator {
  constructor(matrix) {
    this.x = 0;
    this.y = 0;
    this.matrix = matrix;
  }

  next() {
    if (this.y === this.matrix.height) return { done: true };

    let value = {
      x: this.x,
      y: this.y,
      value: this.matrix.get(this.x, this.y),
    };
    this.x++;

    if (this.x === this.matrix.width) {
      this.y++;
      this.x = 0;
    }

    return { value, done: false };
  }
}

class Matrix {
  constructor(height = 1, width = 1, element = () => 0) {
    this.height = height;
    this.width = width;
    this.content = [];

    for (let y = 0; y < height; y++) {
      this.content[y] = [];
      for (let x = 0; x < width; x++) {
        this.content[y][x] = element(x, y);
      }
    }
  }

  get(x, y) {
    // Only get value if it is within bounds.
    if (!(x >= this.width || y >= this.height)) {
      return this.content[y][x];
    }

    return null;
  }

  set(x, y, value) {
    // Only set if value is within bounds.
    if (!(x >= this.width || y >= this.height)) {
      this.content[y][x] = value;
    }
  }

  add(matrix) {
    if (this.height === matrix.height && this.width === matrix.width) {
      return new Matrix(
        this.height,
        this.width,
        (x, y) => this.get(x, y) + matrix.get(x, y)
      );
    }

    return this;
  }

  multiply(matrix) {
    // Scalar multiplication.
    if (typeof matrix === "number") {
      return new Matrix(
        this.height,
        this.width,
        (x, y) => Math.floor(matrix) * this.get(x, y)
      );
    }

    // Matrix multiplication.
    else if (this.width === matrix.height) {
      const condition = this.width;
      return new Matrix(this.height, matrix.width, (x, y) => {
        let element = 0;
        for (let a = 0; a < condition; a++) {
          element += this.get(a, y) * matrix.get(x, a);
        }

        return element;
      });
    } else if (this.height === matrix.width) {
      return matrix.multiply(this);
    }

    return null;
  }

  [Symbol.iterator]() {
    return new MatrixIterator(this);
  }

  isEquals(matrix) {
    return this.content === matrix.content;
  }

  get isSquare() {
    return this.height === this.width;
  }
}

class SquareMatrix extends Matrix {
  constructor(rowColumn = 2, func) {
    super(rowColumn, rowColumn, func);
  }

  static determinant(matrix) {
    if (matrix.isSquare() && matrix.height === 2) {
      return (
        matrix.get(0, 0) * matrix.get(1, 1) -
        matrix.get(1, 0) * matrix.get(0, 1)
      );
    }

    return null;
  }

  get square() {
    return super.multiply(this);
  }
}

let matrix = new SquareMatrix(3, (x, y) => x * x + y * y);
console.log(matrix.square);
