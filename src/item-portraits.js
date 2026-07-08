export function createItemPortrait(item) {
  const portrait = document.createElement("canvas");
  portrait.width = 96;
  portrait.height = 96;
  const context = portrait.getContext("2d");
  const color = item.spec?.swatch ?? item.swatch ?? "#8aa0ad";
  const shade = shadeHex(color, -36);
  const light = shadeHex(color, 34);

  context.clearRect(0, 0, portrait.width, portrait.height);
  context.save();
  context.translate(48, 50);
  context.rotate(-0.12);
  context.shadowColor = "rgba(0, 0, 0, 0.22)";
  context.shadowBlur = 8;
  context.shadowOffsetY = 6;

  const id = item.id ?? "";
  if (id.includes("bottle")) {
    drawBottlePortrait(context, color, shade, light);
  } else if (id.includes("tank") || id.includes("canister")) {
    drawTankPortrait(context, color, shade, light);
  } else if (id.includes("crate")) {
    drawCratePortrait(context, color, shade, light);
  } else if (id.includes("helmet")) {
    drawHelmetPortrait(context, color, shade, light);
  } else if (id.includes("battery")) {
    drawBatteryPortrait(context, color, shade, light);
  } else if (id.includes("ration")) {
    drawRationPortrait(context, color, shade, light);
  } else {
    drawMachinePortrait(context, color, shade, light);
  }

  context.restore();
  return portrait.toDataURL("image/png");
}

function drawBottlePortrait(context, color, shade, light) {
  context.fillStyle = light;
  roundRect(context, -10, -36, 20, 9, 3);
  context.fill();
  context.fillStyle = color;
  roundRect(context, -13, -28, 26, 52, 9);
  context.fill();
  context.fillStyle = "rgba(255,255,255,0.46)";
  roundRect(context, -7, -20, 5, 35, 3);
  context.fill();
  context.fillStyle = shade;
  roundRect(context, 5, -21, 5, 38, 3);
  context.fill();
}

function drawTankPortrait(context, color, shade, light) {
  context.fillStyle = shade;
  roundRect(context, -20, -38, 40, 76, 14);
  context.fill();
  context.fillStyle = color;
  roundRect(context, -17, -35, 34, 70, 12);
  context.fill();
  context.fillStyle = light;
  context.fillRect(-15, -24, 30, 7);
  context.fillRect(-15, 17, 30, 7);
  context.fillStyle = "rgba(255,255,255,0.36)";
  roundRect(context, -11, -27, 7, 48, 4);
  context.fill();
}

function drawCratePortrait(context, color, shade, light) {
  context.fillStyle = color;
  roundRect(context, -34, -26, 68, 52, 6);
  context.fill();
  context.strokeStyle = shade;
  context.lineWidth = 7;
  context.strokeRect(-29, -21, 58, 42);
  context.beginPath();
  context.moveTo(-28, -20);
  context.lineTo(28, 20);
  context.moveTo(28, -20);
  context.lineTo(-28, 20);
  context.stroke();
  context.fillStyle = light;
  context.fillRect(-25, -18, 50, 4);
}

function drawHelmetPortrait(context, color, shade, light) {
  context.fillStyle = color;
  context.beginPath();
  context.arc(0, -2, 31, Math.PI * 0.12, Math.PI * 1.88);
  context.closePath();
  context.fill();
  context.fillStyle = shade;
  roundRect(context, -25, -9, 50, 24, 10);
  context.fill();
  context.fillStyle = "rgba(148, 223, 255, 0.78)";
  roundRect(context, -17, -12, 34, 20, 8);
  context.fill();
  context.fillStyle = light;
  context.fillRect(-24, 18, 48, 6);
}

function drawBatteryPortrait(context, color, shade, light) {
  context.fillStyle = shade;
  roundRect(context, -31, -22, 62, 44, 6);
  context.fill();
  context.fillStyle = color;
  roundRect(context, -27, -18, 54, 36, 5);
  context.fill();
  context.fillStyle = light;
  context.fillRect(-18, -9, 27, 18);
  context.fillStyle = "#10151a";
  context.fillRect(12, -6, 5, 12);
  context.fillStyle = shade;
  context.fillRect(31, -9, 7, 18);
}

function drawRationPortrait(context, color, shade, light) {
  context.fillStyle = color;
  roundRect(context, -28, -24, 56, 48, 11);
  context.fill();
  context.strokeStyle = shade;
  context.lineWidth = 4;
  context.strokeRect(-20, -16, 40, 32);
  context.fillStyle = light;
  context.fillRect(-15, -8, 30, 5);
  context.fillRect(-15, 4, 20, 4);
}

function drawMachinePortrait(context, color, shade, light) {
  context.fillStyle = shade;
  roundRect(context, -33, -28, 66, 56, 7);
  context.fill();
  context.fillStyle = color;
  roundRect(context, -27, -22, 54, 44, 5);
  context.fill();
  context.fillStyle = light;
  context.fillRect(-19, -14, 38, 9);
  context.fillStyle = "rgba(16,21,26,0.32)";
  context.fillRect(-17, 2, 34, 12);
}

function shadeHex(hex, amount) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(
    normalized.length === 3
      ? normalized
          .split("")
          .map((character) => character + character)
          .join("")
      : normalized,
    16,
  );
  const channel = (shift) =>
    Math.max(0, Math.min(255, ((value >> shift) & 255) + amount));
  return `rgb(${channel(16)}, ${channel(8)}, ${channel(0)})`;
}

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}
