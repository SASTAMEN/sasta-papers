exports.uploadFile = (req, res) => {
    res.json({ filePath: req.file.path, message: 'File uploaded successfully' });
  };
  