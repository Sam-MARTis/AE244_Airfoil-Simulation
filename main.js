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
const plotCamberLine = (xStart, yStart, pointCount, scaleFactor, lwidth, colour) => {
    const dx = chordLength / (pointCount - 1);
    ctx.beginPath();
    ctx.lineWidth = lwidth;
    ctx.strokeStyle = colour;
    ctx.moveTo(xStart, yStart);
    for (let i = 0; i < pointCount; i++) {
        // ctx.beginPath()
        const x = i * dx;
        const y = camberFunction(x);
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
const performPlotOperation = (pointCount) => {
    getUserMenuInput();
    xOffset = canvas.width / 2 - chordLength * DRAW_SCALE_FACTOR / 2;
    yOffset = canvas.height / 2 + M * chordLength * DRAW_SCALE_FACTOR / 2;
    initializeCamberFunction();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    plotCamberLine(xOffset, yOffset, pointCount, DRAW_SCALE_FACTOR, DEFAULT_LINE_THICKNESS, CAMBER_COLOUR);
};
performPlotOperation(200);
submitBut.addEventListener("click", (e) => {
    e.preventDefault();
    console.log("Submitted");
    performPlotOperation(200);
});
