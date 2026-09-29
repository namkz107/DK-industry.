const fs = require('fs');
const path = require('path');

const fail = message => { throw Object.assign(new Error(message), { status: 400 }); };

function matchesSignature(extension, buffer) {
  const ascii = buffer.toString('latin1');
  const upper = ascii.toUpperCase();
  if (extension === '.pdf') return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
  if (extension === '.png') return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (['.jpg', '.jpeg'].includes(extension)) return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (extension === '.zip') return buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && [0x03, 0x05, 0x07].includes(buffer[2]) && [0x04, 0x06, 0x08].includes(buffer[3]);
  if (extension === '.dwg') return /^AC10\d{2}/.test(buffer.subarray(0, 6).toString('ascii'));
  if (['.step', '.stp'].includes(extension)) return upper.includes('ISO-10303-21');
  if (['.iges', '.igs'].includes(extension)) return upper.includes('IGES') || ascii.split(/\r?\n/).slice(0, 10).some(line => line.length >= 73 && line[72] === 'S');
  if (extension === '.dxf') return /(?:^|\r?\n)\s*0\s*\r?\n\s*SECTION/i.test(ascii) || upper.includes('AUTOCAD BINARY DXF');
  return false;
}

async function validateUploadedFiles(files = []) {
  for (const file of files) {
    const handle = await fs.promises.open(file.path, 'r');
    try {
      const buffer = Buffer.alloc(8192);
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
      if (!matchesSignature(path.extname(file.originalname).toLowerCase(), buffer.subarray(0, bytesRead))) {
        fail(`Nội dung tệp “${path.basename(file.originalname)}” không đúng định dạng đã khai báo`);
      }
    } finally {
      await handle.close();
    }
  }
}

module.exports = { validateUploadedFiles };
