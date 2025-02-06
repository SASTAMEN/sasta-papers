const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

port=process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection failed:', err));

app.use('/api/auth', authRoutes);
app.use('/api/files', uploadRoutes);

app.listen(5000, () => console.log('Server running on port 5000'));
