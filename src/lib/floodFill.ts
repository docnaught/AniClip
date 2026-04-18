export function floodFill(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  fillColorStr: string,
  width: number,
  height: number
): { dataUrl: string; bounds: { x: number; y: number; w: number; h: number } } | null {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Convert fill color string to RGBA
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = 1;
  tempCanvas.height = 1;
  const tCtx = tempCanvas.getContext('2d')!;
  tCtx.fillStyle = fillColorStr;
  tCtx.fillRect(0, 0, 1, 1);
  const fillPixels = tCtx.getImageData(0, 0, 1, 1).data;
  const fr = fillPixels[0], fg = fillPixels[1], fb = fillPixels[2], fa = fillPixels[3];

  const startPos = (Math.floor(startY) * width + Math.floor(startX)) * 4;
  const startR = data[startPos], startG = data[startPos + 1], startB = data[startPos + 2], startA = data[startPos + 3];

  // If the color is already the same, do nothing
  if (startR === fr && startG === fg && startB === fb && startA === fa) return null;

  const tolerance = 100;
  const matchStartColor = (pos: number) => {
    const r = data[pos], g = data[pos + 1], b = data[pos + 2], a = data[pos + 3];
    // Alpha blending differences can cause large RGB shifts, so weigh alpha
    const diff = Math.abs(r - startR) + Math.abs(g - startG) + Math.abs(b - startB) + Math.abs(a - startA);
    return diff <= tolerance;
  };

  const stack = [{ x: Math.floor(startX), y: Math.floor(startY) }];
  const visited = new Uint8Array(width * height);
  
  let minX = width, minY = height, maxX = 0, maxY = 0;

  while (stack.length > 0) {
    const { x, y } = stack.pop()!;
    let currentX = x;

    while (currentX >= 0 && matchStartColor((y * width + currentX) * 4)) {
      currentX--;
    }
    currentX++;

    let spanAbove = false;
    let spanBelow = false;

    while (currentX < width && matchStartColor((y * width + currentX) * 4)) {
      const vPos = y * width + currentX;

      if (visited[vPos]) {
        currentX++;
        continue;
      }
      visited[vPos] = 1;

      // Update bounds
      if (currentX < minX) minX = currentX;
      if (currentX > maxX) maxX = currentX;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      if (y > 0) {
        const topPos = ((y - 1) * width + currentX) * 4;
        if (!spanAbove && matchStartColor(topPos)) {
          stack.push({ x: currentX, y: y - 1 });
          spanAbove = true;
        } else if (spanAbove && !matchStartColor(topPos)) {
          spanAbove = false;
        }
      }

      if (y < height - 1) {
        const bottomPos = ((y + 1) * width + currentX) * 4;
        if (!spanBelow && matchStartColor(bottomPos)) {
          stack.push({ x: currentX, y: y + 1 });
          spanBelow = true;
        } else if (spanBelow && !matchStartColor(bottomPos)) {
          spanBelow = false;
        }
      }

      currentX++;
    }
  }

  if (minX > maxX || minY > maxY) return null;

  // Create overlay data and perform a 1-pixel dilation to fix antialiasing gaps
  const overlayData = new ImageData(width, height);
  const oData = overlayData.data;

  let dilatedMinX = minX - 1;
  let dilatedMaxX = maxX + 1;
  let dilatedMinY = minY - 1;
  let dilatedMaxY = maxY + 1;
  
  if (dilatedMinX < 0) dilatedMinX = 0;
  if (dilatedMaxX >= width) dilatedMaxX = width - 1;
  if (dilatedMinY < 0) dilatedMinY = 0;
  if (dilatedMaxY >= height) dilatedMaxY = height - 1;

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (visited[y * width + x]) {
        // Center
        let idx = (y * width + x) * 4;
        oData[idx] = fr; oData[idx+1] = fg; oData[idx+2] = fb; oData[idx+3] = fa;
        
        // Left
        if (x > 0) {
          idx = (y * width + (x - 1)) * 4;
          oData[idx] = fr; oData[idx+1] = fg; oData[idx+2] = fb; oData[idx+3] = fa;
        }
        // Right
        if (x < width - 1) {
          idx = (y * width + (x + 1)) * 4;
          oData[idx] = fr; oData[idx+1] = fg; oData[idx+2] = fb; oData[idx+3] = fa;
        }
        // Top
        if (y > 0) {
          idx = ((y - 1) * width + x) * 4;
          oData[idx] = fr; oData[idx+1] = fg; oData[idx+2] = fb; oData[idx+3] = fa;
        }
        // Bottom
        if (y < height - 1) {
          idx = ((y + 1) * width + x) * 4;
          oData[idx] = fr; oData[idx+1] = fg; oData[idx+2] = fb; oData[idx+3] = fa;
        }
        
        // Diagonals for better fullness
        if (x > 0 && y > 0) {
          idx = ((y - 1) * width + (x - 1)) * 4;
          oData[idx] = fr; oData[idx+1] = fg; oData[idx+2] = fb; oData[idx+3] = fa;
        }
        if (x < width - 1 && y < height - 1) {
          idx = ((y + 1) * width + (x + 1)) * 4;
          oData[idx] = fr; oData[idx+1] = fg; oData[idx+2] = fb; oData[idx+3] = fa;
        }
        if (x < width - 1 && y > 0) {
          idx = ((y - 1) * width + (x + 1)) * 4;
          oData[idx] = fr; oData[idx+1] = fg; oData[idx+2] = fb; oData[idx+3] = fa;
        }
        if (x > 0 && y < height - 1) {
          idx = ((y + 1) * width + (x - 1)) * 4;
          oData[idx] = fr; oData[idx+1] = fg; oData[idx+2] = fb; oData[idx+3] = fa;
        }
      }
    }
  }

  const cropW = dilatedMaxX - dilatedMinX + 1;
  const cropH = dilatedMaxY - dilatedMinY + 1;
  
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = cropW;
  finalCanvas.height = cropH;
  const fCtx = finalCanvas.getContext('2d')!;
  
  const fullCanvas = document.createElement('canvas');
  fullCanvas.width = width;
  fullCanvas.height = height;
  fullCanvas.getContext('2d')!.putImageData(overlayData, 0, 0);
  
  fCtx.drawImage(fullCanvas, dilatedMinX, dilatedMinY, cropW, cropH, 0, 0, cropW, cropH);

  return {
    dataUrl: finalCanvas.toDataURL('image/png'),
    bounds: { x: dilatedMinX, y: dilatedMinY, w: cropW, h: cropH }
  };
}
