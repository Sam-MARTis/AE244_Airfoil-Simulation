const canvas = document.getElementById("projectCanvas") as HTMLCanvasElement;
canvas.width = window.innerWidth * devicePixelRatio;
canvas.height = window.innerHeight * devicePixelRatio;
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

// First better take input of airofil parameters
let airfoilType = 1; // 0 if custom, 1 if NACA 4 digit, 2 if NACA 5 digit
let M = 0.02;
let P = 0.4;
let span = 4;

let T = 0.12;

let camberFunction = (x: number): number => {
  return 0;
};

const initializeCamberFunction = () => {
  if (airfoilType == 0) {
    camberFunction = (x: number) => {
      //Todo: Implement custom camber function
      return 0;
    };
  } else if (airfoilType == 1) {


    camberFunction = (x: number): number => {
      const xc = x / span;
      if (x < P) {
        return (M / Math.pow(P, 2)) * (2 * P * xc - Math.pow(xc, 2));
      } else {
        return (
          (M / Math.pow(1 - P, 2)) * (1 - 2 * P + 2 * P * xc - Math.pow(xc, 2))
        );
      }
    };



  } else if (airfoilType == 2) {
    camberFunction = (x: number): number => {
      //Todo: Implement NACA 5 digit camber function
      return 0;
    };
  }
};
