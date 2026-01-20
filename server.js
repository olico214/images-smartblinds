const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cors = require('cors');

const app = express();
const PORT = 3001; // Puerto configurado para tu frontend

// --------------------------------------------------------
// 0. CONFIGURACIÓN INICIAL
// --------------------------------------------------------

// Habilitar CORS para recibir peticiones desde tu Next.js/React
app.use(cors());

// Asegurar que la carpeta 'images' exista físicamente
const imagesDir = path.join(__dirname, 'images');
if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir);
    console.log('📁 Carpeta "images" creada automáticamente');
}

// --------------------------------------------------------
// 1. CONFIGURACIÓN DE MULTER (SUBIDA DE ARCHIVOS)
// --------------------------------------------------------
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, imagesDir); // Usamos la ruta absoluta definida arriba
    },
    filename: (req, file, cb) => {
        // Generar nombre único: Timestamp + Random + NombreOriginal
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        // Validar extensiones de imagen
        const filetypes = /jpeg|jpg|png|gif|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error("Error: Solo se permiten imágenes (jpg, png, gif, webp)"));
    }
});

// --------------------------------------------------------
// 2. RUTAS Y ENDPOINTS
// --------------------------------------------------------

// A) Servir carpeta estática (Para ver las fotos en el navegador)
app.use('/imagenes', express.static(imagesDir));


// B) ENDPOINT POST: Subir imagen
app.post('/api/subir', upload.single('foto'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se subió ningún archivo.' });
    }

    res.json({
        mensaje: 'Imagen guardada con éxito',
        archivo: req.file.filename,
        // Generamos la URL pública completa
        url: `${req.protocol}://${req.get('host')}/imagenes/${req.file.filename}`
    });
});


// C) ENDPOINT GET: Listar todas las imágenes
app.get('/api/imagenes', (req, res) => {
    fs.readdir(imagesDir, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Error al leer la carpeta' });
        }

        // Filtramos para mostrar solo imágenes y construimos la URL
        const response = files
            .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
            .map(file => ({
                nombre: file,
                url: `${req.protocol}://${req.get('host')}/imagenes/${file}`
            }));

        res.json(response);
    });
});


// D) ENDPOINT GET: Detalles de 1 sola imagen
app.get('/api/imagenes/:nombre', (req, res) => {
    const nombreImagen = req.params.nombre;
    const rutaCompleta = path.join(imagesDir, nombreImagen);

    // Verificar si existe
    fs.access(rutaCompleta, fs.constants.F_OK, (err) => {
        if (err) {
            return res.status(404).json({ error: 'La imagen no existe' });
        }

        res.json({
            nombre: nombreImagen,
            url: `${req.protocol}://${req.get('host')}/imagenes/${nombreImagen}`,
            path_local: rutaCompleta
        });
    });
});

// --------------------------------------------------------
// 3. INICIAR SERVIDOR
// --------------------------------------------------------
app.listen(PORT, () => {
    console.log(`--------------------------------------------------`);
    console.log(`✅ Servidor de Imágenes listo en el puerto ${PORT}`);
    console.log(`   ➜ Subir:   http://localhost:${PORT}/api/subir`);
    console.log(`   ➜ Listar:  http://localhost:${PORT}/api/imagenes`);
    console.log(`   ➜ Carpeta: ${imagesDir}`);
    console.log(`--------------------------------------------------`);
});