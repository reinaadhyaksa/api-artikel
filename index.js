const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const dataPath = path.join(__dirname, 'data.json');

const initializeDataFile = () => {
    try {
        if (!fs.existsSync(dataPath)) {
            fs.writeFileSync(dataPath, JSON.stringify([], null, 2));
            console.log('File data.json created with empty array');
        } else {
            const data = fs.readFileSync(dataPath, 'utf8');
            if (!data.trim()) {
                fs.writeFileSync(dataPath, JSON.stringify([], null, 2));
                console.log('File data.json initialized with empty array');
            } else {
                const parsed = JSON.parse(data);
                if (!Array.isArray(parsed)) {
                    console.log('File data.json is not an array, converting to array');
                    fs.writeFileSync(dataPath, JSON.stringify([parsed], null, 2));
                }
            }
        }
    } catch (error) {
        console.error('Error initializing data file:', error);
        fs.writeFileSync(dataPath, JSON.stringify([], null, 2));
        console.log('File data.json recreated due to corruption');
    }
};

initializeDataFile();

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server berjalan di port ${PORT}`);
});

const readData = () => {
    try {
        const data = fs.readFileSync(dataPath, 'utf8');
        console.log('Raw data from file:', data.substring(0, 100) + '...');

        const parsedData = JSON.parse(data);

        if (Array.isArray(parsedData)) {
            console.log('Returning array with', parsedData.length, 'items');
            return parsedData;
        } else if (parsedData && typeof parsedData === 'object') {
            console.log('Converting object to array');
            return [parsedData];
        } else {
            console.log('Returning empty array');
            return [];
        }
    } catch (error) {
        console.error('Error reading data file:', error);
        return [];
    }
};

const writeData = (data) => {
    try {
        console.log('Writing data to file:', JSON.stringify(data).substring(0, 100) + '...');

        const dataToWrite = Array.isArray(data) ? data : [data];
        fs.writeFileSync(dataPath, JSON.stringify(dataToWrite, null, 2), 'utf8');
        console.log('Data written successfully');
        return true;
    } catch (error) {
        console.error('Error writing data file:', error);
        return false;
    }
};

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

app.get('/article', (req, res) => {
    try {
        const articles = readData();
        console.log('GET /article returning', articles.length, 'articles');
        res.json(articles);
    } catch (error) {
        console.error('Error in GET /article:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

app.get('/article/:id', (req, res) => {
    try {
        const articles = readData();
        console.log('GET /article/:id looking for', req.params.id);
        const content = articles.find(m => m.id === req.params.id);

        if (content) {
            console.log('Article found');
            res.json(content);
        } else {
            console.log('Article not found');
            res.status(404).json({ message: 'Article not found' });
        }
    } catch (error) {
        console.error('Error in GET /article/:id:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

app.post('/article', (req, res) => {
    try {
        console.log('POST /article with body:', JSON.stringify(req.body));

        const articles = readData();
        const newArticle = req.body;

        if (!newArticle.id || !newArticle.title) {
            console.log('Validation failed: ID or title missing');
            return res.status(400).json({ message: 'ID and title are required' });
        }

        if (articles.some(article => article.id === newArticle.id)) {
            console.log('Article with ID already exists:', newArticle.id);
            return res.status(409).json({ message: 'Article with this ID already exists' });
        }

        articles.push(newArticle);
        const writeSuccess = writeData(articles);

        if (!writeSuccess) {
            console.log('Failed to write data');
            return res.status(500).json({ message: 'Failed to save article' });
        }

        console.log('Article saved successfully');
        res.status(201).json(newArticle);
    } catch (error) {
        console.error('Error in POST /article:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

app.put('/article/:id', (req, res) => {
    try {
        console.log('PUT /article/:id with body:', JSON.stringify(req.body));

        const articles = readData();
        const index = articles.findIndex(m => m.id === req.params.id);

        if (index === -1) {
            console.log('Article not found for update:', req.params.id);
            return res.status(404).json({ message: 'Article not found' });
        }

        articles[index] = { ...articles[index], ...req.body };
        const writeSuccess = writeData(articles);

        if (!writeSuccess) {
            console.log('Failed to write data during update');
            return res.status(500).json({ message: 'Failed to update article' });
        }

        console.log('Article updated successfully');
        res.json(articles[index]);
    } catch (error) {
        console.error('Error in PUT /article/:id:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

app.delete('/article/:id', (req, res) => {
    try {
        console.log('DELETE /article/:id', req.params.id);

        const articles = readData();
        const filteredArticles = articles.filter(m => m.id !== req.params.id);

        if (articles.length === filteredArticles.length) {
            console.log('Article not found for deletion:', req.params.id);
            return res.status(404).json({ message: 'Article not found' });
        }

        const writeSuccess = writeData(filteredArticles);

        if (!writeSuccess) {
            console.log('Failed to write data during deletion');
            return res.status(500).json({ message: 'Failed to delete article' });
        }

        console.log('Article deleted successfully');
        res.json({ message: 'Article deleted successfully' });
    } catch (error) {
        console.error('Error in DELETE /article/:id:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
});