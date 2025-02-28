"use strict";
const canvas = document.getElementById("projectCanvas");
canvas.width = window.innerWidth * devicePixelRatio;
canvas.height = window.innerHeight * devicePixelRatio;
const ctx = canvas.getContext("2d");
const width = canvas.width;
const height = canvas.height;
// First better take input of airofil parameters
let airfoilType = 1; // 0 if custom, 1 if NACA 4 digit, 2 if NACA 5 digit
let M = 0.04;
let P = 0.3;
let chordLength = 4;
let T = 0.12;
const MMenu = document.getElementById('M');
const PMenu = document.getElementById('P');
const ChordLengthMenu = document.getElementById('ChordLength');
const submitBut = document.getElementById("Submit");
const plotOptionMenu = document.getElementById("plotOptions");
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
        camberFunction = (x) => {
            const xc = x / chordLength;
            if (xc < P) {
                return chordLength * (M / Math.pow(P, 2)) * (2 * P * xc - Math.pow(xc, 2));
            }
            else if (xc > P) {
                return (chordLength * (M / Math.pow(1 - P, 2)) * (1 - 2 * P + 2 * P * xc - Math.pow(xc, 2)));
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
const integrate = (functionToIntegrate, lowerLimit, upperLimit, dh = 0.001) => {
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
//Plotting stuff here
const plotAirfoilFunction = (functionIn, xStart, yStart, pointCount, scaleFactor, lwidth, colour) => {
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
const plotCamberSlope = (xStart, yStart, pointCount, scaleFactor, lwidth, colour) => {
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
const performPlotOperation = (pointCount) => {
    getUserMenuInput();
    xOffset = canvas.width / 2 - chordLength * DRAW_SCALE_FACTOR / 2;
    yOffset = canvas.height / 2 + M * chordLength * DRAW_SCALE_FACTOR / 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    console.log("Performing plot operation");
    switch (thingToPlot) {
        case "camberLine":
            initializeCamberFunction();
            plotAirfoilFunction(camberFunction, xOffset, yOffset, pointCount, DRAW_SCALE_FACTOR, DEFAULT_LINE_THICKNESS, CAMBER_COLOUR);
            break;
        case "camberSlope":
            plotAirfoilFunction(camberSlope, xOffset, yOffset, pointCount, DRAW_SCALE_FACTOR, DEFAULT_LINE_THICKNESS, CAMBER_COLOUR);
            break;
    }
};
performPlotOperation(200);
submitBut.addEventListener("click", (e) => {
    e.preventDefault();
    console.log("Submitted");
    performPlotOperation(200);
});
plotOptionMenu.addEventListener("change", () => {
    // Update the PlotOption variable to the selected value
    thingToPlot = plotOptionMenu.value;
    performPlotOperation(200);
});
