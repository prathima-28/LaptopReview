const express = require('express');
const cors = require('cors');
const analyzeRoute = require('./routes/analyze');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use('/api/analyze', analyzeRoute);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
