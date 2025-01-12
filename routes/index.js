var express = require('express');
const { Redis } = require('@upstash/redis')
const multer = require('multer');
const { auth,uploadFile,deleteFile, getCurrentDate} = require('../utility/authDrive')
const { authUser } = require('../utility/authUser')
var router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

const redis = new Redis({
  url: process.env.REDIS_URL,
  token: process.env.REDIS_TOKEN,
  connectTimeout: 10000, 
  enableReadyCheck: true,
})
/* POST home landing page */
router.post('/', authUser,upload.fields([
  { name: 'imageLogo', maxCount: 1 },
  { name: 'imageHeader', maxCount: 1 }, // Perbaiki nama dari 'imageHeder' menjadi 'imageHeader'
  { name: 'productImage', maxCount: 20 },
  { name: 'logoBank', maxCount: 5 },
  { name: 'service2image', maxCount: 1 }
]), async (req, res) => {
  try {
    const data = req.body; // Data dari form
    let imageLogoId = '';
    let service2ImageId = '';
    let imageHeaderId = ''; // Perbaiki nama dari 'imageHeder' menjadi 'imageHeader'
    let productImgId = [];
    let logoBankId = [];

    // Validasi file yang di-upload
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ message: 'File tidak ada yang di-upload' });
    }

    // Validasi data dari body
    if (!data || Object.keys(data).length === 0) {
      return res.status(400).json({ message: 'Data tidak ada' });
    }

    // Proses setiap file yang di-upload
    const uploadFileWithValidation = async (file) => {
      if (!file || !file.buffer || file.buffer.length === 0) {
        throw new Error('File buffer is empty or invalid');
      }
      return await uploadFile(auth, file.buffer, file.originalname);
    };

    if (req.files['imageLogo']) {
      const file = req.files['imageLogo'][0]; // Ambil file pertama
      imageLogoId = await uploadFileWithValidation(file);
    }

    if (req.files['imageHeader']) { // Perbaiki nama dari 'imageHeder' menjadi 'imageHeader'
      const file = req.files['imageHeader'][0]; // Ambil file pertama
      imageHeaderId = await uploadFileWithValidation(file);
    }

    if (req.files['productImage']) {
      const productImagePromises = req.files['productImage'].map(file => uploadFileWithValidation(file));
      const productImgIds = await Promise.all(productImagePromises);
      productImgId = productImgIds; // Simpan ID ke dalam array
    }

    if (req.files['logoBank']) {
      const logoBankPromises = req.files['logoBank'].map(file => uploadFileWithValidation(file));
      const logoBankIds = await Promise.all(logoBankPromises);
      logoBankId = logoBankIds; // Simpan ID ke dalam array
    }

    if (req.files['service2image']) {
      const file = req.files['service2image'][0]; // Ambil file pertama
      service2ImageId = await uploadFileWithValidation(file);
    }

    // Memastikan data produk diubah menjadi objek
    const products = data.product || []; // Ambil data produk dari body
    const productData = products.map((product, index) => ({
      title: product.title,
      description: product.description,
      price: parseFloat(product.price), // Konversi string ke number
      variants: product.variants ? product.variants.map(v => ({
        name: parseFloat(v.name),
        satuan: parseFloat(v.satuan),
        price: parseFloat(v.price),
        stock: parseFloat(v.stock)
      })) : [],
      image: productImgId[index] // Ambil ID gambar produk
    }));
    const websiteData = {
      website: {
        colorWeb: data.colorWeb,
        name: data.name,
        imageLogo: imageLogoId,
        imageHeader: imageHeaderId,
        descriptionCta: data.descriptionCta,
        main: {
          service1: {
            label: data.service1Label ?? '',
            title: data.service1Title ?? '',
            description: data.service1Description ?? ''
          },
          service2: {
            label: data.service2Label ?? '',
            title: data.service2Title ?? '',
            description: data.service2Description ?? '',
            image: service2ImageId
          },
          products: productData
        },
        testimoni: data.testimoni.map(testi => ({
          name: testi.label ?? '',
          description: testi.description ?? ''
        })),
        methodPengiriman: data.methodPengiriman.map(method => ({
          name: method.name ?? '',
        })),
        bankTransfer: logoBankId.map((id, index) => ({
          type: data.bankTransfer[index]?.type ?? '',
          noRekening: data.bankTransfer[index]?.noRekening ?? '',
          logo: id
        })),
        processPembelian: data.processPembelian.map(process => ({
          label: process.label ?? '',
          description: process.description ?? ''
        })),
        about: data.about ?? '',
        footer: {
          coppyRight: data.coppyRight ?? '',
          contact: {
            whatsapp: data.whatsapp ?? '',
            facebook: data.facebook ?? '',
            instagram: data.instagram ?? '',
            yutube: data.yutube ?? '',
            email: data.email ?? ''
          }
        },
        address: data.address ?? '',
        pesanWa: data.pesanWa ?? '',
        location: data.location ?? '',
        seoMeta: {
          meta_title: data.metaTitle ?? '', 
          meta_description: data.metaDescription ?? '',
          meta_keywords: data.metaKeywords.map(keyword => keyword?? '' ) ,
          meta_url: data.metaUrl ?? ''
        },
        verivikasi_google_serch : data.googelConsoleSerch ?? ''
      }
    };

    await redis.set('website_data', websiteData);

    res.json({ message: 'Data berhasil disimpan ke Redis' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error menyimpan data ke Redis', error: error.message });
  }
});


