declare module 'cdt2d' {
  interface Cdt2dOptions {
    delaunay?: boolean;
    interior?: boolean;
    exterior?: boolean;
    infinity?: boolean;
  }
  function cdt2d(
    points: Array<[number, number]>,
    edges?: Array<[number, number]>,
    options?: Cdt2dOptions
  ): Array<[number, number, number]>;
  export = cdt2d;
}
