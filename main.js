"use strict";
const canvas = document.getElementById("projectCanvas");
canvas.width = window.innerWidth * devicePixelRatio;
canvas.height = window.innerHeight * devicePixelRatio;
const ctx = canvas.getContext("2d");
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
let Uinfty = 20;
let AOA = (0 * Math.PI) / 180;
let AnCache = [];
let airfoilCirculationCache = [];
const DEFAULT_LINE_THICKNESS = 1;
const CAMBER_COLOUR = "white";
const DRAW_SCALE_FACTOR = 200;
let xOffset = canvas.width / 2 - (chordLength * DRAW_SCALE_FACTOR) / 2;
let yOffset = canvas.height / 2 + (M * chordLength * DRAW_SCALE_FACTOR) / 2;
let thingToPlot = "camberLine";
const MMenu = document.getElementById("M");
const PMenu = document.getElementById("P");
const ChordLengthMenu = document.getElementById("ChordLength");
const submitBut = document.getElementById("Submit");
const plotOptionMenu = document.getElementById("plotOptions");
const AOAMenu = document.getElementById("AOA");
const UinftyMenu = document.getElementById("Uinfty");
// const circulationSubmitBut = document.getElementById("circulationSubmit") as HTMLElement;
const circulationOutput = document.getElementById("circulationOutput");
// const CLSubmitBut = document.getElementById("CLSubmit") as HTMLElement;
const CLOutput = document.getElementById("CLOutput");
let camberFunction = (x) => {
    return 0;
};
const initializeCamberFunction = () => {
    if (airfoilType == 0) {
        camberFunction = (x) => {
            //Todo: Implement custom camber function
            return 0;
        };
    }
    else if (airfoilType == 1) {
        camberFunction = (xVal) => {
            const xc = xVal / chordLength;
            if (xc < P) {
                return (chordLength * (M / Math.pow(P, 2)) * (2 * P * xc - Math.pow(xc, 2)));
            }
            else if (xc > P) {
                return (chordLength *
                    (M / Math.pow(1 - P, 2)) *
                    (1 - 2 * P + 2 * P * xc - Math.pow(xc, 2)));
            }
            else {
                return -100;
            }
        };
    }
    else if (airfoilType == 2) {
        camberFunction = (x) => {
            //Todo: Implement NACA 5 digit camber function
            return 0;
        };
    }
};
const camberSlope = (xVal) => {
    const dh = 0.0001;
    return (camberFunction(xVal + dh) - camberFunction(xVal - dh)) / (2 * dh);
};
// Math stuff here
const mapThetaToX = (theta) => {
    return (chordLength / 2) * (1 - Math.cos(theta));
};
const mapPointNumberToTheta = (i) => {
    const eta = i / (pointCount - 1);
    const theta = Math.acos(1 - 2 * eta);
    return theta;
};
const mapPointNumberToX = (i) => {
    return i * chordLength / (pointCount - 1);
};
const integrate = (functionToIntegrate, lowerLimit, upperLimit, dh = defaultIntegrationAccuracy) => {
    let x = lowerLimit;
    let result = 0;
    if (upperLimit < lowerLimit) {
        throw Error("Upper limit cannot be lower than the lower limit for integration");
    }
    while (x < upperLimit) {
        result += dh * functionToIntegrate(x);
        x += dh;
    }
    return result;
};
const getAn = (n) => {
    if (n < 0) {
        throw Error("Cannot find An for negative n");
    }
    const integrand = (theta) => {
        return camberSlope(mapThetaToX(theta)) * Math.cos(n * theta);
    };
    if (n == 0) {
        return AOA - (1 / Math.PI) * integrate(integrand, 0, Math.PI);
    }
    return (2 / Math.PI) * integrate(integrand, 0, Math.PI);
};
const cacheAn = (count) => {
    AnCache = [];
    for (let i = 0; i < count; i++) {
        AnCache.push(getAn(i));
    }
};
let circFunc = (theta) => {
    return 0;
};
const initializeCirculationFunction = () => {
    circFunc = (theta) => {
        if (theta < 0.001 * chordLength) {
            return 0; //Handles infinity
        }
        let circulation = 0;
        if (AnCache.length == 0) {
            throw Error("Unable to initialize circulation function due to 'An' cache being empty");
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
const getVelocityAtPoint = (spaceX, spaceY) => {
    if (airfoilCirculationCache.length == 0) {
        console.warn("airfoil circulation cache is empty. Can't calculate velocity");
        console.warn("Performing automated circulation calculation and caching");
        cacheAirfoilCirculation();
    }
    const vel = [Uinfty * Math.cos(AOA), Uinfty * Math.sin(AOA)];
    const dx = chordLength / pointCount;
    for (let i = 0; i < pointCount; i++) {
        const theta = mapPointNumberToTheta(i);
        const circulation = airfoilCirculationCache[i];
        const ds = Math.sqrt(camberSlope(mapThetaToX(theta)) ** 2 + 1) * dx;
        const delX = -(spaceX - mapPointNumberToX(i));
        const delY = spaceY - camberFunction(mapPointNumberToX(i));
        const rSquared = delX ** 2 + delY ** 2;
        vel[0] += circulation * ds * delY / (2 * Math.PI * rSquared);
        vel[1] += circulation * ds * delX / (2 * Math.PI * rSquared);
    }
    // console.log("Veclocity of point returns: ", vel)
    return vel;
};
const plotBoundCirculationOfCamber = () => {
    let circulation = 0;
    const dx = chordLength / pointCount;
    for (let i = 0; i < pointCount; i++) {
        const theta = mapPointNumberToTheta(i);
        const ds = Math.sqrt(camberSlope(mapThetaToX(theta)) ** 2 + 1) * dx;
        circulation += airfoilCirculationCache[i] * ds;
    }
    return circulation;
};
//Plotting stuff here
const mapSpaceToCanvas = (realX, realY) => {
    const canvasX = xOffset + realX * DRAW_SCALE_FACTOR;
    const canvasY = yOffset - realY * DRAW_SCALE_FACTOR;
    return [canvasX, canvasY];
};
const mapCanvasToSpace = (canvasX, canvasY, shouldFloor = false) => {
    const spaceX = (canvasX - xOffset) / DRAW_SCALE_FACTOR;
    const spaceY = (yOffset - canvasY) / DRAW_SCALE_FACTOR;
    if (shouldFloor) {
        return [Math.floor(spaceX), Math.floor(spaceY)];
    }
    return [spaceX, spaceY];
};
const plotAirfoilFunction = (functionIn, pointCount, lwidth, colour, title = "Camber Slope") => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const dx = chordLength / (pointCount - 1);
    ctx.beginPath();
    ctx.lineWidth = lwidth;
    ctx.strokeStyle = colour;
    ctx.moveTo(...mapSpaceToCanvas(0, functionIn(0)));
    const xVals = [];
    const yVals = [];
    for (let i = 0; i < pointCount; i++) {
        // ctx.beginPath()
        const x = i * dx;
        const y = functionIn(x);
        xVals.push(x);
        yVals.push(y);
        const dr = mapSpaceToCanvas(x, y);
        ctx.lineTo(dr[0], dr[1]);
        ctx.moveTo(dr[0], dr[1]);
        ctx.stroke();
    }
    ctx.stroke();
    const minX = Math.min(...xVals);
    const maxX = Math.max(...xVals);
    const minY = Math.min(...yVals);
    const maxY = Math.max(...yVals);
    ctx.beginPath();
    ctx.font = "20px Arial";
    ctx.strokeStyle = "white";
    ctx.lineWidth = 1;
    ctx.moveTo(...mapSpaceToCanvas(minX, minY));
    ctx.textAlign = "right";
    ctx.strokeText(`(${minX.toFixed(3)}, ${minY.toFixed(3)})`, ...mapSpaceToCanvas(minX, minY));
    ctx.lineTo(...mapSpaceToCanvas(minX, maxY));
    ctx.strokeText(`(${minX.toFixed(3)}, ${maxY.toFixed(3)})`, ...mapSpaceToCanvas(minX, maxY));
    ctx.moveTo(...mapSpaceToCanvas(minX, minY));
    ctx.lineTo(...mapSpaceToCanvas(maxX, minY));
    ctx.textAlign = "left";
    ctx.strokeText(`(${maxX.toFixed(3)}, ${minY.toFixed(3)})`, ...mapSpaceToCanvas(maxX, minY));
    // ctx.moveTo(...mapSpaceToCanvas((maxX+minX)/2, minY*1.5))
    ctx.textAlign = "center";
    const topY = mapCanvasToSpace(0, canvas.height / 4)[1];
    ctx.strokeText(title, ...mapSpaceToCanvas((maxX + minX) / 2, topY * 1));
    ctx.stroke();
};
const plotAirfoilFunctionImage = (functionIn, pointCount, lwidth, colour) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const dx = chordLength / (pointCount - 1);
    // ctx.beginPath();
    // ctx.lineWidth = lwidth;
    // ctx.strokeStyle = colour;
    // ctx.moveTo(...mapSpaceToCanvas(0, functionIn(0)));
    const xVals = [];
    const yVals = [];
    for (let i = 0; i < pointCount; i++) {
        // ctx.beginPath()
        const x = i * dx;
        const y = functionIn(x);
        xVals.push(x);
        yVals.push(y);
        // const dr = mapSpaceToCanvas(x, y);
        // ctx.lineTo(dr[0], dr[1]);
        // ctx.moveTo(dr[0], dr[1]);
        // ctx.stroke();
    }
    // ctx.stroke();
};
const plotCamberSlope = (pointCount, lwidth, colour) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const dx = chordLength / (pointCount - 1);
    ctx.beginPath();
    ctx.lineWidth = lwidth;
    ctx.strokeStyle = colour;
    ctx.moveTo(...mapSpaceToCanvas(0, camberSlope(0)));
    for (let i = 0; i < pointCount; i++) {
        // ctx.beginPath()
        const x = i * dx;
        const y = camberSlope(x);
        const dr = mapSpaceToCanvas(x, y);
        ctx.lineTo(dr[0], dr[1]);
        ctx.moveTo(dr[0], dr[1]);
        ctx.stroke();
    }
    ctx.stroke();
};
const getUserMenuInput = () => {
    M = parseFloat(MMenu.value) / 100;
    P = parseFloat(PMenu.value) / 10;
    AOA = (parseFloat(AOAMenu.value) * Math.PI) / 180;
    chordLength = parseFloat(ChordLengthMenu.value);
    Uinfty = parseFloat(UinftyMenu.value);
    xOffset = canvas.width / 2 - (chordLength * DRAW_SCALE_FACTOR) / 2;
    yOffset = canvas.height / 2 + (M * chordLength * DRAW_SCALE_FACTOR) / 2;
};
// initializeCamberFunction()
// plotCamberLine(100, 100, 500, 100, 1, "red")
const performPlotOperation = (pointCount) => {
    getUserMenuInput();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    console.log("Performing plot operation");
    switch (thingToPlot) {
        case "camberLine":
            initializeCamberFunction();
            plotAirfoilFunction(camberFunction, pointCount, DEFAULT_LINE_THICKNESS, CAMBER_COLOUR, "Camber Line");
            break;
        case "camberSlope":
            plotAirfoilFunction(camberSlope, pointCount, DEFAULT_LINE_THICKNESS, CAMBER_COLOUR, "Camber Slope");
            break;
    }
};
//Circulation calculation function
const calculateAndPlotCirculationViaLineIntegral = (dx = 0.01) => {
    let circValue = 0;
    const padding = 0.1;
    const SWCornerCoords = [-chordLength * 0.1 - padding, -chordLength * M * 3 - padding];
    // const NECornerCoords = mapCanvasToSpace(canvas.width*(1/4), canvas.height*(1/5), true)
    const NECornerCoords = [chordLength * 1.1 + padding, chordLength * M * 3 + padding];
    for (let i = SWCornerCoords[0]; i < NECornerCoords[0]; i += dx) {
        circValue += getVelocityAtPoint(i, NECornerCoords[1])[0] * dx - getVelocityAtPoint(i, SWCornerCoords[1])[0] * dx;
    }
    for (let j = SWCornerCoords[1]; j < NECornerCoords[1]; j += dx) {
        circValue += getVelocityAtPoint(SWCornerCoords[0], j)[1] * dx - getVelocityAtPoint(NECornerCoords[0], j)[1] * dx;
    }
    ctx.beginPath();
    ctx.strokeStyle = "green";
    ctx.moveTo(...mapSpaceToCanvas(SWCornerCoords[0], SWCornerCoords[1]));
    ctx.lineTo(...mapSpaceToCanvas(NECornerCoords[0], SWCornerCoords[1]));
    ctx.lineTo(...mapSpaceToCanvas(NECornerCoords[0], NECornerCoords[1]));
    ctx.lineTo(...mapSpaceToCanvas(SWCornerCoords[0], NECornerCoords[1]));
    ctx.lineTo(...mapSpaceToCanvas(SWCornerCoords[0], SWCornerCoords[1]));
    ctx.stroke();
    return circValue;
};
// console.log("Circulation value is: ", circValue)
// Vector field plotting
const plotVectorField = (spacing = 0.2) => {
    const SWCornerCoords = mapCanvasToSpace(0, canvas.height, false);
    const NECornerCoords = mapCanvasToSpace(canvas.width, 0, false);
    ctx.strokeStyle = "blue";
    ctx.lineWidth = 2;
    const dx = 20;
    const normalizingFactor = 2;
    const sensitivity = 1;
    const biasVal = 10;
    console.log('Drawing vector fields');
    console.log(SWCornerCoords, NECornerCoords);
    for (let i = SWCornerCoords[0]; i < NECornerCoords[0]; i += spacing) {
        for (let j = SWCornerCoords[1]; j < NECornerCoords[1]; j += spacing) {
            const vel = getVelocityAtPoint(i, j);
            const plottingVal = biasVal * (255 / (6.2830)) * Math.exp(-sensitivity * (((vel[0] / (Uinfty)) ** 2 + (vel[1] / (Uinfty)) ** 2)));
            console.log(plottingVal);
            ctx.strokeStyle = `rgb(${255 - plottingVal}, 0, ${plottingVal})`;
            const r = mapSpaceToCanvas(i, j);
            ctx.beginPath();
            ctx.moveTo(r[0], r[1]);
            ctx.lineTo(r[0] + (vel[0] / (Uinfty * normalizingFactor)) * dx, r[1] - (vel[1] / (Uinfty * normalizingFactor)) * dx);
            // console.log("Moving to ", r)
            ctx.stroke();
        }
    }
};
//Setup
const setup = (n = 20) => {
    performPlotOperation(pointCount);
    cacheAn(n);
    initializeCirculationFunction();
    cacheAirfoilCirculation();
    plotVectorField();
    // circulationSubmitButTask()
    calculationTasks();
};
//Event functions
const plotOptionMenuTask = () => {
    thingToPlot = plotOptionMenu.value;
    performPlotOperation(pointCount);
    if (thingToPlot == "camberLine") {
        // setup()
        plotVectorField();
    }
};
const circulationSubmitButTask = () => {
    const circVal = calculateAndPlotCirculationViaLineIntegral(0.001);
    circulationOutput.innerHTML = `Circulation value is: ${circVal}  &nbsp;  <br>Bound circulation value is: ${plotBoundCirculationOfCamber()}`;
};
const CLSubmitButTask = () => {
    const circVal = calculateAndPlotCirculationViaLineIntegral(0.001);
    const CLViaLift = circVal / (0.5 * (Uinfty ** 1) * chordLength);
    if (AnCache.length < 2) {
        cacheAn(15);
    }
    const CLViaAn = Math.PI * (2 * AnCache[0] + AnCache[1]);
    CLOutput.innerHTML = `Lift Coefficient via Kutta Joukowski: ${CLViaLift} &nbsp; <br> Lift Coefficient via An is: ${CLViaAn}`;
};
const calculationTasks = () => {
    const circVal = calculateAndPlotCirculationViaLineIntegral(0.001);
    circulationOutput.innerHTML = `Circulation value is: ${circVal}  &nbsp;  <br>Bound circulation value is: ${plotBoundCirculationOfCamber()}`;
    const CLViaLift = circVal / (0.5 * (Uinfty ** 1) * chordLength);
    if (AnCache.length < 2) {
        cacheAn(15);
    }
    const CLViaAn = Math.PI * (2 * AnCache[0] + AnCache[1]);
    CLOutput.innerHTML = `Lift Coefficient via Kutta Joukowski: ${CLViaLift} &nbsp; <br> Lift Coefficient via pi(2A0 + A1) is: ${CLViaAn}`;
};
//Event listeners
submitBut.addEventListener("click", (e) => {
    e.preventDefault();
    console.log("Submitted");
    performPlotOperation(pointCount);
    console.log(getAn(0));
    setup();
    //   circulationSubmitButTask()
    // CLSubmitButTask()
    // plotVectorField()
    // cacheAn(15)
    // console.log(AnCache)
});
plotOptionMenu.addEventListener("change", () => {
    plotOptionMenuTask();
});
document.addEventListener("click", (e) => {
    cacheAn(15);
    console.log(AnCache[0]);
    // console.log(airfoilCirculationCache);
    console.log(getVelocityAtPoint(...mapSpaceToCanvas(e.layerX, e.layerY)));
});
document.addEventListener("mousemove", (e) => {
    const [i, j] = mapCanvasToSpace(e.layerX, e.layerY);
    // const [vx, vy] = getVelocityAtPoint(i, j)
    // ctx.beginPath()
    // ctx.strokeStyle = "green"
    // ctx.moveTo(e.layerX, e.layerY)
    // ctx.lineTo(...mapSpaceToCanvas(i + 2*vx, j+2*vy))
    // ctx.stroke()
});
// circulationSubmitBut.addEventListener("click", (e:Event) => {
//   e.preventDefault()
//   circulationSubmitButTask()
// })
// CLSubmitBut.addEventListener("click", (e:Event) => {
//   e.preventDefault()
//   CLSubmitButTask()
// })
setup();
