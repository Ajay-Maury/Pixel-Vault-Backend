require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString()
  });
});
app.use('/api/user', require('./routes/user'));
app.use('/api/image', require('./routes/image'));

app.get('/health', (_, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
