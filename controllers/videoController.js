const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const db = require('../db');

ffmpeg.setFfmpegPath('C:/ffmpeg/bin/ffmpeg.exe');

exports.createPostStep6 = async (req, res) => {
  try {
    const { user_id, user_post_id, post_type } = req.body;
    const files = req.files;

    if(!user_id || isNaN(user_id) || !user_post_id || isNaN(user_post_id)){
      return res.status(400).json({
        result : "0",
        error : "User_id and user_post_id is required and it must be an Integer",
        data : []
      })
    }

    const [exist_user] = await db.query (`select * from users where U_ID = ?`,[user_id]);
    if(exist_user.length === 0){
      return res.status(400).json({
        result : "0",
        error : "User does not existing in database",
        data : []
      })
    }

    if (!files || (!files.video && !files.images)) {
      return res.status(400).json({ success: false, message: 'No valid media files uploaded.' });
    }

    if (post_type === '1' && files.video && files.video.length > 0) {
      const videoPath = files.video[0].path;

      const [video] = await db.query(
        `UPDATE user_posts 
         SET video = ?, post_type = ?, image_ids = NULL, status = 'published', updated_at = NOW()
         WHERE U_ID = ? AND user_post_id = ?`,
        [videoPath, post_type, user_id, user_post_id]
      );
      if(video.affectedRows === 0){
        return res.status(400).json({
        result : "0",
        error : "User_id or user_post_id is not existing in database",
        data : []
      })
      }


      return res.json({
        success: true,
        message: 'Video uploaded successfully and post published.',
        video: videoPath
      });
    }

    if (post_type === '2' && files.images && files.images.length > 0) {
      const imageFiles = files.images;
      const tempDir = `uploaded/posts/${Date.now()}_sequence`;
      await fs.mkdir(tempDir, { recursive: true });

      const resizedPaths = [];
      const insertedImageIds = [];
      
      for (let i = 0; i < imageFiles.length; i++) {
        const destPath = path.join(tempDir, `img_${String(i).padStart(3, '0')}.jpg`);

        await sharp(imageFiles[i].path)
          .resize({ width: 1280, height: 720, fit: 'contain', background: '#000' })
          .jpeg()
          .toFile(destPath);

        resizedPaths.push(destPath);

        const [result] = await db.query(
          `INSERT INTO post_images (U_ID, user_post_id, image_path) VALUES (?, ?, ?)`,
          [user_id, user_post_id, imageFiles[i].path]
        );
        insertedImageIds.push(result.insertId);
      }

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

          const [image] = 
          await db.query(
            `UPDATE user_posts 
             SET video = ?, image_ids = ?, post_type = ?, status = 'published', updated_at = NOW()
             WHERE U_ID = ? AND user_post_id = ?`,
            [outputVideoPath, imageIdsStr, post_type, user_id, user_post_id]
          );
          if(image.affectedRows === 0){
        return res.status(400).json({
        result : "0",
        error : "User_id or user_post_id is not existing in database",
        data : []
      })
      }

          return res.json({
            result : "1",
            message: 'Images converted to video, post published.',
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
