"use strict";
/*
For you sanity, please only read this code if you are comfortable with TypeScript and HTML5 Canvas API




*/
/*

Initial canvas setup and global variables declaration. Canvas is an HTML5 API that allows us to make complexx animations on the screen.

*/
//Initial setup starts here
const canvas = document.getElementById("projectCanvas");
canvas.width = window.innerWidth * devicePixelRatio;
canvas.height = window.innerHeight * devicePixelRatio;
const ctx = canvas.getContext("2d");
const width = canvas.width;
const height = canvas.height;
const pointCount = 300; //Number of points to airfoil
const defaultIntegrationAccuracy = 0.0001; //Accuracy of integration for rectangluar integration
// Dummy Parameters. Not used. They just need to be initialized
let M = 0.02;
let P = 0.4;
let chordLength = 1;
let T = 0.12;
let Uinfty = 20;
let AOA = (0 * Math.PI) / 180;
let AnCache = [];
let airfoilCirculationCache = []; //Cache values to improve computation speed
let DRAW_SCALE_FACTOR = 200;
let plotAxes = true;
let xOffset = canvas.width / 2 - (chordLength * DRAW_SCALE_FACTOR) / 2;
let yOffset = canvas.height / 2 + (M * chordLength * DRAW_SCALE_FACTOR) / 2; //To center airfoil
let VFieldDensityMultiplier = 1; // Density of vector field
let VFieldLengthMultiplier = 1; // Length of vectors in field
let alphaVals = []; // For Cl vs Alpha comparision
let clVals = [];
const DEFAULT_LINE_THICKNESS = 1;
const CAMBER_COLOUR = "yellow"; //Just some colour choices
let thingToPlot = "camberLine"; //Default thing to plot is camber line
// Initial setup part 2 starts here
// Get the HTML elements for the UI
const MMenu = document.getElementById("M");
const PMenu = document.getElementById("P");
const ChordLengthMenu = document.getElementById("ChordLength");
const submitBut = document.getElementById("Submit");
const plotOptionMenu = document.getElementById("plotOptions");
const AOAMenu = document.getElementById("AOA");
const UinftyMenu = document.getElementById("Uinfty");
const DrawScaleMenu = document.getElementById("DrawScaleFactor");
const VFieldDensityMultiplierMenu = document.getElementById("VFieldDensityMultiplier");
const VFieldLengthMultiplierMenu = document.getElementById("VFieldLengthMultiplier");
const showAxesOption = document.getElementById("showAxes");
const showCirculationBoundaryOption = document.getElementById("showCirculationBoundary");
showCirculationBoundaryOption.checked = true;
const customFunctionMenu = document.getElementById("CustomFunctionInput");
customFunctionMenu.checked = false;
const CustomFunctionInputArea = document.getElementById("CustomFunctionInputArea");
CustomFunctionInputArea.disabled = true;
const ClVsAlphaBut = document.getElementById("ClVsAlpha");
const ClVsAlphaResult = document.getElementById("ClVsAlphaResult");
ClVsAlphaResult.disabled = true;
const circulationOutput = document.getElementById("circulationOutput");
const CLOutput = document.getElementById("CLOutput");
// Initial setup ends here
let camberFunction = (x) => {
    return 0;
}; //Initialize a blank camber function
// Functions to handle camber and slope
const initializeCamberFunction = () => {
    if (customFunctionMenu.checked) {
        console.log("Custom function is checked");
        try { //Try to parse the custom function
            const camberFunctionIntermediate = new Function("x", `return ${CustomFunctionInputArea.value};`);
            camberFunction = (xVal) => {
                const xc = xVal / chordLength;
                return xc * (1 - xc) * camberFunctionIntermediate(xc);
            };
            if (camberFunction(0) != 0 || camberFunction(chordLength) != 0) {
                throw Error("Invalid custom function. Must be 0 at xc = 0 and xc=1");
            }
        }
        catch (e) { //If the custom function is invalid, alert the user and log the error
            alert("Invalid custom function " + e);
            console.error(e);
        }
    }
    else { //If custom function is not checked, use NACA 4 digit series
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
};
const camberSlope = (xVal) => {
    const dh = 0.0001;
    return (camberFunction(xVal + dh) - camberFunction(xVal - dh)) / (2 * dh);
};
// Basic math functions for ease of development
const mapThetaToX = (theta) => {
    return (chordLength / 2) * (1 - Math.cos(theta));
};
const mapPointNumberToTheta = (i) => {
    const eta = i / (pointCount - 1);
    const theta = Math.acos(1 - 2 * eta);
    return theta;
};
const mapPointNumberToX = (i) => {
    return (i * chordLength) / (pointCount - 1);
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
// Simulation required functions
const getAn = (n, aoa = AOA) => {
    if (n < 0) {
        throw Error("Cannot find An for negative n");
    }
    const integrand = (theta) => {
        return camberSlope(mapThetaToX(theta)) * Math.cos(n * theta);
    };
    if (n == 0) {
        return aoa - (1 / Math.PI) * integrate(integrand, 0, Math.PI);
    }
    return (2 / Math.PI) * integrate(integrand, 0, Math.PI);
};
const cacheAn = (count) => {
    AnCache = [];
    for (let i = 0; i < count; i++) {
        AnCache.push(getAn(i, AOA)); // Store the An values in the cache
    }
};
const performClVsAlpha = (//Calculate Cl vs Alpha for a given range of alpha values
minAlphaDegrees = -3, maxAlphaDegrees = 12, dAlphaDegrees = 0.1) => {
    const A1 = getAn(1, AOA);
    const clVals = [];
    const alphaDegreesVals = [];
    for (let alpha = minAlphaDegrees; alpha < maxAlphaDegrees; alpha += dAlphaDegrees) {
        const alphaRad = (alpha * Math.PI) / 180; //Convert alpha to radians
        const cl = Math.PI * (A1 + 2 * getAn(0, alphaRad)); //Calculate Cl
        clVals.push(cl); //Store the calculated Cl value
        alphaDegreesVals.push(alpha); //Store the calculated alpha value
    }
    return [alphaDegreesVals, clVals]; //Return the calculated values
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
        if (AnCache.length == 0) { //If An cache is empty, throw an error
            throw Error("Unable to initialize circulation function due to 'An' cache being empty");
        }
        circulation += (AnCache[0] * (1 + Math.cos(theta))) / Math.sin(theta); //Calculate the circulation for n = 0
        for (let i = 1; i < AnCache.length; i++) {
            circulation += AnCache[i] * Math.sin(theta); //Calculate the circulation for n > 0
        }
        circulation = circulation * 2 * Uinfty; //Multiply by 2Uinfty to get the final circulation value
        return circulation;
    };
};
const cacheAirfoilCirculation = () => {
    airfoilCirculationCache = [];
    for (let i = 0; i < pointCount; i++) {
        airfoilCirculationCache.push(circFunc(mapPointNumberToTheta(i))); //Cache the circulation values for each point
    }
};
const getVelocityAtPoint = (//Calculate the velocity at a given point
spaceX, spaceY) => {
    if (airfoilCirculationCache.length == 0) {
        console.warn("airfoil circulation cache is empty. Can't calculate velocity");
        console.warn("Performing automated circulation calculation and caching");
        cacheAirfoilCirculation(); //If the cache is empty, calculate the circulation and cache it
    }
    const vel = [
        Uinfty * Math.cos(AOA),
        Uinfty * Math.sin(AOA),
    ]; //Initialize the free stream velocity
    const dx = chordLength / pointCount;
    for (let i = 0; i < pointCount; i++) {
        const theta = mapPointNumberToTheta(i);
        const circulation = airfoilCirculationCache[i];
        const ds = Math.sqrt(camberSlope(mapThetaToX(theta)) ** 2 + 1) * dx; //Calculate the airfoil filament length
        const delX = -(spaceX - mapPointNumberToX(i)); //Calculate the x and y distances from the point
        const delY = spaceY - camberFunction(mapPointNumberToX(i));
        const rSquared = delX ** 2 + delY ** 2; //Calculate the distance squared
        if (rSquared < 0.0001) {
            continue; //If the distance is too small, skip the calculation. Might be infitiy due to point being on the airfoil
        }
        vel[0] += (circulation * ds * delY) / (2 * Math.PI * rSquared); //Calculate the velocity at the point
        vel[1] += (circulation * ds * delX) / (2 * Math.PI * rSquared);
    }
    return vel;
};
const findBoundCirculationOfCamber = () => {
    let circulation = 0;
    const dx = chordLength / pointCount;
    for (let i = 0; i < pointCount; i++) {
        const theta = mapPointNumberToTheta(i); //Get the theta value for the point
        const ds = Math.sqrt(camberSlope(mapThetaToX(theta)) ** 2 + 1) * dx; //Calculate the airfoil filament length
        circulation += airfoilCirculationCache[i] * ds;
    }
    return circulation;
};
//Plotting stuff here
// Mapping functions to map space to canvas and vice versa
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
const plotAirfoilFunction = (//General plotting function that takes in and plots an arbitrary function
functionIn, // Any function that takes in a number and returns a number can be passed to be plotted
pointCount, lwidth, colour, title = "Camber Slope") => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const dx = chordLength / (pointCount - 1);
    ctx.beginPath();
    ctx.lineWidth = lwidth;
    ctx.strokeStyle = colour;
    ctx.moveTo(...mapSpaceToCanvas(0, functionIn(0)));
    const xVals = [];
    const yVals = [];
    for (let i = 0; i < pointCount; i++) {
        const x = i * dx;
        const y = functionIn(x);
        xVals.push(x);
        yVals.push(y);
        const dr = mapSpaceToCanvas(x, y);
        ctx.lineTo(dr[0], dr[1]); //Core plotting steps
        ctx.moveTo(dr[0], dr[1]);
        ctx.stroke();
    }
    ctx.stroke();
    if (!plotAxes) { //If axes are not to be plotted(based on checkbox), dont continue with next steps.
        return;
    }
    // I can't really explain this part in a concise way. It's just some code to plot the axes and the min and max values of the function. It comes from practice and experience and is not too complicated.
    // It's just some basic canvas API usage and simply looks intimidating but is not too complex. 
    const minX = Math.min(...xVals); //Btw: ... is the unpacking operator. Similar to python
    const maxX = Math.max(...xVals);
    const minY = Math.min(...yVals);
    const maxY = Math.max(...yVals);
    ctx.beginPath();
    ctx.font = "20px Arial";
    ctx.strokeStyle = "white";
    ctx.lineWidth = 1;
    ctx.moveTo(...mapSpaceToCanvas(minX, minY));
    ctx.textAlign = "right";
    ctx.strokeText(`(${minX.toFixed(3)}, ${minY.toFixed(3)})`, //Plot the axes and the min and max values with fixed decimal points
    ...mapSpaceToCanvas(minX, minY));
    ctx.lineTo(...mapSpaceToCanvas(minX, maxY));
    ctx.strokeText(`(${minX.toFixed(3)}, ${maxY.toFixed(3)})`, ...mapSpaceToCanvas(minX, maxY));
    ctx.moveTo(...mapSpaceToCanvas(minX, minY));
    ctx.lineTo(...mapSpaceToCanvas(maxX, minY));
    ctx.textAlign = "left";
    ctx.strokeText(`(${maxX.toFixed(3)}, ${minY.toFixed(3)})`, ...mapSpaceToCanvas(maxX, minY));
    ctx.textAlign = "center";
    const topY = mapCanvasToSpace(0, canvas.height / 4)[1];
    ctx.strokeText(title, ...mapSpaceToCanvas((maxX + minX) / 2, topY * 1));
    ctx.stroke();
};
const getUserMenuInput = () => {
    M = parseFloat(MMenu.value) / 100;
    P = parseFloat(PMenu.value) / 10;
    AOA = (parseFloat(AOAMenu.value) * Math.PI) / 180;
    chordLength = parseFloat(ChordLengthMenu.value);
    Uinfty = parseFloat(UinftyMenu.value);
    DRAW_SCALE_FACTOR = parseFloat(DrawScaleMenu.value);
    VFieldDensityMultiplier = parseFloat(VFieldDensityMultiplierMenu.value);
    VFieldLengthMultiplier = parseFloat(VFieldLengthMultiplierMenu.value);
    plotAxes = showAxesOption.checked;
    xOffset = canvas.width / 2 - (chordLength * DRAW_SCALE_FACTOR) / 2;
    yOffset = canvas.height / 2 + (M * chordLength * DRAW_SCALE_FACTOR) / 2;
};
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
const calculateAndPlotCirculationViaLineIntegral = (dx = 0.01) => {
    let circValue = 0;
    const padding = 0.1;
    const SWCornerCoords = [
        -chordLength * 0.1 - padding,
        -chordLength * M * 3 - padding,
    ];
    const NECornerCoords = [
        chordLength * 1.1 + padding,
        chordLength * M * 3 + padding,
    ];
    for (let i = SWCornerCoords[0]; i < NECornerCoords[0]; i += dx) {
        circValue +=
            getVelocityAtPoint(i, NECornerCoords[1])[0] * dx -
                getVelocityAtPoint(i, SWCornerCoords[1])[0] * dx;
    }
    for (let j = SWCornerCoords[1]; j < NECornerCoords[1]; j += dx) {
        circValue +=
            getVelocityAtPoint(SWCornerCoords[0], j)[1] * dx -
                getVelocityAtPoint(NECornerCoords[0], j)[1] * dx;
    }
    if (showCirculationBoundaryOption.checked) {
        ctx.beginPath();
        ctx.strokeStyle = "green";
        ctx.moveTo(...mapSpaceToCanvas(SWCornerCoords[0], SWCornerCoords[1]));
        ctx.lineTo(...mapSpaceToCanvas(NECornerCoords[0], SWCornerCoords[1]));
        ctx.lineTo(...mapSpaceToCanvas(NECornerCoords[0], NECornerCoords[1]));
        ctx.lineTo(...mapSpaceToCanvas(SWCornerCoords[0], NECornerCoords[1]));
        ctx.lineTo(...mapSpaceToCanvas(SWCornerCoords[0], SWCornerCoords[1]));
        ctx.stroke();
    }
    return circValue;
};
// Vector field plotting
const plotVectorField = (spacing = 0.2) => {
    const SWCornerCoords = mapCanvasToSpace(0, canvas.height, false);
    const NECornerCoords = mapCanvasToSpace(canvas.width, 0, false);
    ctx.strokeStyle = "blue";
    ctx.lineWidth = 2;
    const dx = 20;
    const normalizingFactor = 200 / (DRAW_SCALE_FACTOR * VFieldLengthMultiplier);
    const sensitivity = 1;
    const biasVal = 10;
    console.log("Drawing vector fields");
    for (let i = SWCornerCoords[0]; i < NECornerCoords[0]; i += spacing / VFieldDensityMultiplier) {
        for (let j = SWCornerCoords[1]; j < NECornerCoords[1]; j += spacing / VFieldDensityMultiplier) {
            const vel = getVelocityAtPoint(i, j);
            const plottingVal = biasVal *
                (255 / 6.283) *
                Math.exp(-sensitivity * ((vel[0] / Uinfty) ** 2 + (vel[1] / Uinfty) ** 2));
            ctx.strokeStyle = `rgb(${255 - plottingVal}, 0, ${plottingVal})`;
            const r = mapSpaceToCanvas(i, j);
            ctx.beginPath();
            ctx.moveTo(r[0], r[1]);
            ctx.lineTo(r[0] + (vel[0] / (Uinfty * normalizingFactor)) * dx, r[1] - (vel[1] / (Uinfty * normalizingFactor)) * dx);
            ctx.stroke();
        }
    }
};
//Setup
const setup = (n = 20) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    performPlotOperation(pointCount);
    cacheAn(n);
    initializeCirculationFunction();
    cacheAirfoilCirculation();
    plotVectorField();
    calculationTasks();
};
//Event functions
const plotOptionMenuTask = () => {
    thingToPlot = plotOptionMenu.value;
    performPlotOperation(pointCount);
    if (thingToPlot == "camberLine") {
        plotVectorField();
    }
};
const circulationSubmitButTask = () => {
    const circVal = calculateAndPlotCirculationViaLineIntegral(0.001);
    circulationOutput.innerHTML = `Circulation value is: ${circVal}  &nbsp;  <br>Bound circulation value is: ${findBoundCirculationOfCamber()}`;
};
const CLSubmitButTask = () => {
    const circVal = calculateAndPlotCirculationViaLineIntegral(0.001);
    const CLViaLift = circVal / (0.5 * Uinfty ** 1 * chordLength);
    if (AnCache.length < 2) {
        cacheAn(15);
    }
    const CLViaAn = Math.PI * (2 * AnCache[0] + AnCache[1]);
    CLOutput.innerHTML = `Lift Coefficient via Kutta Joukowski: ${CLViaLift} &nbsp; <br> Lift Coefficient via An is: ${CLViaAn}`;
};
const calculationTasks = () => {
    const circVal = calculateAndPlotCirculationViaLineIntegral(0.001);
    circulationOutput.innerHTML = `Circulation value is: ${circVal}  &nbsp;  <br>Bound circulation value is: ${findBoundCirculationOfCamber()}`;
    const CLViaLift = circVal / (0.5 * Uinfty ** 1 * chordLength);
    const CLViaAn = Math.PI * (2 * AnCache[0] + AnCache[1]);
    if (AnCache.length < 2) {
        cacheAn(15);
    }
    CLOutput.innerHTML = `Lift Coefficient via Kutta Joukowski: ${CLViaLift} &nbsp; <br> Lift Coefficient via pi(2A0 + A1) is: ${CLViaAn}`;
};
//Event listeners
submitBut.addEventListener("click", (e) => {
    e.preventDefault();
    console.log("Submitted");
    performPlotOperation(pointCount);
    console.log(getAn(0, AOA));
    setup();
});
customFunctionMenu.addEventListener("change", (e) => {
    e.preventDefault();
    if (customFunctionMenu.checked) {
        MMenu.disabled = true;
        PMenu.disabled = true;
        CustomFunctionInputArea.disabled = false;
    }
    else {
        MMenu.disabled = false;
        PMenu.disabled = false;
        CustomFunctionInputArea.disabled = true;
    }
});
ClVsAlphaBut.addEventListener("click", (e) => {
    e.preventDefault();
    const a = performClVsAlpha();
    alphaVals = a[0];
    clVals = a[1];
    ClVsAlphaResult.disabled = false;
});
ClVsAlphaResult.addEventListener("click", (e) => {
    e.preventDefault();
    if (ClVsAlphaResult.disabled) {
        return;
    }
    const csvContent = "data:text/csv;charset=utf-8," +
        alphaVals.map((e, i) => e + "," + clVals[i]).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "ClVsAlpha.csv");
    document.body.appendChild(link);
    link.click();
});
plotOptionMenu.addEventListener("change", () => {
    plotOptionMenuTask();
});
setup();
