const canvas = document.getElementById("projectCanvas") as HTMLCanvasElement;
canvas.width = window.innerWidth * devicePixelRatio;
canvas.height = window.innerHeight * devicePixelRatio;
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
const width = canvas.width;
const height = canvas.height;

// First better take input of airofil parameters
let airfoilType = 1; // 0 if custom, 1 if NACA 4 digit, 2 if NACA 5 digit
let M = 0.02;
let P = 0.4;
let chordLength = 1;
const pointCount = 500;
const defaultIntegrationAccuracy = 0.0001;

let T = 0.12;
const Uinfty = 1;
const AOA = (0 * Math.PI) / 180;

let AnCache: number[] = [];
let airfoilCirculationCache: number[] = [];
const MMenu = document.getElementById("M") as HTMLInputElement;
const PMenu = document.getElementById("P") as HTMLInputElement;
const ChordLengthMenu = document.getElementById(
  "ChordLength"
) as HTMLInputElement;
const submitBut = document.getElementById("Submit") as HTMLElement;
const plotOptionMenu = document.getElementById(
  "plotOptions"
) as HTMLSelectElement;

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
      const xc = x / chordLength;
      if (xc < P) {
        return (
          chordLength * (M / Math.pow(P, 2)) * (2 * P * xc - Math.pow(xc, 2))
        );
      } else if (xc > P) {
        return (
          chordLength *
          (M / Math.pow(1 - P, 2)) *
          (1 - 2 * P + 2 * P * xc - Math.pow(xc, 2))
        );
      } else {
        return -100;
      }
    };
  } else if (airfoilType == 2) {
    camberFunction = (x: number): number => {
      //Todo: Implement NACA 5 digit camber function
      return 0;
    };
  }
};

const camberSlope = (xVal: number): number => {
  const dh = 0.0001;
  return (camberFunction(xVal + dh) - camberFunction(xVal - dh)) / (2 * dh);
};

// Math stuff here

const mapThetaToX = (theta: number): number => {
  return (chordLength / 2) * (1 - Math.cos(theta));
};
const mapPointNumberToTheta = (i: number): number => {
  const eta = i / (pointCount - 1);
  const theta = Math.acos(1 - 2 * eta);
  return theta;
};
const integrate = (
  functionToIntegrate: (xIn: number) => number,
  lowerLimit: number,
  upperLimit: number,
  dh: number = defaultIntegrationAccuracy
): number => {
  let x = lowerLimit;
  let result = 0;
  if (upperLimit < lowerLimit) {
    throw Error(
      "Upper limit cannot be lower than the lower limit for integration"
    );
  }
  while (x < upperLimit) {
    result += dh * functionToIntegrate(x);
    x += dh;
  }
  return result;
};

const getAn = (n: number) => {
  if (n < 0) {
    throw Error("Cannot find An for negative n");
  }
  const integrand = (theta: number) => {
    return camberSlope(mapThetaToX(theta)) * Math.cos(n * theta);
  };
  if (n == 0) {
    return AOA - (1 / Math.PI) * integrate(integrand, 0, Math.PI);
  }
  return (2 / Math.PI) * integrate(integrand, 0, Math.PI);
};

const cacheAn = (count: number) => {
  AnCache = [];
  for (let i = 0; i < count; i++) {
    AnCache.push(getAn(i));
  }
};

let circFunc = (theta: number): number => {
  return 0;
};
const initializeCirculationFunction = () => {
  circFunc = (theta: number): number => {
    if(theta< 0.001*chordLength){
      return 0 //Handles infinity
    }
    let circulation = 0;
    if (AnCache.length == 0) {
      throw Error(
        "Unable to initialize circulation function due to 'An' cache being empty"
      );
    }
    circulation += (AnCache[0] * (1 + Math.cos(theta))) / Math.sin(theta);

    for (let i = 1; i < AnCache.length; i++) {
      circulation += AnCache[i] * Math.sin(theta);
    }

    circulation = circulation * 2 * Uinfty;
    return circulation;
  };
};
const cacheAirfoilCirculation = () => {
  airfoilCirculationCache = [];
  for (let i = 0; i < pointCount; i++) {
    airfoilCirculationCache.push(circFunc(mapPointNumberToTheta(i)));
  }
};

