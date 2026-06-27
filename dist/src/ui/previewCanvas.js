export function showImageData(canvas,img){canvas.width=img.width;canvas.height=img.height;canvas.getContext('2d').putImageData(img,0,0)}
