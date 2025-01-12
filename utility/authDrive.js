
const { google } = require('googleapis');
const sharp = require('sharp');
const { PassThrough } = require('stream');

const private_key =  process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')

const auth = new google.auth.GoogleAuth({
  credentials: {
    type: 'service_account',
    project_id: process.env.GOOGLE_PROJECT_ID,
    private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
    private_key: private_key,
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_CLIENT_ID,
    auth_uri: process.env.GOOGLE_AUTH_URI,
    token_uri: process.env.GOOGLE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_X509_CERT_URI,
    client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URI,
    universe_domain: 'googleapis.com',
  },
  scopes: ['https://www.googleapis.com/auth/drive'],
});




async function uploadFile(auth, fileBuffer, fileName) {
  try {
    const drive = google.drive({ version: 'v3', auth });

    // Validasi buffer gambar
    if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
      throw new Error('Invalid file buffer');
    }

    const mimeType = getMimeType(fileName);
    if (!mimeType) {
      throw new Error(`Unable to determine MIME type for file ${fileName}`);
    }

    // Mengonversi gambar ke format WebP
    const webpBuffer = await sharp(fileBuffer)
      .webp({ quality: 80 })
      .toBuffer()
      .catch(err => {
        throw new Error(`Error processing image with sharp: ${err.message}`);
      });

    const fileMetadata = {
      name: fileName.replace(/\.(jpg|jpeg|png)$/i, '.webp'),
      mimeType: 'image/webp',
      parents: [process.env.GOOGLE_DRIVE_ID], // Consider making this dynamic or configurable
    };

    const stream = new PassThrough();
    stream.end(webpBuffer);

    const media = {
      mimeType: 'image/webp',
      body: stream,
    };

    const file = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id',
    });

    await drive.permissions.create({
      fileId: file.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    return file.data.id;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

// Fungsi untuk menentukan MIME type berdasarkan ekstensi
function getMimeType(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    default:
      throw new Error('Unsupported file type');
  }
}

async function deleteFile(auth, fileId) {
const drive = google.drive({ version: 'v3', auth });
await drive.files.delete({
  fileId: fileId,
});
}

function getCurrentDate() {
const now = new Date();
const day = String(now.getDate()).padStart(2, '0'); 
const month = String(now.getMonth() + 1).padStart(2, '0'); 
const year = now.getFullYear();
return `${day}-${month}-${year}`; 
}




  module.exports = {
    auth,
    uploadFile,
    deleteFile,
    getCurrentDate
  }