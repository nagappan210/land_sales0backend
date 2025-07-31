const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const db = require('../db');

ffmpeg.setFfmpegPath('C:/ffmpeg/bin/ffmpeg.exe');

exports.createPostStep6 = async (req, res) => {
  try {
    const { user_id, post_type } = req.body;
    const files = req.files;

    if (!files || (!files.video && !files.images)) {
      return res.status(400).json({ success: false, message: 'No valid media files uploaded.' });
    }

    if (post_type === '1' && files.video && files.video.length > 0) {
      const videoPath = files.video[0].path;

      await db.query(
        'UPDATE user_posts SET video = ?, post_type = ?, image_ids = NULL WHERE U_ID = ?',
        [videoPath, post_type, user_id]
      );

      return res.json({
        success: true,
        message: 'Video uploaded successfully.',
        video: videoPath
      });
    }

    if (post_type === '2' && files.images && files.images.length > 0) {
      const imageFiles = files.images;
      const tempDir = `uploaded/posts/${Date.now()}_sequence`;
      await fs.mkdir(tempDir, { recursive: true });

      const resizedPaths = [];
      const insertedImageIds = [];

      // Step 1: Resize and save images
      for (let i = 0; i < imageFiles.length; i++) {
        const destPath = path.join(tempDir, `img_${String(i).padStart(3, '0')}.jpg`);

        await sharp(imageFiles[i].path)
          .resize({ width: 1280, height: 720, fit: 'contain', background: '#000' })
          .jpeg()
          .toFile(destPath);

        resizedPaths.push(destPath);

        // Save original uploaded image path to post_images table
        const [result] = await db.query(
          'INSERT INTO post_images (U_ID, image_path) VALUES (?, ?)',
          [user_id, imageFiles[i].path]
        );
        insertedImageIds.push(result.insertId);
      }

      // Step 2: Convert images into video
      const outputVideoPath = `uploaded/posts/post_${Date.now()}.mp4`;

      ffmpeg()
        .input(path.join(tempDir, 'img_%03d.jpg'))
        .inputOptions(['-framerate 0.4'])
        .outputOptions([
          '-c:v libx264',
          '-r 30',
          '-pix_fmt yuv420p'
        ])
        .on('end', async () => {
          const imageIdsStr = insertedImageIds.join(',');

          await db.query(
            'UPDATE user_posts SET video = ?, image_ids = ?, post_type = ? WHERE U_ID = ?',
            [outputVideoPath, imageIdsStr, post_type, user_id]
          );

          return res.json({
            success: true,
            message: 'Images converted to video and saved.',
            video: outputVideoPath,
            image_ids: insertedImageIds
          });
        })
        .on('error', error => {
          console.error('FFmpeg error:', error.message);
          return res.status(500).json({
            success: false,
            message: 'FFmpeg conversion failed.',
            error: error.message
          });
        })
        .save(outputVideoPath);
    } else {
      return res.status(400).json({ success: false, message: 'Invalid post_type or files.' });
    }

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};