router.post('/editweb',authUser, upload.fields([
  { name: 'imageLogo', maxCount: 1 },
  { name: 'imageHeader', maxCount: 1 },
  { name: 'logoBank', maxCount: 5 },
  { name: 'service2image', maxCount: 1 }
]), async (req, res) => {
  try {
    const datareq = req.body; // Data dari form
    const dt = JSON.stringify(datareq)
    const data = JSON.parse(dt)
    let imageLogoId = '';
    let imageHeaderId = '';
    let service2ImageId = '';
    // let logoBankId = [];
    const web = await redis.get('website_data');
    const website = web.website;


    


    // Proses setiap file yang di-upload
    const uploadFileWithValidation = async (file) => {
      if (!file || !file.buffer || file.buffer.length === 0) {
        throw new Error('File buffer is empty or invalid');
      }
      return await uploadFile(auth, file.buffer, file.originalname);
    };

    if (req.files['imageLogo']) {
      const oldImageId = website.imageLogo;
      if (oldImageId) {
        await deleteFile(auth, oldImageId);
      }
      const file = req.files['imageLogo'][0]; // Ambil file pertama
      imageLogoId = await uploadFileWithValidation(file);
    }

    if (req.files['imageHeader']) {
      const oldImageId = website.imageHeader;
      if (oldImageId) {
        await deleteFile(auth, oldImageId);
      }
      const file = req.files['imageHeader'][0]; // Ambil file pertama
      imageHeaderId = await uploadFileWithValidation(file);
    }

    if (req.files['service2image']) {
      const oldImageId = website.main.service2.image;
      if (oldImageId) {
        await deleteFile(auth, oldImageId);
      }
      const file = req.files['service2image'][0]; // Ambil file pertama
      service2ImageId = await uploadFileWithValidation(file);
    }

  

    const websiteData = {
      website: {
        colorWeb: data.colorWeb || website.colorWeb,
        name: data.name || website.name,
        imageLogo: imageLogoId || website.imageLogo,
        imageHeader: imageHeaderId || website.imageHeader,
        descriptionCta: data.descriptionCta || website.descriptionCta,
        main: {
          service1: {
            label: data.service1Label || website.main.service1.label,
            title: data.service1Title || website.main.service1.title,
            description: data.service1Description || website.main.service1.description
          },
          service2: {
            label: data.service2Label || website.main.service2.label,
            title: data.service2Title || website.main.service2.title,
            description: data.service2Description || website.main.service2.description,
            image: service2ImageId || website.main.service2.image
          },
        products: website.main.products
        },
        testimoni: data.testimoni.map((testi, index) => ({
          name: testi.name || website.testimoni[index].name,
          description: testi.description || website.testimoni[index].description
        })),
        methodPengiriman: data.methodPengiriman.map((method, index) => ({
          name: method.name || website.methodPengiriman[index].name,
          })),
        bankTransfer : website.bankTransfer,
        processPembelian: data.processPembelian.map((process, index) => ({
          label: process.label || website.processPembelian[index].label,
          description: process.description || website.processPembelian[index].description
        })),
        about: data.about || website.about,
        footer: {
          coppyRight: data.coppyRight || website.footer.coppyRight,
          contact: {
            whatsapp: data.whatsapp || website.footer.contact.whatsapp,
            facebook: data.facebook || website.footer.contact.facebook,
            instagram: data.instagram || website.footer.contact.instagram,
            yutube: data.yutube || website.footer.contact.yutube,
            email: data.email || website.footer.contact.email
          }
        },
        address: data.address || website.address,
        pesanWa: data.pesanWa || website.pesanWa,
        location: (data.location && !data.location.includes('\\"')) ? data.location.replace(/"/g, '\\"') : website.location,
        seoMeta: {
          meta_title: data.metaTitle || website.seoMeta.meta_title,
          meta_description: data.metaDescription || website.seoMeta.meta_description,
          meta_keywords: data.metaKeywords ? data.metaKeywords.map((keyword, index) => keyword || website.seoMeta.meta_keywords[index] ) : [],
          meta_url: data.metaUrl || website.seoMeta.meta_url
        },
        verifikasi_google_search: data.googelConsoleSerch || website.verifikasi_google_serch
      }
    };
    await redis.set('website_data', websiteData);

    res.json({ message: 'Data berhasil disimpan ke Redis' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error menyimpan data ke Redis', error: error.message });
  }
});

/* ADD new products */
router.post('/addProduct', authUser,upload.fields([
  { name: 'productImage', maxCount: 20 } // Mengizinkan upload banyak gambar produk
]), async (req, res) => {
  try {
    const data = req.body; // Data dari form
   

    // Validasi data dari body
    if (!data || Object.keys(data).length === 0) {
      return res.status(400).json({ message: 'Data tidak ada' });
    }

    // Ambil data produk dari Redis
    const websiteData = await redis.get('website_data');
    const parsedWebsiteData = websiteData;

    // Memastikan data produk diubah menjadi objek
    const products = parsedWebsiteData.website.main.products || [];

    // Validasi file yang di-upload
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ message: 'File tidak ada yang di-upload' });
    }

    // Proses setiap file yang di-upload
    const uploadFileWithValidation = async (file) => {
      if (!file || !file.buffer || file.buffer.length === 0) {
        throw new Error('File buffer is empty or invalid');
      }
      return await uploadFile(auth, file.buffer, file.originalname);
    };

    // Menyimpan ID gambar produk
    let productImgIds = [];
    if (req.files['productImage']) {
      const productImagePromises = req.files['productImage'].map(file => uploadFileWithValidation(file));
      productImgIds = await Promise.all(productImagePromises);
    }

    // Menambahkan produk baru
    const newProducts = data.product || []; // Ambil data produk dari body
    newProducts.forEach((product, index) => {
      const newProduct = {
        title: product.title,
        description: product.description,
        price: parseFloat(product.price),
        variants: product.variants ? product.variants.map(v => ({
          name: parseFloat(v.name),
          satuan: v.satuan,
          price: parseFloat(v.price),
          stock: parseFloat(v.stock)
        })) : [],
        image: productImgIds[index] // Ambil ID gambar produk
      };
      products.push(newProduct); // Tambahkan produk baru ke dalam array produk
    });

    // Update data website dengan produk baru
    parsedWebsiteData.website.main.products = products;

    // Simpan kembali data yang sudah diperbarui ke Redis
    await redis.set('website_data', parsedWebsiteData);

    res.json({ message: 'Produk berhasil ditambahkan', products: newProducts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error menambahkan produk', error: error.message });
  }
});

/* Edit Product lannding page */
router.post('/editProduct/:productId',authUser, upload.fields([
  { name: 'productImage', maxCount: 20 }
]), async (req, res) => {
  try {
    const { productId } = req.params;
    const dt = req.body;
    
    
    const dataParse = JSON.stringify(dt)
   
    const data = JSON.parse(dataParse)

    if (!data || Object.keys(data).length === 0) {
      return res.status(400).json({ message: 'Data tidak ada' });
    }

    const websiteData = await redis.get('website_data');
    const parsedWebsiteData = websiteData;
    const products = parsedWebsiteData.website.main.products || [];
    const productIndex = products.findIndex(product => product.image === productId);

    if (productIndex === -1) {
      return res.status(404).json({ message: 'Produk tidak ditemukan' });
    }

    let productImgIds = [];
    if (req.files && req.files['productImage']) {
      // Hapus gambar lama dari Google Drive jika ada
      const oldImageId = products[productIndex].image;
      if (oldImageId) {
        await deleteFile(auth,oldImageId); // Fungsi untuk menghapus file dari Google Drive
      }

      const uploadFileWithValidation = async (file) => {
        if (!file || !file.buffer || file.buffer.length === 0) {
          throw new Error('File buffer is empty or invalid');
        }
        return await uploadFile(auth, file.buffer, file.originalname);
      };

      productImgIds = await Promise.all(req.files['productImage'].map(file => uploadFileWithValidation(file)));
    }

    const updatedProduct = {
      ...products[productIndex],
      title: data.title || products[productIndex].title,
      description: data.description || products[productIndex].description,
      price: parseFloat(data.price) || products[productIndex].price,
      variants: data.product[0].variants ? data.product[0].variants.map(v => ({
        name: parseFloat(v.name),
        satuan: v.satuan,
        price: parseFloat(v.price),
        stock: parseFloat(v.stock),
      })) : products[productIndex].variants,
      image: productImgIds.length > 0 ? productImgIds[0] : products[productIndex].image
    };

    products[productIndex] = updatedProduct;
    parsedWebsiteData.website.main.products = products;

    await redis.set('website_data', parsedWebsiteData);

    res.json({ message: 'Produk berhasil diperbarui', product: updatedProduct });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error memperbarui produk', error: error.message });
  }
});
/* ADD new Bank */
router.post('/addBank', authUser,upload.fields([
  { name: 'bankLogo', maxCount: 20 } // Mengizinkan upload banyak gambar produk
]), async (req, res) => {
  try {
    const data = req.body; // Data dari form
   

    // Validasi data dari body
    if (!data || Object.keys(data).length === 0) {
      return res.status(400).json({ message: 'Data tidak ada' });
    }

    // Ambil data produk dari Redis
    const websiteData = await redis.get('website_data');
    const parsedWebsiteData = websiteData;

    // Memastikan data produk diubah menjadi objek
    const banks = parsedWebsiteData.website.bankTransfer || [];

    // Validasi file yang di-upload
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ message: 'File tidak ada yang di-upload' });
    }

    // Proses setiap file yang di-upload
    const uploadFileWithValidation = async (file) => {
      if (!file || !file.buffer || file.buffer.length === 0) {
        throw new Error('File buffer is empty or invalid');
      }
      return await uploadFile(auth, file.buffer, file.originalname);
    };

    // Menyimpan ID gambar produk
    let bankLogoIds = [];
    if (req.files['bankLogo']) {
      const bankImagePrommiss = req.files['bankLogo'].map(file => uploadFileWithValidation(file));
      bankLogoIds = await Promise.all(bankImagePrommiss);
    }

    // Menambahkan produk baru
    const bank = data.bankTransfer || []; // Ambil data produk dari body
    bank.forEach((bank, index) => {
      const newbank = {
        type: bank.type,
        noRekening: bank.noRekening,
        logo: bankLogoIds[index] // Ambil ID gambar produk
      };
      banks.push(newbank); // Tambahkan produk baru ke dalam array produk
    });

    // Update data website dengan produk baru
    parsedWebsiteData.website.bankTransfer = banks;

    // Simpan kembali data yang sudah diperbarui ke Redis
    await redis.set('website_data', parsedWebsiteData);

    res.json({ message: 'Bank berhasil ditambahkan' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error menambahkan Bank', error: error.message });
  }
});
/* Edit Bank Transfer lannding page */
router.post('/editBank/:bankId',authUser, upload.fields([
  { name: 'bankLogo', maxCount: 5 }
]), async (req, res) => {
  try {
    const { bankId } = req.params;
    const dt = req.body;
    
    
    const dataParse = JSON.stringify(dt)
   
    const data = JSON.parse(dataParse)

    if (!data || Object.keys(data).length === 0) {
      return res.status(400).json({ message: 'Data tidak ada' });
    }

    const parsedWebsiteData = await redis.get('website_data');
    const bankLogo = parsedWebsiteData.website.bankTransfer || [];
    const logoIndex = bankLogo.findIndex(img => img.logo === bankId);

    if (logoIndex === -1) {
      return res.status(404).json({ message: 'Produk tidak ditemukan' });
    }

    let logoIds = [];  
    if (req.files && req.files['bankLogo']) {
      // Hapus gambar lama dari Google Drive jika ada
      const oldImageId = bankLogo[logoIndex].logo;
      if (oldImageId) {
        await deleteFile(auth,oldImageId); // Fungsi untuk menghapus file dari Google Drive
      }

      const uploadFileWithValidation = async (file) => {
        if (!file || !file.buffer || file.buffer.length === 0) {
          throw new Error('File buffer is empty or invalid');
        }
        return await uploadFile(auth, file.buffer, file.originalname);
      };

      logoIds = await Promise.all(req.files['bankLogo'].map(file => uploadFileWithValidation(file)));
    }

    const updatebank = {
      ...bankLogo[logoIndex],
      type: data.type || bankLogo[logoIndex].type,
      noRekening: data.noRekening || bankLogo[logoIndex].noRekening,
      logo : logoIds.length > 0 ? logoIds[0] : bankLogo[logoIndex].logo
    };

    bankLogo[logoIndex] = updatebank;
    parsedWebsiteData.website.bankTransfer = bankLogo;

    await redis.set('website_data', parsedWebsiteData);

    res.json({ message: 'bank berhasil diperbarui' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error memperbarui bank', error: error.message });
  }
});



router.get('/dashboard',authUser, async (req, res, next) => {
  try {
    const websiteData = await redis.get('website_data');
  
    res.render('createweb', {message : 'successfuly get data',websiteData});
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error mengambil data dari Redis' });
  }
});


router.get('/', async (req, res) => {
  try {
    const data = await redis.get('website_data');
    
    // Pastikan data tidak null dan parse jika perlu
    if (!data) {
      return res.status(404).render('index', { message: 'Data tidak ditemukan' });
    }
    const web = data; // Jika data adalah string JSON
    console.log(web)
    const loc = data.website.location.replace(/\\\"/g, '"').replace(/\\\\/g, '\\');

// Jika Anda ingin menyimpan hasilnya ke dalam variabel location
const location = loc;
    res.render('index', { message: 'Successfully retrieved data', web: web.website ,location });
  } catch (error) {
    console.error(error);
    res.status(500).render('index', { message: 'Error mengambil data dari Redis' });
  }
});

router.delete('/delete-product/:productId', authUser,async (req, res) => {
  try {
    const { productId } = req.params; // Ambil URL produk dari parameter
    const existingData = await redis.get('website_data'); // Ambil data yang sudah ada

    if (!existingData) {
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }

    const websiteData = existingData; // Parsing data yang ada

    // Temukan index produk berdasarkan URL
    const productIndex = websiteData.website.main.products.findIndex(product => product.image === productId);

    if (productIndex === -1) {
      return res.status(404).json({ message: 'Produk tidak ditemukan' });
    }
    if (productId) {
      await deleteFile(auth,productId); // Fungsi untuk menghapus file dari Google Drive
    }
    // Hapus produk dari array
    websiteData.website.main.products.splice(productIndex, 1);

    // Simpan data yang telah diperbarui ke Redis
    await redis.set('website_data', websiteData);

    res.json({ message: 'Produk berhasil dihapus dari Redis' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error menghapus produk dari Redis' });
  }
});

router.delete('/delete-bank/:bankId', authUser,async (req, res) => {
  try {
    const { bankId } = req.params; // Ambil URL produk dari parameter
    const existingData = await redis.get('website_data'); // Ambil data yang sudah ada

    if (!existingData) {
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }

    const websiteData = existingData; // Parsing data yang ada

    // Temukan index produk berdasarkan URL
    const bankIndex = websiteData.website.bankTransfer.findIndex(bank => bank.logo === bankId);

    if (bankIndex === -1) {
      return res.status(404).json({ message: 'Produk tidak ditemukan' });
    }
    if (bankId) {
      await deleteFile(auth,bankId); // Fungsi untuk menghapus file dari Google Drive
    }
    // Hapus produk dari array
    websiteData.website.bankTransfer.splice(bankIndex, 1);

    // Simpan data yang telah diperbarui ke Redis
    await redis.set('website_data', websiteData);

    res.json({ message: 'Bank berhasil dihapus dari Redis' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error menghapus bank dari Redis' });
  }
});



module.exports = router;