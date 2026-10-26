// Phone photos are resized before uploading to stay below hosted request limits.
export async function preparePhoto(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) throw Error('Choose a JPEG, PNG or WebP photo.');
  if (file.size<=2*1024*1024) return file;
  const bitmap=await createImageBitmap(file);
  try {
    const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement('canvas'); canvas.width=Math.round(bitmap.width*scale); canvas.height=Math.round(bitmap.height*scale);
    const context=canvas.getContext('2d'); if (!context) throw Error('This photo could not be prepared.');
    context.fillStyle='#fff'; context.fillRect(0,0,canvas.width,canvas.height); context.drawImage(bitmap,0,0,canvas.width,canvas.height);
    const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('This photo could not be prepared.')),'image/jpeg',0.85));
    if (blob.size>3*1024*1024) throw Error('Choose a smaller photo (under 3 MB).');
    return new File([blob],'photo.jpg',{type:'image/jpeg'});
  } finally { bitmap.close(); }
}