//Plotting stuff here

const plotAirfoilFunction = (
  functionIn: (xNum: number) => number,
  xStart: number,
  yStart: number,
  pointCount: number,
  scaleFactor: number,
  lwidth: number,
  colour: string
) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const dx = chordLength / (pointCount - 1);
  ctx.beginPath();
  ctx.lineWidth = lwidth;
  ctx.strokeStyle = colour;
  ctx.moveTo(xStart, yStart - functionIn(0) * scaleFactor);

  for (let i = 0; i < pointCount; i++) {
    // ctx.beginPath()
    const x = i * dx;
    const y = functionIn(x);
    ctx.lineTo(xStart + x * scaleFactor, yStart - y * scaleFactor);
    ctx.moveTo(xStart + x * scaleFactor, yStart - y * scaleFactor);
    ctx.stroke();
  }
  ctx.stroke();
};

const plotCamberSlope = (
  xStart: number,
  yStart: number,
  pointCount: number,
  scaleFactor: number,
  lwidth: number,
  colour: string
) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const dx = chordLength / (pointCount - 1);
  ctx.beginPath();
  ctx.lineWidth = lwidth;
  ctx.strokeStyle = colour;
  ctx.moveTo(xStart, yStart);

  for (let i = 0; i < pointCount; i++) {
    // ctx.beginPath()
    const x = i * dx;
    const y = camberSlope(x);
    ctx.lineTo(xStart + x * scaleFactor, yStart - y * scaleFactor);
    ctx.moveTo(xStart + x * scaleFactor, yStart - y * scaleFactor);
    ctx.stroke();
  }
  ctx.stroke();
};

const getUserMenuInput = () => {
  M = parseFloat(MMenu.value) / 100;
  P = parseFloat(PMenu.value) / 10;
  chordLength = parseFloat(ChordLengthMenu.value);
};
// initializeCamberFunction()
// plotCamberLine(100, 100, 500, 100, 1, "red")
let xOffset = width / 2;
let yOffset = height / 2;
const DEFAULT_LINE_THICKNESS = 1;
const CAMBER_COLOUR = "red";
const DRAW_SCALE_FACTOR = 100;

let thingToPlot = "camberLine";

const performPlotOperation = (pointCount: number) => {
  getUserMenuInput();
  xOffset = canvas.width / 2 - (chordLength * DRAW_SCALE_FACTOR) / 2;
  yOffset = canvas.height / 2 + (M * chordLength * DRAW_SCALE_FACTOR) / 2;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  console.log("Performing plot operation");

  switch (thingToPlot) {
    case "camberLine":
      initializeCamberFunction();
      plotAirfoilFunction(
        camberFunction,
        xOffset,
        yOffset,
        pointCount,
        DRAW_SCALE_FACTOR,
        DEFAULT_LINE_THICKNESS,
        CAMBER_COLOUR
      );
      break;
    case "camberSlope":
      plotAirfoilFunction(
        camberSlope,
        xOffset,
        yOffset,
        pointCount,
        DRAW_SCALE_FACTOR,
        DEFAULT_LINE_THICKNESS,
        CAMBER_COLOUR
      );

      break;
  }
};


const setup = (n: number = 10) => {
performPlotOperation(pointCount);
cacheAn(n);
initializeCirculationFunction();
cacheAirfoilCirculation();
}

setup()
submitBut.addEventListener("click", (e: Event) => {
  e.preventDefault();
  console.log("Submitted");
  performPlotOperation(pointCount);
  console.log(getAn(0));
  // cacheAn(15)
  // console.log(AnCache)
});

plotOptionMenu.addEventListener("change", () => {
  // Update the PlotOption variable to the selected value
  thingToPlot = plotOptionMenu.value;
  performPlotOperation(pointCount);
});
document.addEventListener("click", (e: Event) => {
  cacheAn(15);
  console.log(AnCache);
  console.log(airfoilCirculationCache);
});
