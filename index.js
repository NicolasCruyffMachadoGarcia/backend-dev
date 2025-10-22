// backend/index.js
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { readDB, writeDB } = require('./data/database');

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());


app.get('/api/characters', async (req, res, next) => { // Añadimos 'next'
    try {
        const { page = 1, name = '' } = req.query;


        const apiUrl = `https://rickandmortyapi.com/api/character/?page=${page}&name=${name}`;
        const response = await fetch(apiUrl);
        if (!response.ok) return res.json({ info: {}, results: [] });
        const data = await response.json();
        const db = await readDB();
        const charactersDb = db.characters || {};
        const combined = data.results.map(char => charactersDb[char.id] || char);
        const final = combined.filter(char => !char.isDeleted);
        res.json({ ...data, results: final });
    } catch (error) {
        console.error("Error en GET /api/characters:", error);
        res.status(500).json({ message: 'Error al obtener los personajes' });
    }
});

app.get('/api/characters/:ids', async (req, res, next) => { // Añadimos 'next'
    if (!req.params.ids.includes(',') && !isNaN(req.params.ids)) {
        return next();
    }
    try {
        const { ids } = req.params;
        const db = await readDB();
        const charactersDb = db.characters || {};

        const response = await fetch(`https://rickandmortyapi.com/api/character/${ids}`);
        if (!response.ok) {
           return res.json([]);
        }

        let charactersFromApi = await response.json();
        if (!Array.isArray(charactersFromApi)) {
            charactersFromApi = [charactersFromApi];
        }

        const combined = charactersFromApi.map(char => charactersDb[char.id] || char);
        const final = combined.filter(char => !char.isDeleted);
        res.json(final);

    } catch (error) {
        console.error(`Error en GET /api/characters/[${req.params.ids}]:`, error);
        res.status(500).json({ message: 'Error al obtener los personajes por IDs' });
    }
});


app.get('/api/characters/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (isNaN(id)) {
             return res.status(400).json({ message: 'ID de personaje inválido.' });
        }
        const db = await readDB();
        const charactersDb = db.characters || {};
        if (charactersDb[id] && !charactersDb[id].isDeleted) {
            return res.json(charactersDb[id]);
        }
        const response = await fetch(`https://rickandmortyapi.com/api/character/${id}`);
        if (!response.ok) return res.status(404).json({ message: 'Personaje no encontrado' });
        const character = await response.json();
        res.json(character);
    } catch (error) {
        console.error(`Error en GET /api/characters/${req.params.id}:`, error);
        res.status(500).json({ message: 'Error al obtener el personaje' });
    }
});


// OBTENER TODOS los posts
app.get('/api/posts', async (req, res) => {
    try {
        const db = await readDB();
        const posts = db.posts || {};
        res.json(Object.values(posts).filter(p => !p.isDeleted));
    } catch (error) {
        console.error("Error en GET /api/posts:", error);
        res.status(500).json({ message: 'Error al obtener los posts' });
    }
});

// OBTENER UN POST por ID
app.get('/api/posts/:id', async (req, res) => {
    try {
        const db = await readDB();
        const { id } = req.params;
        const post = db.posts ? db.posts[id] : null;

        if (post && !post.isDeleted) {
            res.json(post);
        } else {
            res.status(404).json({ message: 'Post no encontrado' });
        }
    } catch (error) {
        console.error(`Error en GET /api/posts/${req.params.id}:`, error);
        res.status(500).json({ message: 'Error al obtener el post' });
    }
});

// CREAR un nuevo post (Versión Robusta)
app.post('/api/posts', async (req, res) => {
    try {
        const newPostData = req.body;
        if (!newPostData || typeof newPostData !== 'object' || !newPostData.title) {
            return res.status(400).json({ message: 'Datos del post inválidos o incompletos.' });
        }

        const db = await readDB();
        if (!db.posts) {
            db.posts = {};
            console.log("Sección 'posts' no existía, creada.");
        }

        const newId = Date.now();
        const completeNewPost = {
            ...newPostData,
            id: newId,
            isDeleted: false
        };

        db.posts[newId] = completeNewPost;
        await writeDB(db);

        console.log('Post nuevo guardado:', completeNewPost);
        res.status(201).json(completeNewPost);

    } catch (error) {
        console.error("Error en POST /api/posts:", error);
        res.status(500).json({ message: 'Error interno al crear el post.' });
    }
});

// ACTUALIZAR un post
app.put('/api/posts/:id', async (req, res) => {
    try {
        const db = await readDB();
        const { id } = req.params;
        const updatedData = req.body;
         if (!updatedData || typeof updatedData !== 'object') {
            return res.status(400).json({ message: 'Datos de actualización inválidos.' });
        }

        if (db.posts && db.posts[id] && !db.posts[id].isDeleted) {
             // Asegurarse de no sobreescribir el ID o el estado de borrado accidentalmente
            db.posts[id] = { ...db.posts[id], ...updatedData, id: db.posts[id].id, isDeleted: db.posts[id].isDeleted };
            await writeDB(db);
            console.log('Post actualizado:', db.posts[id]);
            res.json(db.posts[id]);
        } else {
            res.status(404).json({ message: 'Post no encontrado para actualizar' });
        }
    } catch (error) {
        console.error(`Error en PUT /api/posts/${req.params.id}:`, error);
        res.status(500).json({ message: 'Error al actualizar el post' });
    }
});

// ELIMINAR un post
app.delete('/api/posts/:id', async (req, res) => {
    try {
        const db = await readDB();
        const { id } = req.params;
        if (db.posts && db.posts[id]) {
            db.posts[id].isDeleted = true;
            await writeDB(db);
             console.log('Post marcado como eliminado:', id);
            res.status(204).send();
        } else {
            res.status(404).json({ message: 'Post no encontrado para eliminar' });
        }
    } catch (error) {
        console.error(`Error en DELETE /api/posts/${req.params.id}:`, error);
        res.status(500).json({ message: 'Error al eliminar el post' });
    }
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor activo en http://localhost:${PORT}`);
});