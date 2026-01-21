const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cors = require('cors');

const app = express();
const PORT = 3001;

// --------------------------------------------------------
// 0. CONFIGURACIÓN INICIAL
// --------------------------------------------------------
app.use(cors());

const imagesDir = path.join(__dirname, 'images');
if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir);
    console.log('📁 Carpeta "images" creada automáticamente');
}

// --------------------------------------------------------
// 1. CONFIGURACIÓN DE MULTER (MODIFICADO)
// --------------------------------------------------------
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, imagesDir);
    },
    filename: (req, file, cb) => {
        // 1. Obtenemos la extensión del archivo original (.pdf, .jpg, etc.)
        const ext = path.extname(file.originalname);

        // 2. Buscamos si viene un nombre personalizado en el cuerpo de la petición
        // NOTA: En el frontend, debes hacer append del nombre ANTES que del archivo
        let customName = req.body.fullname;

        if (customName && customName.trim() !== "") {
            // 3. CASO: SI HAY NOMBRE PERSONALIZADO
            // Limpiamos el nombre para evitar errores en Windows/Linux (quitamos caracteres raros)
            const cleanName = customName
                .trim()
                .replace(/\s+/g, '_')        // Espacios -> guiones bajos
                .replace(/[^a-zA-Z0-9_-]/g, ''); // Solo letras, números, _ y -

            // Guardamos con el nombre limpio + la extensión original
            cb(null, `${cleanName}${ext}`);
        } else {
            // 4. CASO: NO HAY NOMBRE (Aleatorio)
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, uniqueSuffix + '-' + file.originalname);
        }
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        // Validar extensiones (incluyendo PDF)
        const filetypes = /jpeg|jpg|png|gif|webp|pdf/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error("Error: Solo se permiten imágenes y PDF"));
    }
});

// --------------------------------------------------------
// 2. RUTAS Y ENDPOINTS
// --------------------------------------------------------

app.use('/imagenes', express.static(imagesDir));

app.post('/api/subir', upload.single('foto'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se subió ningún archivo.' });
    }

    res.json({
        mensaje: 'Archivo guardado con éxito',
        archivo: req.file.filename,
        // Usamos req.body.fullname para confirmar si se usó el nombre personalizado o no
        nombre_usado: req.file.filename,
        url: `${req.protocol}://${req.get('host')}/imagenes/${req.file.filename}`
    });
});

app.get('/api/imagenes', (req, res) => {
    fs.readdir(imagesDir, (err, files) => {
        if (err) return res.status(500).json({ error: 'Error al leer la carpeta' });

        const response = files
            .filter(file => /\.(jpg|jpeg|png|gif|webp|pdf)$/i.test(file))
            .map(file => ({
                nombre: file,
                url: `${req.protocol}://${req.get('host')}/imagenes/${file}`
            }));

        res.json(response);
    });
});

app.get('/api/imagenes/:nombre', (req, res) => {
    const nombreImagen = req.params.nombre;
    const rutaCompleta = path.join(imagesDir, nombreImagen);

    fs.access(rutaCompleta, fs.constants.F_OK, (err) => {
        if (err) {
            return res.status(404).json({ error: 'El archivo no existe' });
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
    console.log(`✅ Servidor listo en puerto ${PORT}`);
});