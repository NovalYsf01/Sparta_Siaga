/**
 * SPARTA SIAGA — Pure Native ZIP Archive Creator
 * 
 * Standard PKZip 2.0 format implementation without external dependencies.
 * Compatible with Windows Explorer, macOS Archive Utility, Linux unzip, and standard unzippers.
 */

import zlib from "node:zlib";

export interface ZipFileInput {
  filename: string;
  buffer: Buffer;
  date?: Date;
}

/**
 * Creates a standard .zip file buffer from a list of files.
 */
export function createZipArchive(files: ZipFileInput[]): Buffer {
  const localHeaders: Buffer[] = [];
  const centralHeaders: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    // Sanitize filename to forward slashes and valid characters
    const cleanName = file.filename.replace(/\\/g, "/").replace(/^\/+/, "");
    const nameBuf = Buffer.from(cleanName, "utf-8");
    const dataBuf = file.buffer;
    const crc = zlib.crc32(dataBuf);
    const uncompressedSize = dataBuf.length;
    const compressedSize = uncompressedSize; // Method 0 (STORE)
    const method = 0;

    // Convert Date to MS-DOS time and date
    const d = file.date || new Date();
    const dosTime =
      ((d.getHours() & 0x1f) << 11) |
      ((d.getMinutes() & 0x3f) << 5) |
      ((Math.floor(d.getSeconds() / 2)) & 0x1f);
    const dosDate =
      (((d.getFullYear() - 1980) & 0x7f) << 9) |
      (((d.getMonth() + 1) & 0xf) << 5) |
      (d.getDate() & 0x1f);

    // 1. Local File Header
    const lh = Buffer.alloc(30 + nameBuf.length);
    lh.writeUInt32LE(0x04034b50, 0);       // local file header signature
    lh.writeUInt16LE(20, 4);               // version needed to extract (2.0)
    lh.writeUInt16LE(0x0800, 6);           // flags: bit 11 = UTF-8 filename
    lh.writeUInt16LE(method, 8);           // compression method (0 = STORE)
    lh.writeUInt16LE(dosTime, 10);         // last mod file time
    lh.writeUInt16LE(dosDate, 12);         // last mod file date
    lh.writeUInt32LE(crc, 14);             // crc-32
    lh.writeUInt32LE(compressedSize, 18);   // compressed size
    lh.writeUInt32LE(uncompressedSize, 22); // uncompressed size
    lh.writeUInt16LE(nameBuf.length, 26);  // file name length
    lh.writeUInt16LE(0, 28);               // extra field length
    nameBuf.copy(lh, 30);

    localHeaders.push(lh, dataBuf);

    // 2. Central Directory Header
    const ch = Buffer.alloc(46 + nameBuf.length);
    ch.writeUInt32LE(0x02014b50, 0);       // central file header signature
    ch.writeUInt16LE(20, 4);               // version made by (2.0)
    ch.writeUInt16LE(20, 6);               // version needed to extract (2.0)
    ch.writeUInt16LE(0x0800, 8);           // flags: bit 11 = UTF-8 filename
    ch.writeUInt16LE(method, 10);          // compression method
    ch.writeUInt16LE(dosTime, 12);         // last mod file time
    ch.writeUInt16LE(dosDate, 14);         // last mod file date
    ch.writeUInt32LE(crc, 16);             // crc-32
    ch.writeUInt32LE(compressedSize, 20);   // compressed size
    ch.writeUInt32LE(uncompressedSize, 24); // uncompressed size
    ch.writeUInt16LE(nameBuf.length, 28);  // file name length
    ch.writeUInt16LE(0, 30);               // extra field length
    ch.writeUInt16LE(0, 32);               // file comment length
    ch.writeUInt16LE(0, 34);               // disk number start
    ch.writeUInt16LE(0, 36);               // internal file attributes
    ch.writeUInt32LE(0x81a40000, 38);      // external file attributes (standard file 0644)
    ch.writeUInt32LE(offset, 42);          // relative offset of local header
    nameBuf.copy(ch, 46);

    centralHeaders.push(ch);
    offset += lh.length + dataBuf.length;
  }

  const centralDirOffset = offset;
  let centralDirSize = 0;
  for (const ch of centralHeaders) {
    centralDirSize += ch.length;
  }

  // 3. End of Central Directory Record (EOCD)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);       // end of central dir signature
  eocd.writeUInt16LE(0, 4);                // number of this disk
  eocd.writeUInt16LE(0, 6);                // number of the disk with the start of the central directory
  eocd.writeUInt16LE(files.length, 8);     // total number of entries in the central directory on this disk
  eocd.writeUInt16LE(files.length, 10);    // total number of entries in the central directory
  eocd.writeUInt32LE(centralDirSize, 12);  // size of the central directory
  eocd.writeUInt32LE(centralDirOffset, 16);// offset of start of central directory
  eocd.writeUInt16LE(0, 20);               // .ZIP file comment length

  return Buffer.concat([...localHeaders, ...centralHeaders, eocd]);
}
