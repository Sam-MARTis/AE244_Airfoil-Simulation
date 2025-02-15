"use strict";
const canvas = document.getElementById("projectCanvas");
canvas.width = window.innerWidth * devicePixelRatio;
canvas.height = window.innerHeight * devicePixelRatio;
const ctx = canvas.getContext("2d");
// First better take input of airofil parameters
let airfoilType = 1; // 0 if custom, 1 if NACA 4 digit, 2 if NACA 5 digit
let M = 0.02;
let P = 0.4;
let span = 4;
let T = 0.12;
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
            const xc = x / span;
            if (x < P) {
                return (M / Math.pow(P, 2)) * (2 * P * xc - Math.pow(xc, 2));
            }
            else {
                return ((M / Math.pow(1 - P, 2)) * (1 - 2 * P + 2 * P * xc - Math.pow(xc, 2)));
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
    const dx = span / (pointCount - 1);
    ctx.beginPath();
    ctx.lineWidth = lwidth;
    ctx.strokeStyle = colour;
    ctx.moveTo(xStart, yStart);
    for (let i = 0; i < pointCount; i++) {
        const x = i * dx;
        const y = camberFunction(x);
        ctx.lineTo(xStart + x * scaleFactor, yStart + y * scaleFactor);
    }
    ctx.stroke();
};
